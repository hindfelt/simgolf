import { describe, expect, it } from 'vitest';
import { buildingTouchesNetwork } from './buildings';
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
