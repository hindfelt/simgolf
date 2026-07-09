import { describe, expect, it } from 'vitest';
import { footprintInBounds, greenFootprint, teeFootprint, tileKey } from './course';

describe('course footprints', () => {
  it('creates the full two-by-two tee pad', () => {
    expect(teeFootprint(4, 7).map(tileKey)).toEqual(['4,7', '5,7', '4,8', '5,8']);
  });

  it('creates the expected rounded green without duplicate tiles', () => {
    const green = greenFootprint(12, 9);
    expect(green).toHaveLength(13);
    expect(new Set(green.map(tileKey))).toHaveLength(13);
  });

  it('rejects footprints that spill over a map edge', () => {
    expect(footprintInBounds(teeFootprint(-1, 4))).toBe(false);
    expect(footprintInBounds(greenFootprint(0, 0))).toBe(false);
    expect(footprintInBounds(greenFootprint(20, 20))).toBe(true);
  });
});
