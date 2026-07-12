import { describe, expect, it } from 'vitest';
import { afterEach, beforeEach } from 'vitest';
import { indexedDB as memoryIndexedDB } from 'fake-indexeddb';
import {
  associateActivePortfolioMirror,
  bootstrapPortfolio,
  createPortfolioResort,
  isCourseSnapshot,
  listPortfolioResorts,
  PORTFOLIO_MIRROR_KEY,
  resetPortfolioForTests,
  resortsForProperty,
  resortSummary,
  saveActivePortfolioResort,
  sourceAfterCapitalTransfer,
  sourceForPortfolioExpansion,
  switchPortfolioResortSnapshot,
  type CourseSnapshot,
} from './portfolio';
import { W, H } from './constants';

function memoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => void store.set(key, value),
    removeItem: (key) => void store.delete(key),
    clear: () => store.clear(),
    key: (index) => [...store.keys()][index] ?? null,
    get length() { return store.size; },
  } as Storage;
}

function snapshot(overrides: Partial<CourseSnapshot> = {}): CourseSnapshot {
  return {
    v: 2,
    propertyId: 'maple-crossing',
    courseName: 'Maple House',
    cash: 10_000,
    rep: 3.75,
    holes: [{ id: 1 }],
    theme: 'parklands',
    tiles: Array(W * H).fill(0),
    time: 610,
    financeLedger: [{ id: 4, time: 0, year: 1, amount: 10_000, category: 'capital', detail: 'Founder capital' }],
    ...overrides,
  };
}

describe('resort portfolio snapshots', () => {
  it('accepts current course envelopes and rejects incompatible or truncated saves', () => {
    expect(isCourseSnapshot(snapshot())).toBe(true);
    expect(isCourseSnapshot({ ...snapshot(), propertyId: 'not-real' })).toBe(false);
    expect(isCourseSnapshot({ ...snapshot(), tiles: [0, 1] })).toBe(false);
    expect(isCourseSnapshot({ ...snapshot(), v: 99 })).toBe(false);
  });

  it('stores a lightweight, clamped resort summary next to each full snapshot', () => {
    expect(resortSummary(snapshot({ cash: 1234.9, rep: 7, holes: [{}, {}, {}] }))).toEqual({
      courseName: 'Maple House',
      cash: 1234,
      rep: 5,
      holes: 3,
      theme: 'parklands',
    });
  });

  it('transfers career development capital instead of duplicating it across resorts', () => {
    const source = snapshot({ cash: 10_000 });
    const transferred = sourceAfterCapitalTransfer(source, 'Donegal Point');
    const destinationCash = 10_000 - 1_000;

    expect(source.cash).toBe(10_000); // pure: rollback source remains intact
    expect(transferred.cash).toBe(0);
    expect(transferred.cash + destinationCash).toBe(9_000);
    expect(transferred.financeLedger).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 5, amount: -10_000, category: 'capital', detail: 'Development capital transferred to Donegal Point' }),
    ]));
  });

  it('never transfers funds out of a sandbox or into another sandbox', () => {
    const sandbox = snapshot({ cash: 9_999_999, sandbox: true });
    expect(sourceForPortfolioExpansion(sandbox, 'Donegal Point', 'career')).toBe(sandbox);
    const career = snapshot({ cash: 10_000 });
    expect(sourceForPortfolioExpansion(career, 'Maple Sandbox', 'sandbox')).toBe(career);
  });

  it('lists career and sandbox copies together for a property', () => {
    const career = { id: 'career', propertyId: 'maple-crossing', kind: 'career', snapshot: snapshot(), summary: resortSummary(snapshot()), updatedAt: 1 } as const;
    const sandbox = { id: 'sandbox', propertyId: 'maple-crossing', kind: 'sandbox', snapshot: snapshot({ sandbox: true }), summary: resortSummary(snapshot({ sandbox: true })), updatedAt: 2 } as const;
    const other = { id: 'other', propertyId: 'donegal-point', kind: 'career', snapshot: snapshot({ propertyId: 'donegal-point', theme: 'links' }), summary: resortSummary(snapshot({ propertyId: 'donegal-point', theme: 'links' })), updatedAt: 3 } as const;
    expect(resortsForProperty([career, sandbox, other], 'maple-crossing').map((resort) => resort.id)).toEqual(['career', 'sandbox']);
  });
});

