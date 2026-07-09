import { W, H, PARCEL_W, PARCEL_H, PW } from './constants';
import { Tile } from './types';
import type { Vec, LieKey } from './types';
import { S } from './state';

export const idx = (x: number, y: number) => y * W + x;
export const inb = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;
export const tileAt = (x: number, y: number): number => (inb(x, y) ? S.tiles[idx(x, y)] : Tile.ROUGH);

/* ---- land ownership ---- */
export const parcelIdx = (x: number, y: number) => Math.floor(y / PARCEL_H) * PW + Math.floor(x / PARCEL_W);
export const ownedAt = (x: number, y: number): boolean => inb(x, y) && S.owned[parcelIdx(x, y)] === 1;

/* ---- corner heightfield ---- */
export const idxC = (x: number, y: number) => y * (W + 1) + x;
export const cornerH = (x: number, y: number): number => {
  const cx = x < 0 ? 0 : x > W ? W : x;
  const cy = y < 0 ? 0 : y > H ? H : y;
  return S.elevC[idxC(cx, cy)];
};
/** Smooth terrain height at world coords (bilinear over corner heights). */
export const elevAt = (x: number, y: number): number => {
  const fx = x < 0 ? 0 : x > W ? W : x;
  const fy = y < 0 ? 0 : y > H ? H : y;
  const x0 = Math.min(Math.floor(fx), W - 1);
  const y0 = Math.min(Math.floor(fy), H - 1);
  const tx = fx - x0;
  const ty = fy - y0;
  const a = cornerH(x0, y0) + (cornerH(x0 + 1, y0) - cornerH(x0, y0)) * tx;
  const b = cornerH(x0, y0 + 1) + (cornerH(x0 + 1, y0 + 1) - cornerH(x0, y0 + 1)) * tx;
  return a + (b - a) * ty;
};
/** Is the tile's surface level? (all four corners equal) */
export const tileFlat = (x: number, y: number): boolean => {
  const h = cornerH(x, y);
  return cornerH(x + 1, y) === h && cornerH(x, y + 1) === h && cornerH(x + 1, y + 1) === h;
};
export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const pick = <T>(arr: T[]): T => arr[(Math.random() * arr.length) | 0];
/** ~[-1,1] bell curve. */
export const gauss = () => (Math.random() + Math.random() + Math.random()) / 1.5 - 1;
export const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
export const fmt$ = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

export function hash2(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) ^ 0x5bf03635;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

export function lieOf(x: number, y: number): LieKey {
  const t = tileAt(Math.floor(x), Math.floor(y));
  return t === Tile.FAIR ? 'fair'
    : t === Tile.GREEN ? 'green'
    : t === Tile.TEE ? 'tee'
    : t === Tile.SAND ? 'sand'
    : t === Tile.TREE ? 'tree'
    : t === Tile.WATER ? 'water'
    : t === Tile.FLOWER ? 'flower'
    : 'rough';
}
