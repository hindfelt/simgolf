import { CH } from './constants';
import { Tile } from './types';
import type { Building, BuildingKind } from './types';
import { S, caches } from './state';
import { inb, tileAt, clamp, tileFlat, cornerH, ownedAt } from './rng';

export interface BuildingDef {
  name: string;
  cost: number;
  w: number;
  h: number;
  wall: string;
  roof: string;
  short: string; // toolbar/label glyph
  blurb: string;
}

/** Catalog. Footprints are in tiles. Effects are applied in engine + here. */
export const CATALOG: Record<BuildingKind, BuildingDef> = {
  proshop: { name: 'Pro Shop', cost: 1800, w: 3, h: 2, wall: '#d8cdb0', roof: '#3f6f9c', short: '🛍️', blurb: 'Accuracy amenity. Lifts play + green fees.' },
  drivingrange: { name: 'Driving Range', cost: 2800, w: 6, h: 3, wall: '#cfe0a8', roof: '#6a8f3c', short: '🏌️', blurb: 'Length amenity. Happier big hitters.' },
  puttinggreen: { name: 'Putting Green', cost: 1600, w: 3, h: 3, wall: '#8fe0a2', roof: '#4aa564', short: '🥏', blurb: 'Imagination amenity. Sharper short game.' },
  snackbar: { name: 'Snack Bar', cost: 1000, w: 2, h: 2, wall: '#efc9a0', roof: '#c25a3a', short: '🌭', blurb: 'Feeds hungry golfers. Keeps moods up.' },
  cartgarage: { name: 'Cart Garage', cost: 1800, w: 3, h: 2, wall: '#c9c2b4', roof: '#5d6d7e', short: '🛺', blurb: 'Golfers move faster around the course.' },
  hotel: { name: 'Resort Hotel', cost: 4800, w: 4, h: 3, wall: '#e7dcc0', roof: '#9a3f5c', short: '🏨', blurb: 'Well-rested golfers stay happy longer.' },
  tennis: { name: 'Tennis Court', cost: 1900, w: 3, h: 2, wall: '#7fae5b', roof: '#2f6f3c', short: '🎾', blurb: 'Golfers arrive in a good mood.' },
  marina: { name: 'Marina', cost: 3800, w: 5, h: 3, wall: '#bcd7e8', roof: '#3679b8', short: '⛵', blurb: 'Boosts building-lot income + green fees.' },
  airstrip: { name: 'Airstrip', cost: 6800, w: 8, h: 3, wall: '#c7ccd2', roof: '#7a5233', short: '✈️', blurb: 'Private runway. Raises every green fee.' },
  bench: { name: 'Bench', cost: 120, w: 1, h: 1, wall: '#a9825a', roof: '#7a5233', short: '🪑', blurb: 'A rest stop. Small mood lift nearby.' },
  flowerbed: { name: 'Flower Bed', cost: 200, w: 1, h: 1, wall: '#f2a7c3', roof: '#e78ad1', short: '🌷', blurb: 'Pure beauty. Lifts spirits.' },
  buildinglot: { name: 'Building Lot', cost: 900, w: 2, h: 2, wall: '#d9d2c2', roof: '#8a7f68', short: '🏡', blurb: 'Sells homes: steady passive income.' },
};

/** Clubhouse footprint tiles (2x2 around the spawn point). */
export const CH_TILES: [number, number][] = [
  [Math.floor(CH.x) - 1, Math.floor(CH.y) - 1],
  [Math.floor(CH.x), Math.floor(CH.y) - 1],
  [Math.floor(CH.x) - 1, Math.floor(CH.y)],
  [Math.floor(CH.x), Math.floor(CH.y)],
];

const key = (x: number, y: number) => x + ',' + y;

export function buildingTiles(b: Building): string[] {
  const out: string[] = [];
  for (let dy = 0; dy < b.h; dy++) for (let dx = 0; dx < b.w; dx++) out.push(key(b.x + dx, b.y + dy));
  return out;
}

/** All tiles occupied by placed buildings. */
export function occupiedTiles(): Set<string> {
  const set = new Set<string>();
  for (const b of S.buildings) for (const k of buildingTiles(b)) set.add(k);
  return set;
}

