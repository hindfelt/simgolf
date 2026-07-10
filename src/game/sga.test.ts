import { describe, expect, it } from 'vitest';
import { sgaClassForDemand, sgaFeeMultiplier, sgaSkillDemand } from './sga';

describe('manual SGA hole evaluation', () => {
  it.each([
    [{ length: 0, accuracy: 0, imagination: 0 }, 'Breather'],
    [{ length: 1, accuracy: 0, imagination: 0 }, 'Freeway'],
    [{ length: 0, accuracy: 1, imagination: 0 }, 'Precise'],
    [{ length: 0, accuracy: 0, imagination: 1 }, 'Creative'],
    [{ length: 1, accuracy: 1, imagination: 0 }, 'Challenge'],
    [{ length: 1, accuracy: 0, imagination: 1 }, 'Heroic'],
    [{ length: 0, accuracy: 1, imagination: 1 }, 'Strategic'],
    [{ length: 1, accuracy: 1, imagination: 1 }, 'Classic'],
  ] as const)('maps %o to %s', (demand, expected) => {
    expect(sgaClassForDemand(demand)).toBe(expected);
  });

  it('derives length from distance, accuracy from hazards/green precision, and imagination from shape/elevation', () => {
    const demand = sgaSkillDemand({
      tee: { x: 2, y: 2 },
      cup: { x: 29, y: 2 },
      par: 5,
      funBreakdown: { hazard: 0.8, green: 0.2, dogleg: 0.7, elev: 0.1 },
    });
    expect(demand.length).toBeGreaterThan(0.9);
    expect(demand.accuracy).toBeGreaterThan(0.8);
    expect(demand.imagination).toBeGreaterThan(0.7);
    expect(sgaClassForDemand(demand)).toBe('Classic');
  });

  it('applies the manual Top 100 and stronger Top 18 fee premiums', () => {
    expect(sgaFeeMultiplier({})).toBe(1);
    expect(sgaFeeMultiplier({ top100: true })).toBe(1.15);
    expect(sgaFeeMultiplier({ top100: true, top18: true })).toBe(1.35);
  });
});