describe('transactional resort portfolio repository', () => {
  beforeEach(async () => {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: memoryStorage() });
    Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: memoryIndexedDB });
    await resetPortfolioForTests();
  });

  afterEach(async () => {
    await resetPortfolioForTests();
    delete (globalThis as { indexedDB?: IDBFactory }).indexedDB;
    delete (globalThis as { localStorage?: Storage }).localStorage;
  });

  it('migrates one legacy autosave once and lets a newer emergency mirror win', async () => {
    const first = snapshot({ savedAt: 100, cash: 1000 });
    const migrated = await bootstrapPortfolio(first);
    expect(migrated).toMatchObject({ propertyId: 'maple-crossing' });
    expect(await listPortfolioResorts()).toHaveLength(1);

    const emergency = snapshot({ savedAt: 200, cash: 2222 });
    localStorage.setItem(PORTFOLIO_MIRROR_KEY, JSON.stringify({ version: 1, resortId: migrated!.id, savedAt: emergency.savedAt }));
    const recovered = await bootstrapPortfolio(emergency);
    expect(recovered?.summary.cash).toBe(2222);
    expect((await listPortfolioResorts())[0]).toMatchObject({ active: true, summary: { cash: 2222 } });
  });

  it('recovers only an explicitly-associated emergency mirror for the active resort', async () => {
    const active = await bootstrapPortfolio(snapshot({ savedAt: 100, cash: 1000 }));
    const recoveredSnapshot = snapshot({ savedAt: 300, cash: 3333 });
    localStorage.setItem(PORTFOLIO_MIRROR_KEY, JSON.stringify({ version: 1, resortId: active!.id, savedAt: recoveredSnapshot.savedAt }));

    const recovered = await bootstrapPortfolio(recoveredSnapshot);
    expect(recovered).toMatchObject({ id: active!.id, summary: { courseName: 'Maple House', cash: 3333 } });
  });

  it('associates the synchronous compatibility save before its queued IndexedDB autosave', async () => {
    const active = await bootstrapPortfolio(snapshot({ savedAt: 100, cash: 1000 }));
    const compatibilitySave = snapshot({ savedAt: 250, cash: 2525 });

    expect(associateActivePortfolioMirror(compatibilitySave)).toBe(true);
    expect(JSON.parse(localStorage.getItem(PORTFOLIO_MIRROR_KEY)!)).toEqual({ version: 1, resortId: active!.id, savedAt: 250 });
    const recovered = await bootstrapPortfolio(compatibilitySave);
    expect(recovered).toMatchObject({ id: active!.id, summary: { cash: 2525 } });
  });

  it('never lets a newer untagged source mirror overwrite a different active resort after travel', async () => {
    const maple = await bootstrapPortfolio(snapshot({ savedAt: 100, cash: 500 }));
    await createPortfolioResort(
      snapshot({ savedAt: 120, cash: 500 }),
      snapshot({ savedAt: 200, propertyId: 'donegal-point', courseName: 'Donegal Club', theme: 'links', cash: 8000 }),
      'career',
    );
    await switchPortfolioResortSnapshot(
      snapshot({ savedAt: 500, propertyId: 'donegal-point', courseName: 'Donegal Source', theme: 'links', cash: 7777 }),
      maple!.id,
    );

    const resumed = await bootstrapPortfolio(snapshot({ savedAt: 900, propertyId: 'donegal-point', courseName: 'STALE SOURCE MIRROR', theme: 'links', cash: 1 }));
    expect(resumed).toMatchObject({ id: maple!.id, propertyId: 'maple-crossing', summary: { courseName: 'Maple House', cash: 500 } });
  });

  it('atomically stores source and destination without duplicating career capital', async () => {
    const source = snapshot({ savedAt: 100, cash: 10_000 });
    const original = await bootstrapPortfolio(source);
    const transferred = sourceAfterCapitalTransfer(source, 'Donegal Point');
    const target = snapshot({ savedAt: 200, propertyId: 'donegal-point', courseName: 'Donegal Point', theme: 'links', cash: 9_000, holes: [{}, {}] });

    const created = await createPortfolioResort(transferred, target, 'career');
    const resorts = await listPortfolioResorts();
    expect(resorts).toHaveLength(2);
    expect(resorts.find((resort) => resort.id === original?.id)?.summary.cash).toBe(0);
    expect(resorts.find((resort) => resort.id === created.id)).toMatchObject({ active: true, propertyId: 'donegal-point', summary: { cash: 9000, holes: 2 } });
  });

  it('switches repeatedly while preserving distinct resort names, cash, holes, and active pointer', async () => {
    const maple = await bootstrapPortfolio(snapshot({ savedAt: 100, cash: 500, holes: [{}] }));
    const donegal = await createPortfolioResort(snapshot({ savedAt: 120, cash: 500 }), snapshot({ savedAt: 200, propertyId: 'donegal-point', courseName: 'Donegal Club', theme: 'links', cash: 8000, holes: [{}, {}, {}] }), 'career');

    const target = await switchPortfolioResortSnapshot(snapshot({ savedAt: 250, propertyId: 'donegal-point', courseName: 'Donegal Club', theme: 'links', cash: 7777, holes: [{}, {}, {}] }), maple!.id);
    expect(target.summary.courseName).toBe('Maple House');
    let resorts = await listPortfolioResorts();
    expect(resorts.find((resort) => resort.id === maple!.id)?.active).toBe(true);
    expect(resorts.find((resort) => resort.id === donegal.id)?.summary.cash).toBe(7777);

    await switchPortfolioResortSnapshot(snapshot({ savedAt: 300, cash: 321, holes: [{}, {}] }), donegal.id);
    resorts = await listPortfolioResorts();
    expect(resorts.find((resort) => resort.id === maple!.id)).toMatchObject({ active: false, summary: { courseName: 'Maple House', cash: 321, holes: 2 } });
    expect(resorts.find((resort) => resort.id === donegal.id)?.active).toBe(true);
  });

  it('keeps the active resort unchanged when a switch target is invalid', async () => {
    const active = await bootstrapPortfolio(snapshot());
    await expect(switchPortfolioResortSnapshot(snapshot({ cash: 456 }), 'missing-resort')).rejects.toThrow(/not in this portfolio/);
    expect((await listPortfolioResorts()).find((resort) => resort.active)?.id).toBe(active?.id);
  });

  it('rejects switching to the already-active resort without overwriting it', async () => {
    const active = await bootstrapPortfolio(snapshot({ savedAt: 100, cash: 500 }));
    await expect(switchPortfolioResortSnapshot(snapshot({ savedAt: 200, courseName: 'SHOULD NOT WRITE', cash: 1 }), active!.id)).rejects.toThrow(/already active/);
    expect((await listPortfolioResorts())[0]).toMatchObject({ id: active!.id, active: true, summary: { courseName: 'Maple House', cash: 500 } });
  });

  it('rejects a concurrent duplicate switch captured from stale active state', async () => {
    const maple = await bootstrapPortfolio(snapshot({ savedAt: 100, cash: 500 }));
    const donegal = await createPortfolioResort(
      snapshot({ savedAt: 110, cash: 500 }),
      snapshot({ savedAt: 200, propertyId: 'donegal-point', courseName: 'Donegal Club', theme: 'links', cash: 8000 }),
      'career',
    );
    const first = switchPortfolioResortSnapshot(snapshot({ savedAt: 300, propertyId: 'donegal-point', courseName: 'Donegal Club', theme: 'links', cash: 7777 }), maple!.id);
    const duplicate = switchPortfolioResortSnapshot(snapshot({ savedAt: 400, propertyId: 'donegal-point', courseName: 'STALE DUPLICATE', theme: 'links', cash: 1 }), maple!.id);

    const [firstResult, duplicateResult] = await Promise.allSettled([first, duplicate]);
    expect(firstResult).toMatchObject({ status: 'fulfilled', value: { id: maple!.id } });
    expect(duplicateResult).toMatchObject({ status: 'rejected', reason: expect.objectContaining({ message: expect.stringMatching(/active resort changed/) }) });
    const resorts = await listPortfolioResorts();
    expect(resorts.find((resort) => resort.id === maple!.id)).toMatchObject({ active: true, summary: { courseName: 'Maple House', cash: 500 } });
    expect(resorts.find((resort) => resort.id === donegal.id)).toMatchObject({ active: false, summary: { courseName: 'Donegal Club', cash: 7777 } });
  });

  it('drops an autosave captured while an exclusive switch is in flight', async () => {
    const maple = await bootstrapPortfolio(snapshot({ savedAt: 100, cash: 500 }));
    const donegal = await createPortfolioResort(snapshot({ savedAt: 110, cash: 500 }), snapshot({ savedAt: 200, propertyId: 'donegal-point', courseName: 'Donegal Club', theme: 'links', cash: 8000 }), 'career');
    const switching = switchPortfolioResortSnapshot(snapshot({ savedAt: 220, propertyId: 'donegal-point', courseName: 'Donegal Club', theme: 'links', cash: 7777 }), maple!.id);
    expect(associateActivePortfolioMirror(snapshot({ savedAt: 225, propertyId: 'donegal-point', courseName: 'STALE SOURCE MIRROR', theme: 'links', cash: 2 }))).toBe(false);
    const staleAutosave = await saveActivePortfolioResort(snapshot({ savedAt: 230, propertyId: 'donegal-point', courseName: 'STALE SOURCE', theme: 'links', cash: 1 }));
    expect(staleAutosave).toBe(false);
    await switching;
    const resorts = await listPortfolioResorts();
    expect(resorts.find((resort) => resort.id === maple!.id)?.summary.courseName).toBe('Maple House');
    expect(resorts.find((resort) => resort.id === donegal.id)?.summary.cash).toBe(7777);
  });

  it('keeps same-property sandbox copies distinct from the career resort', async () => {
    const career = await bootstrapPortfolio(snapshot());
    const sandbox = await createPortfolioResort(snapshot(), snapshot({ savedAt: 200, courseName: 'Maple Sandbox', cash: 9_999_999, sandbox: true }), 'sandbox');
    const resorts = await listPortfolioResorts();
    expect(new Set(resorts.map((resort) => resort.id)).size).toBe(2);
    expect(resorts.find((resort) => resort.id === career?.id)?.kind).toBe('career');
    expect(resorts.find((resort) => resort.id === sandbox.id)).toMatchObject({ kind: 'sandbox', active: true });
  });

  it('updates the active resort summary during autosave', async () => {
    await bootstrapPortfolio(snapshot({ cash: 100 }));
    expect(await saveActivePortfolioResort(snapshot({ savedAt: 300, cash: 4321, holes: [{}, {}] }))).toBe(true);
    expect((await listPortfolioResorts())[0]).toMatchObject({ active: true, summary: { cash: 4321, holes: 2 } });
  });
});
