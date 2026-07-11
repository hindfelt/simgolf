import { isPropertyId } from './properties';
import { H, W } from './constants';
import type { CourseTheme, PropertyId } from './types';

export type ResortId = string;
export type CourseSnapshot = Record<string, unknown> & { v: 1 | 2; propertyId: PropertyId; courseName: string; cash: number; rep: number; holes: unknown[]; theme: CourseTheme };

export interface ResortSummary {
  courseName: string;
  cash: number;
  rep: number;
  holes: number;
  theme: CourseTheme;
}

export interface ResortRecord {
  id: ResortId;
  propertyId: PropertyId;
  kind: 'career' | 'sandbox';
  updatedAt: number;
  summary: ResortSummary;
  snapshot: CourseSnapshot;
  /** Read-only listing hint; not relied on for persistence. */
  active?: boolean;
}

export interface PortfolioManifest {
  key: 'manifest';
  version: 1;
  activeResortId: ResortId;
  resortIds: ResortId[];
}

const DB_NAME = 'fairway-mogul-portfolio';
const DB_VERSION = 1;
const RESORTS = 'resorts';
const META = 'meta';
const THEMES: CourseTheme[] = ['parklands', 'links', 'desert', 'tropical'];

export const portfolioSupported = () => typeof indexedDB !== 'undefined';

export function isCourseSnapshot(value: unknown): value is CourseSnapshot {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Partial<CourseSnapshot>;
  return (snapshot.v === 1 || snapshot.v === 2) && isPropertyId(snapshot.propertyId) && typeof snapshot.courseName === 'string' &&
    Number.isFinite(snapshot.cash) && Number.isFinite(snapshot.rep) && Array.isArray(snapshot.holes) && THEMES.includes(snapshot.theme as CourseTheme) &&
    Array.isArray((snapshot as Record<string, unknown>).tiles) && ((snapshot as Record<string, unknown>).tiles as unknown[]).length === W * H;
}

export function resortSummary(snapshot: CourseSnapshot): ResortSummary {
  return {
    courseName: snapshot.courseName.trim().slice(0, 40) || 'Untitled resort',
    cash: Math.max(0, Math.trunc(snapshot.cash)),
    rep: Math.max(0, Math.min(5, snapshot.rep)),
    holes: snapshot.holes.length,
    theme: snapshot.theme,
  };
}

