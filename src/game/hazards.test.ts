import { beforeEach, describe, expect, it } from 'vitest';
import { H, LIE, PH, PW, TINFO, W, themedTerrainName } from './constants';
import { canPlace } from './buildings';
import { beginPaintStroke, paintAt, rebuildStatics, update } from './engine';
import { idx, lieOf } from './rng';
import { S } from './state';
import { Tile } from './types';
import type { Ball, Golfer, Hole, ToolId } from './types';

function testHole(): Hole {
  return {
    id: 1,
    tee: { x: 5.5, y: 5.5 },
    cup: { x: 16.5, y: 5.5 },
    par: 4,
    teeTiles: ['5,5'],
    greenTiles: ['16,5'],
    beauty: 0.4,
    interest: 0.5,
  };
}

function testGolfer(): Golfer {
  return {
    name: 'Hazard Tester',
    skill: 0.6,
    shirt: '#d0453a',
    skin: '#f1c6a0',
    cap: '#3f7fd0',
    x: 5.5,
    y: 5.5,
    tx: 5.5,
    ty: 5.5,
    phase: 0,
    state: 'watch',
    t: 1,
    holeIdx: 0,
    strokes: 1,
    mood: 0,
    ball: { x: 5.5, y: 5.5 },
    lie: 'tee',
    chatCd: 0,
    scenicSaid: false,
    energy: 1,
    hunger: 1,
    thirst: 1,
  };
}

describe('manual hazard terrain', () => {
  beforeEach(() => {
    S.theme = 'parklands';
    S.cash = 20_000;
    S.rep = 2.5;
    S.speed = 1;
    S.time = 0;
    S.tiles = new Uint8Array(W * H);
    S.tiles.fill(Tile.ROUGH);
    S.elevC = new Uint8Array((W + 1) * (H + 1));
    S.owned = new Uint8Array(PW * PH);
    S.owned.fill(1);
    S.holes = [];
    S.buildings = [];
    S.employees = [];
    S.golfers = [];
    S.balls = [];
    S.parts = [];
    S.floaters = [];
    S.facilityActivities = [];
    S.nextFacilityActivity = 999;
    S.nextGolfer = 999;
    S.nextStoryCheck = 999;
    S.tournament = null;
    S.tournamentCooldown = 999;
    rebuildStatics();
  });

  it('keeps persisted tile ids stable and appends the new hazards', () => {
    expect(Tile.PATH).toBe(10);
    expect(Tile.WASTE_BUNKER).toBe(11);
    expect(Tile.POT_BUNKER).toBe(12);
    expect(Tile.STREAM).toBe(13);
    expect(Tile.BRUSH).toBe(14);
    expect(Tile.ROCK).toBe(15);
  });

  it('paints every hazard and maps it to a distinct gameplay lie', () => {
    const cases: [ToolId, Tile, ReturnType<typeof lieOf>][] = [
      ['deeprough', Tile.DEEP_ROUGH, 'deeprough'],
      ['waste', Tile.WASTE_BUNKER, 'waste'],
      ['pot', Tile.POT_BUNKER, 'pot'],
      ['stream', Tile.STREAM, 'stream'],
      ['brush', Tile.BRUSH, 'brush'],
      ['rocks', Tile.ROCK, 'rock'],
    ];
    cases.forEach(([tool, tile, lie], i) => {
      S.tool = tool;
      beginPaintStroke();
      paintAt(20.2 + i, 20.2);
      expect(S.tiles[idx(20 + i, 20)]).toBe(tile);
      expect(lieOf(20.5 + i, 20.5)).toBe(lie);
      expect(TINFO[tile].cost).toBeGreaterThan(0);
    });
    expect(LIE.pot.max).toBeLessThan(LIE.sand.max);
    expect(LIE.deeprough.max).toBeLessThan(LIE.rough.max);
  });

  it('uses the manual theme substitutions in the construction UI', () => {
    expect(themedTerrainName(Tile.STREAM, 'links')).toBe('Burn');
    expect(themedTerrainName(Tile.BRUSH, 'links')).toBe('Gorse');
    expect(themedTerrainName(Tile.STREAM, 'desert')).toBe('Ravine');
    expect(themedTerrainName(Tile.ROUGH, 'desert')).toBe('Desert');
    expect(themedTerrainName(Tile.DEEP_ROUGH, 'desert')).toBe('Rough');
  });

  it('makes streams unrecoverable and applies a stroke penalty at the last safe drop', () => {
    S.holes = [testHole()];
    S.tiles[idx(10, 5)] = Tile.STREAM;
    const golfer = testGolfer();
    S.golfers = [golfer];
    const ball: Ball = {
      kind: 'fly',
      owner: golfer,
      cup: S.holes[0].cup,
      fx: 5.5,
      fy: 5.5,
      tx: 10.5,
      ty: 5.5,
      t: 0,
      dur: 0.1,
      h: 24,
      x: 5.5,
      y: 5.5,
    };
    S.balls = [ball];

    update(0.2);

    expect(golfer.strokes).toBe(2);
    expect(golfer.ball).not.toBeNull();
    expect(golfer.ball!.x).toBeLessThan(10);
    expect(golfer.lie).not.toBe('stream');
  });

  it('requires hazards and vegetation to be cleared before facility placement', () => {
    S.tiles[idx(20, 20)] = Tile.ROCK;
    expect(canPlace('proshop', 20, 20, new Set(), new Set())).toBe(false);
    S.tiles[idx(20, 20)] = Tile.ROUGH;
    expect(canPlace('proshop', 20, 20, new Set(), new Set())).toBe(true);
  });
});
