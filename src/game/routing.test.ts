import { beforeEach, describe, expect, it } from 'vitest';
import { H, PH, PW, W } from './constants';
import { auraAt, buildRoutingHeatmap, homeValueAt } from './routing';
import { S } from './state';
import { Tile } from './types';

describe('Routing Map overlays', () => {
  beforeEach(() => {
    S.tiles = new Uint8Array(W * H);
    S.tiles.fill(Tile.ROUGH);
    S.elevC = new Uint8Array((W + 1) * (H + 1));
    S.owned = new Uint8Array(PW * PH);
    S.owned.fill(1);
    S.holes = [];
    S.buildings = [];
    S.golfers = [];
  });

  it('shows strong positive Aura around a Landmark and neutral ground far away', () => {
    S.buildings = [{ id: 1, kind: 'landmark', x: 10, y: 10, w: 1, h: 1, open: true }];
    expect(auraAt(S, 10, 10)).toBeGreaterThan(0.8);
    expect(auraAt(S, 40, 35)).toBeCloseTo(0);
  });

  it('shows active unhappy golfers as trouble spots', () => {
    S.golfers = [{
      name: 'Tester', skill: 0.5, shirt: '#fff', skin: '#fff', cap: '#fff', x: 12, y: 12, tx: 12, ty: 12,
      phase: 0, state: 'leave', t: 0, holeIdx: 0, strokes: 0, mood: -4, ball: null, lie: 'rough', chatCd: 0,
      scenicSaid: false, energy: 1, hunger: 1, thirst: 1,
    }];
    expect(auraAt(S, 12, 12)).toBeLessThan(-0.7);
  });

  it('renders impossible sites black and values buildable land near water', () => {
    S.tiles[5 * W + 5] = Tile.WATER;
    expect(homeValueAt(S, 5, 5)).toBe(0);
    expect(homeValueAt(S, 6, 5)).toBeGreaterThan(homeValueAt(S, 40, 35));
    const heat = buildRoutingHeatmap(S, 'homeValue');
    expect(heat).toHaveLength(W * H);
    expect(heat[5 * W + 5]).toBe(0);
  });

  it('keeps bridges buildable while preserving their underlying scenery value', () => {
    const baseline = homeValueAt(S, 40, 35);
    S.tiles[5 * W + 5] = Tile.BRIDGE_WATER;
    S.tiles[5 * W + 6] = Tile.BRIDGE_STREAM;

    expect(homeValueAt(S, 5, 5)).toBeGreaterThan(baseline);
    expect(homeValueAt(S, 6, 5)).toBeGreaterThan(baseline);
    expect(auraAt(S, 5, 5)).toBeGreaterThan(0);
  });

  it('uses the configured 12-tile parcel height for ownership', () => {
    S.owned.fill(0);
    S.owned[PW] = 1;

    expect(homeValueAt(S, 1, 1)).toBe(0);
    expect(homeValueAt(S, 1, 13)).toBeGreaterThan(0);
  });
});
