import { beforeEach, describe, expect, it } from 'vitest';
import { H, PW, PH, W } from './constants';
import { holeToolTap, rebuildStatics } from './engine';
import { S } from './state';
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
    S.golfers = [];
    S.balls = [];
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
});
