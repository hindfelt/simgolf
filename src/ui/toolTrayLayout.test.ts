import { describe, expect, it } from 'vitest';
import {
  COURSE_TOOL_COLUMNS,
  COURSE_TOOL_TRAY_WIDTH,
  TOOL_CELL_WIDTH,
  toolTrayPageDistance,
  toolTrayPosition,
  toolTrayScrollState,
} from './toolTrayLayout';

describe('original two-row construction tray', () => {
  it('places all sixteen Course tools in two rows of eight', () => {
    const positions = Array.from({ length: 16 }, (_, index) => toolTrayPosition(index));
    expect(COURSE_TOOL_COLUMNS).toBe(8);
    expect(new Set(positions.map(({ column }) => column))).toEqual(new Set([1, 2, 3, 4, 5, 6, 7, 8]));
    expect(positions.slice(0, 8).every(({ row }) => row === 1)).toBe(true);
    expect(positions.slice(8).every(({ row }) => row === 2)).toBe(true);
    // 800px viewport - 218px shell control pod - 28px palette inset = 554px.
    expect(COURSE_TOOL_TRAY_WIDTH).toBe(544);
    expect(COURSE_TOOL_TRAY_WIDTH).toBeLessThanOrEqual(800 - 218 - 28);
  });

  it('uses a compact two-by-two placement for Terrain tools', () => {
    expect(Array.from({ length: 4 }, (_, index) => toolTrayPosition(index, 2))).toEqual([
      { column: 1, row: 1 }, { column: 2, row: 1 },
      { column: 1, row: 2 }, { column: 2, row: 2 },
    ]);
  });

  it('reports exact rail endpoints and pages by whole columns', () => {
    expect(toolTrayScrollState(0, 320, 544)).toEqual({ overflow: true, canPrevious: false, canNext: true });
    expect(toolTrayScrollState(128, 320, 544)).toEqual({ overflow: true, canPrevious: true, canNext: true });
    expect(toolTrayScrollState(224, 320, 544)).toEqual({ overflow: true, canPrevious: true, canNext: false });
    expect(toolTrayScrollState(0, 544, 544)).toEqual({ overflow: false, canPrevious: false, canNext: false });
    expect(toolTrayPageDistance(320) % TOOL_CELL_WIDTH).toBe(0);
    expect(toolTrayPageDistance(320)).toBe(256);
  });
});
