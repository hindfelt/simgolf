export const COURSE_TOOL_COLUMNS = 8;
export const TOOL_TRAY_ROWS = 2;
export const TOOL_CELL_WIDTH = 64;
export const COURSE_SECOND_ROW_STAGGER = 32;
export const COURSE_TOOL_TRAY_WIDTH = COURSE_TOOL_COLUMNS * TOOL_CELL_WIDTH + COURSE_SECOND_ROW_STAGGER;

export interface ToolTrayScrollState {
  overflow: boolean;
  canPrevious: boolean;
  canNext: boolean;
}

/** Stable two-row placement matching the original construction palette. */
export function toolTrayPosition(index: number, columns = COURSE_TOOL_COLUMNS) {
  const safeIndex = Math.max(0, Math.trunc(index));
  const safeColumns = Math.max(1, Math.trunc(columns));
  return {
    column: safeIndex % safeColumns + 1,
    row: Math.floor(safeIndex / safeColumns) + 1,
  };
}

export function toolTrayScrollState(scrollLeft: number, clientWidth: number, scrollWidth: number): ToolTrayScrollState {
  const maxScroll = Math.max(0, scrollWidth - clientWidth);
  const left = Math.min(maxScroll, Math.max(0, scrollLeft));
  return {
    overflow: maxScroll > 1,
    canPrevious: left > 1,
    canNext: left < maxScroll - 1,
  };
}

/** Advance by whole 64px columns and keep one column of context visible. */
export function toolTrayPageDistance(clientWidth: number): number {
  const visibleColumns = Math.max(2, Math.floor(Math.max(0, clientWidth) / TOOL_CELL_WIDTH));
  return Math.max(TOOL_CELL_WIDTH, (visibleColumns - 1) * TOOL_CELL_WIDTH);
}
