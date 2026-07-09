import { describe, expect, it } from 'vitest';
import { buildingTouchesNetwork, CATALOG } from './buildings';
import type { Building } from './types';

const building: Building = {
  id: 1,
  kind: 'proshop',
  x: 10,
  y: 10,
  w: 2,
  h: 2,
  open: false,
};

describe('facility connectivity', () => {
  it('opens for an orthogonally adjacent pathway', () => {
    expect(buildingTouchesNetwork(building, new Set(['10,9']))).toBe(true);
    expect(buildingTouchesNetwork(building, new Set(['12,11']))).toBe(true);
  });

  it('does not open for diagonal corner contact', () => {
    expect(buildingTouchesNetwork(building, new Set(['9,9']))).toBe(false);
    expect(buildingTouchesNetwork(building, new Set(['12,12']))).toBe(false);
  });
});

describe('facility scale hierarchy', () => {
  it('makes destination infrastructure substantially larger than a snack bar', () => {
    const snackArea = CATALOG.snackbar.w * CATALOG.snackbar.h;
    const runwayArea = CATALOG.airstrip.w * CATALOG.airstrip.h;

    expect(CATALOG.airstrip.w).toBeGreaterThanOrEqual(CATALOG.snackbar.w * 4);
    expect(runwayArea).toBeGreaterThanOrEqual(snackArea * 6);
  });

  it('gives sports and resort facilities believable intermediate footprints', () => {
    expect(CATALOG.drivingrange.w).toBeGreaterThan(CATALOG.proshop.w);
    expect(CATALOG.hotel.w * CATALOG.hotel.h).toBeGreaterThan(CATALOG.proshop.w * CATALOG.proshop.h);
    expect(CATALOG.puttinggreen.w * CATALOG.puttinggreen.h).toBeGreaterThan(CATALOG.snackbar.w * CATALOG.snackbar.h);
  });
});
