import { beforeEach, describe, expect, it } from 'vitest';
import { H, W } from './constants';
import { findPath, nearestDryGolferPoint } from './pathfind';
import { idx } from './rng';
import { S } from './state';
import { Tile } from './types';

describe('golfer pathfinding over water', () => {
  beforeEach(() => {
    S.tiles = new Uint8Array(W * H);
    S.tiles.fill(Tile.ROUGH);
    S.elevC = new Uint8Array((W + 1) * (H + 1));
  });

  function wall(tile: Tile) {
    for (let y = 0; y < H; y++) S.tiles[idx(10, y)] = tile;
  }

  it.each([Tile.WATER, Tile.STREAM])('treats a complete raw-water barrier as unreachable (%s)', (tile) => {
    wall(tile);

    expect(findPath({ x: 5.5, y: 5.5 }, { x: 15.5, y: 5.5 })).toBeNull();
  });

  it.each([Tile.BRIDGE_WATER, Tile.BRIDGE_STREAM])('crosses a raw-water barrier only at its bridge deck (%s)', (bridge) => {
    wall(bridge === Tile.BRIDGE_WATER ? Tile.WATER : Tile.STREAM);
    S.tiles[idx(10, 5)] = bridge;

    const path = findPath({ x: 5.5, y: 5.5 }, { x: 15.5, y: 5.5 });

    expect(path).not.toBeNull();
    expect(path).toContainEqual({ x: 10.5, y: 5.5 });
    expect(path!.every((point) => {
      const tile = S.tiles[idx(Math.floor(point.x), Math.floor(point.y))];
      return tile !== Tile.WATER && tile !== Tile.STREAM;
    })).toBe(true);
  });

  it('does not cut diagonally between blocked water corners', () => {
    S.tiles[idx(1, 0)] = Tile.WATER;
    S.tiles[idx(0, 1)] = Tile.STREAM;

    expect(findPath({ x: 0.5, y: 0.5 }, { x: 1.5, y: 1.5 })).toBeNull();
  });

  it('rejects raw-water endpoints and provides a separate safe dry relocation', () => {
    S.tiles[idx(5, 5)] = Tile.WATER;

    expect(findPath({ x: 5.5, y: 5.5 }, { x: 7.5, y: 5.5 })).toBeNull();
    expect(findPath({ x: 7.5, y: 5.5 }, { x: 5.5, y: 5.5 })).toBeNull();
    const repaired = nearestDryGolferPoint({ x: 5.5, y: 5.5 });
    expect(repaired).not.toBeNull();
    expect(S.tiles[idx(Math.floor(repaired!.x), Math.floor(repaired!.y))]).not.toBe(Tile.WATER);
  });

  it('rejects perpendicular side entry into an authored vertical bridge deck', () => {
    wall(Tile.WATER);
    for (let y = 4; y <= 6; y++) S.tiles[idx(10, y)] = Tile.BRIDGE_WATER;

    expect(findPath({ x: 5.5, y: 5.5 }, { x: 15.5, y: 5.5 })).toBeNull();
  });

  it('rejects a bridge segment that does not continuously cross the water', () => {
    for (let y = 0; y < H; y++) {
      S.tiles[idx(10, y)] = Tile.WATER;
      S.tiles[idx(11, y)] = Tile.WATER;
    }
    S.tiles[idx(10, 5)] = Tile.BRIDGE_WATER;

    expect(findPath({ x: 5.5, y: 5.5 }, { x: 15.5, y: 5.5 })).toBeNull();
  });

  it('crosses a continuous multi-tile bridge only along its connected deck', () => {
    for (let y = 0; y < H; y++) {
      S.tiles[idx(10, y)] = Tile.WATER;
      S.tiles[idx(11, y)] = Tile.WATER;
    }
    S.tiles[idx(10, 5)] = Tile.BRIDGE_WATER;
    S.tiles[idx(11, 5)] = Tile.BRIDGE_WATER;

    const path = findPath({ x: 5.5, y: 5.5 }, { x: 15.5, y: 5.5 });
    expect(path).not.toBeNull();
    expect(path).toContainEqual({ x: 10.5, y: 5.5 });
    expect(path).toContainEqual({ x: 11.5, y: 5.5 });
  });
});
