import { beforeEach, describe, expect, it } from 'vitest';
import { H, PW, PH, W } from './constants';
import { beginPaintStroke, holeToolTap, paintAt, rebuildStatics, update } from './engine';
import { idx, idxC } from './rng';
import { S, caches } from './state';
import { Tile } from './types';

describe('new-hole placement', () => {
  beforeEach(() => {
    S.cash = 20_000;
    S.tiles = new Uint8Array(W * H);
    S.tiles.fill(Tile.ROUGH);
    S.elevC = new Uint8Array((W + 1) * (H + 1));
    S.owned = new Uint8Array(PW * PH);
    S.owned.fill(1);
    S.holes = [];
    S.buildings = [];
    S.facilityActivities = [];
    S.nextFacilityActivity = 4;
    S.employees = [];
    S.golfers = [];
    S.balls = [];
    S.speed = 1;
    S.nextGolfer = 999;
    S.holeDraft = null;
    rebuildStatics();
  });

  it('does not start a tee whose full pad crosses the map edge', () => {
    holeToolTap(0, 8);
    expect(S.holeDraft).toBeNull();
    expect(S.cash).toBe(20_000);
  });

  it('keeps the tee draft and cash when the proposed green footprint is invalid', () => {
    holeToolTap(10, 10);
    expect(S.holeDraft).not.toBeNull();

    holeToolTap(20, 0);
    expect(S.holes).toHaveLength(0);
    expect(S.holeDraft).not.toBeNull();
    expect(S.cash).toBe(20_000);
  });

  it('starts ambient traffic after a destination facility is built', () => {
    S.buildings.push({ id: 99, kind: 'airstrip', x: 30, y: 18, w: 8, h: 3, open: false });
    S.nextFacilityActivity = 0;

    update(0.1);

    expect(S.facilityActivities).toHaveLength(1);
    expect(S.facilityActivities[0].facilityId).toBe(99);
    expect(S.facilityActivities[0].kind).toMatch(/^plane-/);
  });

  it('raises and lowers the same land through several elevation steps', () => {
    S.tool = 'raise';
    for (let step = 1; step <= 3; step++) {
      beginPaintStroke();
      paintAt(30.2, 30.2);
      expect(S.elevC[idxC(30, 30)]).toBe(step);
    }

    S.tool = 'lower';
    for (let step = 2; step >= 0; step--) {
      beginPaintStroke();
      paintAt(30.2, 30.2);
      expect(S.elevC[idxC(30, 30)]).toBe(step);
    }
  });

  it('seeds visible wildlife from water, woodland, and rough habitats', () => {
    for (let y = 2; y < 10; y++) for (let x = 2; x < 10; x++) S.tiles[idx(x, y)] = Tile.WATER;
    for (let y = 12; y < 22; y++) for (let x = 2; x < 12; x++) S.tiles[idx(x, y)] = Tile.TREE;

    rebuildStatics();

    const kinds = new Set(caches.wildlife.map((animal) => animal.kind));
    expect(kinds).toContain('duck');
    expect(kinds).toContain('deer');
    expect(kinds).toContain('rabbit');
  });
});
