import { describe, expect, it } from 'vitest';
import { afterEach, beforeEach } from 'vitest';
import { indexedDB as memoryIndexedDB } from 'fake-indexeddb';
import {
  bootstrapPortfolio,
  createPortfolioResort,
  isCourseSnapshot,
  listPortfolioResorts,
  resetPortfolioForTests,
  resortSummary,
  saveActivePortfolioResort,
  sourceAfterCapitalTransfer,
  sourceForPortfolioExpansion,
  switchPortfolioResortSnapshot,
  type CourseSnapshot,
} from './portfolio';
import { W, H } from './constants';

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
});

describe('transactional resort portfolio repository', () => {
  beforeEach(async () => {
    Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: memoryIndexedDB });
    await resetPortfolioForTests();
  });

  afterEach(async () => {
    await resetPortfolioForTests();
    delete (globalThis as { indexedDB?: IDBFactory }).indexedDB;
  });

  it('migrates one legacy autosave once and lets a newer emergency mirror win', async () => {
    const first = snapshot({ savedAt: 100, cash: 1000 });
    const migrated = await bootstrapPortfolio(first);
    expect(migrated).toMatchObject({ propertyId: 'maple-crossing' });
    expect(await listPortfolioResorts()).toHaveLength(1);

    const recovered = await bootstrapPortfolio(snapshot({ savedAt: 200, cash: 2222 }));
    expect(recovered?.summary.cash).toBe(2222);
    expect((await listPortfolioResorts())[0]).toMatchObject({ active: true, summary: { cash: 2222 } });
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

  it('drops an autosave captured while an exclusive switch is in flight', async () => {
    const maple = await bootstrapPortfolio(snapshot({ savedAt: 100, cash: 500 }));
    const donegal = await createPortfolioResort(snapshot({ savedAt: 110, cash: 500 }), snapshot({ savedAt: 200, propertyId: 'donegal-point', courseName: 'Donegal Club', theme: 'links', cash: 8000 }), 'career');
    const switching = switchPortfolioResortSnapshot(snapshot({ savedAt: 220, propertyId: 'donegal-point', courseName: 'Donegal Club', theme: 'links', cash: 7777 }), maple!.id);
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