function resortId(): ResortId {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? `resort-${crypto.randomUUID()}`
    : `resort-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function recordFor(id: ResortId, snapshot: CourseSnapshot, kind: ResortRecord['kind']): ResortRecord {
  const savedAt = Number(snapshot.savedAt);
  return { id, propertyId: snapshot.propertyId, kind, updatedAt: Number.isFinite(savedAt) ? savedAt : Date.now(), summary: resortSummary(snapshot), snapshot };
}

/** Career expansion moves operating capital; it never clones the source bank. */
export function sourceAfterCapitalTransfer(snapshot: CourseSnapshot, destinationName: string): CourseSnapshot {
  const cash = Math.max(0, Math.trunc(snapshot.cash));
  const ledger = Array.isArray(snapshot.financeLedger) ? [...snapshot.financeLedger] : [];
  const maxId = ledger.reduce((best, raw) => {
    const id = raw && typeof raw === 'object' ? Number((raw as { id?: unknown }).id) : 0;
    return Math.max(best, Number.isFinite(id) ? id : 0);
  }, 0);
  if (cash > 0) ledger.push({
    id: maxId + 1,
    time: Number.isFinite(snapshot.time) ? snapshot.time : 0,
    year: Math.max(1, Math.floor((Number(snapshot.time) || 0) / 300) + 1),
    amount: -cash,
    category: 'capital',
    detail: `Development capital transferred to ${destinationName}`.slice(0, 80),
  });
  return { ...snapshot, cash: 0, financeLedger: ledger };
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('Portfolio transaction aborted'));
    transaction.onerror = () => reject(transaction.error ?? new Error('Portfolio transaction failed'));
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;
function openPortfolio(): Promise<IDBDatabase> {
  if (!portfolioSupported()) return Promise.reject(new Error('IndexedDB is unavailable'));
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(RESORTS)) db.createObjectStore(RESORTS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error ?? new Error('Could not open resort portfolio'));
    };
  });
  return dbPromise;
}

async function readManifest(db: IDBDatabase, mode: IDBTransactionMode = 'readonly'): Promise<{ transaction: IDBTransaction; manifest: PortfolioManifest | null }> {
  const transaction = db.transaction([RESORTS, META], mode);
  const manifest = await requestResult(transaction.objectStore(META).get('manifest')) as PortfolioManifest | undefined;
  return { transaction, manifest: manifest?.version === 1 ? manifest : null };
}

/** Loads an existing active resort or atomically migrates the legacy autosave once. */
export async function bootstrapPortfolio(legacySnapshot: unknown): Promise<ResortRecord | null> {
  if (!portfolioSupported()) return null;
  const db = await openPortfolio();
  const { transaction, manifest } = await readManifest(db, 'readwrite');
  const resorts = transaction.objectStore(RESORTS);
  const meta = transaction.objectStore(META);
  if (manifest) {
    const active = await requestResult(resorts.get(manifest.activeResortId)) as ResortRecord | undefined;
    if (active && isCourseSnapshot(legacySnapshot) && Number(legacySnapshot.savedAt) > active.updatedAt) {
      const recovered = recordFor(active.id, legacySnapshot, active.kind);
      resorts.put(recovered);
      await transactionDone(transaction);
      return recovered;
    }
    await transactionDone(transaction);
    return active && isCourseSnapshot(active.snapshot) ? active : null;
  }
  if (!isCourseSnapshot(legacySnapshot)) {
    transaction.abort();
    return null;
  }
  const id = resortId();
  const active = recordFor(id, legacySnapshot, legacySnapshot.sandbox ? 'sandbox' : 'career');
  const next: PortfolioManifest = { key: 'manifest', version: 1, activeResortId: id, resortIds: [id] };
  resorts.put(active);
  meta.put(next);
  await transactionDone(transaction);
  return active;
}

export async function saveActivePortfolioResort(snapshot: unknown): Promise<boolean> {
  if (!isCourseSnapshot(snapshot) || !portfolioSupported()) return false;
  const db = await openPortfolio();
  const { transaction, manifest } = await readManifest(db, 'readwrite');
  if (!manifest) {
    transaction.abort();
    return false;
  }
  const store = transaction.objectStore(RESORTS);
  const prior = await requestResult(store.get(manifest.activeResortId)) as ResortRecord | undefined;
  store.put(recordFor(manifest.activeResortId, snapshot, prior?.kind ?? (snapshot.sandbox ? 'sandbox' : 'career')));
  await transactionDone(transaction);
  return true;
}

/** Persists source + destination + active pointer in one IndexedDB transaction. */
export async function createPortfolioResort(sourceSnapshot: unknown, targetSnapshot: unknown, kind: ResortRecord['kind']): Promise<ResortRecord> {
  if (!isCourseSnapshot(targetSnapshot)) throw new Error('New resort snapshot is invalid');
  const db = await openPortfolio();
  const { transaction, manifest } = await readManifest(db, 'readwrite');
  const store = transaction.objectStore(RESORTS);
  const meta = transaction.objectStore(META);
  const resortIds = manifest ? [...manifest.resortIds] : [];

  if (manifest && isCourseSnapshot(sourceSnapshot)) {
    const prior = await requestResult(store.get(manifest.activeResortId)) as ResortRecord | undefined;
    store.put(recordFor(manifest.activeResortId, sourceSnapshot, prior?.kind ?? (sourceSnapshot.sandbox ? 'sandbox' : 'career')));
  }

  const id = resortId();
  const target = recordFor(id, targetSnapshot, kind);
  store.put(target);
  resortIds.push(id);
  meta.put({ key: 'manifest', version: 1, activeResortId: id, resortIds: [...new Set(resortIds)] } satisfies PortfolioManifest);
  await transactionDone(transaction);
  return target;
}

/** Saves the current resort and changes the active pointer atomically before applying the target. */
export async function switchPortfolioResortSnapshot(currentSnapshot: unknown, targetId: ResortId): Promise<ResortRecord> {
  if (!isCourseSnapshot(currentSnapshot)) throw new Error('Current resort snapshot is invalid');
  const db = await openPortfolio();
  const { transaction, manifest } = await readManifest(db, 'readwrite');
  if (!manifest || !manifest.resortIds.includes(targetId)) {
    transaction.abort();
    throw new Error('That resort is not in this portfolio');
  }
  const store = transaction.objectStore(RESORTS);
  const [target, current] = await Promise.all([
    requestResult(store.get(targetId)) as Promise<ResortRecord | undefined>,
    requestResult(store.get(manifest.activeResortId)) as Promise<ResortRecord | undefined>,
  ]);
  if (!target || !isCourseSnapshot(target.snapshot)) {
    transaction.abort();
    throw new Error('That resort save is unavailable or incompatible');
  }
  store.put(recordFor(manifest.activeResortId, currentSnapshot, current?.kind ?? (currentSnapshot.sandbox ? 'sandbox' : 'career')));
  transaction.objectStore(META).put({ ...manifest, activeResortId: targetId });
  await transactionDone(transaction);
  return target;
}

export async function listPortfolioResorts(): Promise<ResortRecord[]> {
  if (!portfolioSupported()) return [];
  const db = await openPortfolio();
  const { transaction, manifest } = await readManifest(db);
  if (!manifest) {
    await transactionDone(transaction);
    return [];
  }
  const all = await requestResult(transaction.objectStore(RESORTS).getAll()) as ResortRecord[];
  await transactionDone(transaction);
  const order = new Map(manifest.resortIds.map((id, index) => [id, index]));
  return all
    .filter((record) => isCourseSnapshot(record.snapshot))
    .map((record) => ({ ...record, active: record.id === manifest.activeResortId }))
    .sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
}

/** Test-only database reset; kept explicit so production code never clears a portfolio accidentally. */
export async function resetPortfolioForTests(): Promise<void> {
  if (dbPromise) {
    try { (await dbPromise).close(); } catch { /* ignore failed test handles */ }
    dbPromise = null;
  }
  if (!portfolioSupported()) return;
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Could not reset portfolio test database'));
    request.onblocked = () => reject(new Error('Portfolio test database reset was blocked'));
  });
}
