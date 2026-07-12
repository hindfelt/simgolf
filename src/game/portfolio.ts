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

export interface PortfolioEmergencyMirror {
  version: 1;
  resortId: ResortId;
  savedAt: number;
}

const DB_NAME = 'fairway-mogul-portfolio';
const DB_VERSION = 1;
const RESORTS = 'resorts';
const META = 'meta';
const THEMES: CourseTheme[] = ['parklands', 'links', 'desert', 'tropical'];
export const PORTFOLIO_MIRROR_KEY = 'fairway-mogul-portfolio-mirror-v1';

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

function readEmergencyMirror(): PortfolioEmergencyMirror | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(PORTFOLIO_MIRROR_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PortfolioEmergencyMirror>;
    return parsed.version === 1 && typeof parsed.resortId === 'string' && Number.isFinite(parsed.savedAt)
      ? parsed as PortfolioEmergencyMirror
      : null;
  } catch {
    return null;
  }
}

function writeEmergencyMirror(resortId: ResortId, snapshot: CourseSnapshot): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    const savedAt = Number(snapshot.savedAt);
    if (!Number.isFinite(savedAt)) return false;
    // The normal compatibility save already contains the full snapshot. This
    // small sidecar proves which resort that save belongs to without consuming
    // local-storage quota for a second full copy.
    localStorage.setItem(PORTFOLIO_MIRROR_KEY, JSON.stringify({ version: 1, resortId, savedAt } satisfies PortfolioEmergencyMirror));
    return true;
  } catch {
    /* IndexedDB remains authoritative when the emergency mirror is unavailable. */
    return false;
  }
}

