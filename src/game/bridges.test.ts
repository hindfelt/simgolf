import { beforeEach, describe, expect, it } from 'vitest';
import { bridgeAxisAt, bridgeConnectionsAt, isPointOnBridgeDeck } from './bridges';
import { H, PH, PW, TINFO, W } from './constants';
import { beginPaintStroke, paintAt, rebuildStatics } from './engine';
import { idx, idxC, lieOf } from './rng';
import { S, caches } from './state';
import { Tile } from './types';

describe('pathway bridges', () => {
  beforeEach(() => {
    S.theme = 'parklands';
    S.sandbox = false;
    S.cash = 20_000;
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
    S.financeLedger = [];
    rebuildStatics();
  });

  it('converts water and streams at their bridge prices', () => {
    S.tiles[idx(10, 10)] = Tile.WATER;
    S.tiles[idx(11, 10)] = Tile.STREAM;
    S.tool = 'path';

    beginPaintStroke();
    paintAt(10.2, 10.2);
    expect(S.tiles[idx(10, 10)]).toBe(Tile.BRIDGE_WATER);
    expect(S.cash).toBe(20_000 - TINFO[Tile.BRIDGE_WATER].cost);

    beginPaintStroke();
    paintAt(11.2, 10.2);
    expect(S.tiles[idx(11, 10)]).toBe(Tile.BRIDGE_STREAM);
    expect(S.cash).toBe(20_000 - TINFO[Tile.BRIDGE_WATER].cost - TINFO[Tile.BRIDGE_STREAM].cost);
  });

  it.each([
    [Tile.BRIDGE_WATER, Tile.WATER],
    [Tile.BRIDGE_STREAM, Tile.STREAM],
  ] as const)('bulldozes %s back to its underlying terrain', (bridge, underlying) => {
    S.tiles[idx(12, 12)] = bridge;
    S.tool = 'dozer';
    beginPaintStroke();
    paintAt(12.2, 12.2);

    expect(S.tiles[idx(12, 12)]).toBe(underlying);
    expect(S.cash).toBe(19_990);
  });

  it('keeps facilities connected across both bridge types', () => {
    S.tiles[idx(2, 5)] = Tile.PATH;
    S.tiles[idx(2, 6)] = Tile.BRIDGE_WATER;
    S.tiles[idx(2, 7)] = Tile.BRIDGE_STREAM;
    S.tiles[idx(2, 8)] = Tile.PATH;
    rebuildStatics();

    expect(caches.pathConnected).toEqual(new Set(['2,5', '2,6', '2,7', '2,8']));
  });

  it('keeps the level water basin pinned beneath a bridge deck', () => {
    S.tiles[idx(20, 20)] = Tile.BRIDGE_WATER;
    rebuildStatics();
    S.tool = 'raise';
    beginPaintStroke();
    paintAt(20.2, 20.2);

    expect(S.elevC[idxC(20, 20)]).toBe(0);
    expect(S.cash).toBe(20_000);
  });

  it('aligns consecutive decks with their path network', () => {
    S.tiles[idx(9, 10)] = Tile.PATH;
    S.tiles[idx(10, 10)] = Tile.BRIDGE_WATER;
    S.tiles[idx(11, 10)] = Tile.BRIDGE_WATER;
    expect(bridgeAxisAt(S.tiles, 10, 10)).toBe('x');
    expect(bridgeAxisAt(S.tiles, 11, 10)).toBe('x');

    S.tiles.fill(Tile.ROUGH);
    S.tiles[idx(14, 9)] = Tile.PATH;
    S.tiles[idx(14, 10)] = Tile.BRIDGE_STREAM;
    S.tiles[idx(14, 11)] = Tile.PATH;
    expect(bridgeAxisAt(S.tiles, 14, 10)).toBe('y');
  });

  it('preserves explicit corner and T-junction openings', () => {
    S.tiles[idx(9, 10)] = Tile.PATH;
    S.tiles[idx(10, 10)] = Tile.BRIDGE_WATER;
    S.tiles[idx(10, 11)] = Tile.BRIDGE_WATER;
    expect(bridgeConnectionsAt(S.tiles, 10, 10)).toEqual({ west: true, east: false, north: false, south: true });

    S.tiles[idx(11, 10)] = Tile.PATH;
    expect(bridgeConnectionsAt(S.tiles, 10, 10)).toEqual({ west: true, east: true, north: false, south: true });
  });

  it('uses the visible corner deck footprint for recoverable lies and exposed hazards', () => {
    S.tiles[idx(9, 10)] = Tile.PATH;
    S.tiles[idx(10, 9)] = Tile.PATH;
    S.tiles[idx(10, 10)] = Tile.BRIDGE_WATER;

    expect(isPointOnBridgeDeck(S.tiles, 10.08, 10.5)).toBe(true);
    expect(isPointOnBridgeDeck(S.tiles, 10.5, 10.08)).toBe(true);
    expect(lieOf(10.08, 10.5)).toBe('bridge');
    expect(lieOf(10.5, 10.08)).toBe('bridge');
    expect(isPointOnBridgeDeck(S.tiles, 10.9, 10.9)).toBe(false);
    expect(lieOf(10.9, 10.9)).toBe('water');

    S.tiles[idx(10, 10)] = Tile.BRIDGE_STREAM;
    expect(lieOf(10.9, 10.9)).toBe('stream');
  });

  it('does not seed swimming ducks on water bridge tiles', () => {
    S.tiles.fill(Tile.BRIDGE_WATER);
    rebuildStatics();

    expect(caches.wildlife.some((animal) => animal.kind === 'duck')).toBe(false);
    expect(caches.waterTiles).toHaveLength(W * H);
  });
});
