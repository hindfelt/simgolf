import { H, W } from './constants';

export interface TileCoord {
  x: number;
  y: number;
}

export const tileKey = ({ x, y }: TileCoord): string => `${x},${y}`;

/** The 2x2 tee pad centred on the first point selected by the player. */
export function teeFootprint(tx: number, ty: number): TileCoord[] {
  const tiles: TileCoord[] = [];
  for (let dy = 0; dy <= 1; dy++) {
    for (let dx = 0; dx <= 1; dx++) tiles.push({ x: tx + dx, y: ty + dy });
  }
  return tiles;
}

/** The rounded green footprint created around a new cup. */
export function greenFootprint(cx: number, cy: number): TileCoord[] {
  const tiles: TileCoord[] = [];
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (dx * dx + dy * dy <= 4.5) tiles.push({ x: cx + dx, y: cy + dy });
    }
  }
  return tiles;
}

export function footprintInBounds(tiles: TileCoord[]): boolean {
  return tiles.every(({ x, y }) => x >= 0 && y >= 0 && x < W && y < H);
}
