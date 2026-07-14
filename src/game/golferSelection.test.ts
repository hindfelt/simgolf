import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { centerOnGolfer, exportSaveText, selectGolfer, setTool } from './engine';
import { S } from './state';
import type { Golfer } from './types';
import { ui } from '../ui/store';

const fixture = (): Golfer => ({
  name: 'Birdie', skill: .6, shirt: '#478e62', skin: '#d9a779', cap: '#f0d34e',
  x: 12, y: 14, tx: 12, ty: 14, phase: 0, state: 'preshot', t: 0,
  holeIdx: 0, strokes: 1, mood: 2, ball: null, lie: 'fair', chatCd: 0,
  scenicSaid: false, energy: 1, hunger: .8, thirst: .7,
});

describe('live golfer selection ownership', () => {
  let golfers: Golfer[];
  let selectedGolfer: Golfer | null;
  let tool: typeof S.tool;
  let camTarget: typeof S.camTarget;
  let selectionVersion: number;

  beforeEach(() => {
    golfers = S.golfers;
    selectedGolfer = S.selectedGolfer;
    tool = S.tool;
    camTarget = S.camTarget;
    selectionVersion = ui.get().golferSelectionVersion;
    S.golfers = [];
    S.selectedGolfer = null;
  });

  afterEach(() => {
    S.golfers = golfers;
    S.selectedGolfer = selectedGolfer;
    S.tool = tool;
    S.camTarget = camTarget;
    ui.set({ golferSelectionVersion: selectionVersion });
  });

  it('selects only a live object and centers the camera on its current position', () => {
    const golfer = fixture();
    S.golfers = [golfer];
    const version = ui.get().golferSelectionVersion;

    selectGolfer(golfer);

    expect(S.selectedGolfer).toBe(golfer);
    expect(ui.get().golferSelectionVersion).toBe(version + 1);
    expect(centerOnGolfer()).toBe(true);
    expect(S.camTarget).toEqual({ x: 12, y: 14 });

    selectGolfer(fixture());
    expect(S.selectedGolfer).toBeNull();
  });

  it('keeps selection in People mode, clears it on another tool, and never serializes it', () => {
    const golfer = fixture();
    S.golfers = [golfer];
    selectGolfer(golfer);

    setTool('inspect');
    expect(S.selectedGolfer).toBe(golfer);
    expect(JSON.parse(exportSaveText())).not.toHaveProperty('selectedGolfer');

    setTool('pan');
    expect(S.selectedGolfer).toBeNull();
  });
});