export function resortsForProperty(records: readonly ResortRecord[], propertyId: PropertyId): ResortRecord[] {
  return records.filter((record) => record.propertyId === propertyId);
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

export function sourceForPortfolioExpansion(snapshot: CourseSnapshot, destinationName: string, destinationKind: ResortRecord['kind']): CourseSnapshot {
  return snapshot.sandbox === true || destinationKind === 'sandbox' ? snapshot : sourceAfterCapitalTransfer(snapshot, destinationName);
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
let writeQueue: Promise<void> = Promise.resolve();
let exclusiveMutations = 0;
let activeResortId: ResortId | null = null;

function enqueueWrite<T>(operation: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(operation, operation);
  writeQueue = result.then(() => undefined, () => undefined);
  return result;
}

/**
 * Tags the already-written synchronous compatibility save with its resort id.
 * The full IndexedDB write may finish later; on a pagehide/crash this sidecar
 * lets boot safely recover that exact snapshot. Travel operations deliberately
 * refuse association because the live snapshot may still describe the source.
 */
export function associateActivePortfolioMirror(snapshot: unknown): boolean {
  if (exclusiveMutations > 0 || !activeResortId || !isCourseSnapshot(snapshot)) return false;
  return writeEmergencyMirror(activeResortId, snapshot);
}

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
  const emergencyMirror = readEmergencyMirror();
  if (manifest) {
    const active = await requestResult(resorts.get(manifest.activeResortId)) as ResortRecord | undefined;
    // An untagged legacy autosave cannot prove which portfolio resort it
    // belongs to. Only recover a newer snapshot when its explicit resort id
    // matches the active pointer; this prevents a pre-travel source mirror
    // from replacing the destination after a crash during switching.
    const taggedLegacySnapshot = emergencyMirror?.resortId === manifest.activeResortId && isCourseSnapshot(legacySnapshot) &&
      Number(legacySnapshot.savedAt) === emergencyMirror.savedAt ? legacySnapshot : null;
    if (taggedLegacySnapshot && (!active || Number(taggedLegacySnapshot.savedAt) > active.updatedAt)) {
      const recovered = recordFor(manifest.activeResortId, taggedLegacySnapshot, active?.kind ?? (taggedLegacySnapshot.sandbox ? 'sandbox' : 'career'));
      resorts.put(recovered);
      await transactionDone(transaction);
      activeResortId = recovered.id;
      writeEmergencyMirror(recovered.id, recovered.snapshot);
      return recovered;
    }
    await transactionDone(transaction);
    if (active && isCourseSnapshot(active.snapshot)) {
      activeResortId = active.id;
      writeEmergencyMirror(active.id, active.snapshot);
      return active;
    }
    activeResortId = null;
    return null;
  }
  const migrationSnapshot = isCourseSnapshot(legacySnapshot) ? legacySnapshot : null;
  if (!migrationSnapshot) {
    activeResortId = null;
    transaction.abort();
    return null;
  }
  const id = resortId();
  const active = recordFor(id, migrationSnapshot, migrationSnapshot.sandbox ? 'sandbox' : 'career');
  const next: PortfolioManifest = { key: 'manifest', version: 1, activeResortId: id, resortIds: [id] };
  resorts.put(active);
  meta.put(next);
  await transactionDone(transaction);
  activeResortId = active.id;
  writeEmergencyMirror(active.id, active.snapshot);
  return active;
}

async function saveActivePortfolioResortImpl(snapshot: unknown): Promise<boolean> {
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
  activeResortId = manifest.activeResortId;
  writeEmergencyMirror(manifest.activeResortId, snapshot);
  return true;
}

export function saveActivePortfolioResort(snapshot: unknown): Promise<boolean> {
  // An autosave captured during travel still describes the source resort. Drop it;
  // the exclusive transaction already writes the source before flipping active.
  if (exclusiveMutations > 0) return Promise.resolve(false);
  return enqueueWrite(() => saveActivePortfolioResortImpl(snapshot));
}

/** Persists source + destination + active pointer in one IndexedDB transaction. */
async function createPortfolioResortImpl(sourceSnapshot: unknown, targetSnapshot: unknown, kind: ResortRecord['kind']): Promise<ResortRecord> {
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
  activeResortId = target.id;
  writeEmergencyMirror(target.id, target.snapshot);
  return target;
}

export function createPortfolioResort(sourceSnapshot: unknown, targetSnapshot: unknown, kind: ResortRecord['kind']): Promise<ResortRecord> {
  exclusiveMutations++;
  return enqueueWrite(() => createPortfolioResortImpl(sourceSnapshot, targetSnapshot, kind)).finally(() => { exclusiveMutations--; });
}

/** Saves the current resort and changes the active pointer atomically before applying the target. */
async function switchPortfolioResortSnapshotImpl(currentSnapshot: unknown, targetId: ResortId, expectedActiveId: ResortId | null): Promise<ResortRecord> {
  if (!isCourseSnapshot(currentSnapshot)) throw new Error('Current resort snapshot is invalid');
  const db = await openPortfolio();
  const { transaction, manifest } = await readManifest(db, 'readwrite');
  if (!manifest || !manifest.resortIds.includes(targetId)) {
    transaction.abort();
    throw new Error('That resort is not in this portfolio');
  }
  if (expectedActiveId && manifest.activeResortId !== expectedActiveId) {
    transaction.abort();
    throw new Error('The active resort changed before travel completed');
  }
  if (manifest.activeResortId === targetId) {
    transaction.abort();
    throw new Error('That resort is already active');
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
  activeResortId = target.id;
  writeEmergencyMirror(target.id, target.snapshot);
  return target;
}

export function switchPortfolioResortSnapshot(currentSnapshot: unknown, targetId: ResortId): Promise<ResortRecord> {
  const expectedActiveId = activeResortId;
  exclusiveMutations++;
  return enqueueWrite(() => switchPortfolioResortSnapshotImpl(currentSnapshot, targetId, expectedActiveId)).finally(() => { exclusiveMutations--; });
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
  await writeQueue;
  writeQueue = Promise.resolve();
  exclusiveMutations = 0;
  activeResortId = null;
  if (dbPromise) {
    try { (await dbPromise).close(); } catch { /* ignore failed test handles */ }
    dbPromise = null;
  }
  if (!portfolioSupported()) return;
  try { if (typeof localStorage !== 'undefined') localStorage.removeItem(PORTFOLIO_MIRROR_KEY); } catch { /* ignore test storage */ }
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Could not reset portfolio test database'));
    request.onblocked = () => reject(new Error('Portfolio test database reset was blocked'));
  });
}