/** Can a `kind` be placed with top-left at (x,y)? */
export function canPlace(kind: BuildingKind, x: number, y: number, locked: Set<string>, occ: Set<string>): boolean {
  const def = CATALOG[kind];
  const chSet = new Set(CH_TILES.map(([cx, cy]) => key(cx, cy)));
  const e0 = cornerH(x, y);
  for (let dy = 0; dy < def.h; dy++)
    for (let dx = 0; dx < def.w; dx++) {
      const tx = x + dx;
      const ty = y + dy;
      if (!inb(tx, ty) || !ownedAt(tx, ty)) return false;
      const t = tileAt(tx, ty);
      if (t === Tile.WATER || t === Tile.PATH) return false;
      if (!tileFlat(tx, ty) || cornerH(tx, ty) !== e0) return false; // buildings need one flat level
      const k = key(tx, ty);
      if (locked.has(k) || occ.has(k) || chSet.has(k)) return false;
    }
  return true;
}

/** BFS over connected pathway tiles seeded from the clubhouse. */
export function recomputeConnectivity() {
  const connected = new Set<string>();
  const isPath = (x: number, y: number) => inb(x, y) && tileAt(x, y) === Tile.PATH;
  const queue: [number, number][] = [];
  const seed = (x: number, y: number) => {
    if (isPath(x, y) && !connected.has(key(x, y))) {
      connected.add(key(x, y));
      queue.push([x, y]);
    }
  };
  // seed from tiles orthogonally adjacent to the clubhouse footprint
  for (const [cx, cy] of CH_TILES) {
    seed(cx + 1, cy);
    seed(cx - 1, cy);
    seed(cx, cy + 1);
    seed(cx, cy - 1);
  }
  while (queue.length) {
    const [x, y] = queue.shift()!;
    seed(x + 1, y);
    seed(x - 1, y);
    seed(x, y + 1);
    seed(x, y - 1);
  }
  caches.pathConnected = connected;

  // a building is open if its footprint touches the clubhouse or a connected path
  const chSet = new Set(CH_TILES.map(([cx, cy]) => key(cx, cy)));
  for (const b of S.buildings) {
    if (b.kind === 'bench' || b.kind === 'flowerbed') {
      b.open = true; // scenery works anywhere
      continue;
    }
    b.open = buildingTouchesNetwork(b, connected, chSet);
  }
}

/** True only for an orthogonal edge connection; diagonal corner contact does not count. */
export function buildingTouchesNetwork(b: Building, connected: Set<string>, clubhouse = new Set<string>()): boolean {
  const touches = (x: number, y: number) => connected.has(key(x, y)) || clubhouse.has(key(x, y));
  for (let dx = 0; dx < b.w; dx++) {
    if (touches(b.x + dx, b.y - 1) || touches(b.x + dx, b.y + b.h)) return true;
  }
  for (let dy = 0; dy < b.h; dy++) {
    if (touches(b.x - 1, b.y + dy) || touches(b.x + b.w, b.y + dy)) return true;
  }
  return false;
}

/* ---------------- gameplay effects (open buildings only) ---------------- */
function countOpen(kind: BuildingKind): number {
  let n = 0;
  for (const b of S.buildings) if (b.open && b.kind === kind) n++;
  return n;
}

/** Cumulative green-fee multiplier from airstrips + marinas. */
export function feeMultiplier(): number {
  return clamp(1 + countOpen('airstrip') * 0.05 + countOpen('marina') * 0.03, 1, 2.2);
}

/** Extra starting mood for arriving golfers (tennis court, hotel). */
export function spawnMoodBonus(): number {
  return clamp(countOpen('tennis') * 0.8 + countOpen('hotel') * 0.5, 0, 2.4);
}

/** Golfer walk-speed multiplier from cart garages. */
export function moveSpeedMul(): number {
  return clamp(1 + countOpen('cartgarage') * 0.28, 1, 1.7);
}

/** Per-hole mood bonus from skill/comfort/beauty amenities. */
export function amenityMood(): number {
  const comfort = countOpen('proshop') + countOpen('drivingrange') + countOpen('puttinggreen') + countOpen('snackbar') + countOpen('bench') + countOpen('flowerbed');
  return clamp(comfort * 0.14, 0, 1.4);
}

/** Passive $/sec from building lots (marina amplifies, developed homes pay more). */
export function passiveIncomePerSec(): number {
  const marinaMul = 1 + countOpen('marina') * 0.4;
  let base = 0;
  for (const b of S.buildings)
    if (b.open && b.kind === 'buildinglot') base += [0.4, 1.6, 3.2][clamp(b.stage ?? 0, 0, 2)];
  return base * marinaMul;
}

export function openFacilityCount(): number {
  let n = 0;
  for (const b of S.buildings) if (b.open) n++;
  return n;
}
