import { H, PARCEL_H, PARCEL_W, PW, W } from './constants';
import { Tile } from './types';
import type { GameState } from './types';
import { clamp } from './rng';
import { isBridgeTile, isStreamBackedTile, isWaterBackedTile } from './bridges';

export type RoutingOverlayMode = 'course' | 'aura' | 'homeValue';
type RoutingState = Pick<GameState, 'tiles' | 'elevC' | 'owned' | 'holes' | 'buildings' | 'golfers'>;

const terrainAura: Partial<Record<Tile, number>> = {
  [Tile.FLOWER]: 0.24,
  [Tile.TREE]: 0.12,
  [Tile.WATER]: 0.14,
  [Tile.STREAM]: 0.1,
  [Tile.BRIDGE_WATER]: 0.14,
  [Tile.BRIDGE_STREAM]: 0.1,
  [Tile.ROCK]: -0.08,
  [Tile.BRUSH]: -0.1,
  [Tile.POT_BUNKER]: -0.12,
  [Tile.DEEP_ROUGH]: -0.04,
};

const buildingAura: Partial<Record<GameState['buildings'][number]['kind'], number>> = {
  landmark: 1,
  flowerbed: 0.78,
  scenicbridge: 0.62,
  bench: 0.28,
  ballwasher: 0.2,
  hotel: 0.25,
  tennis: 0.25,
};

const tileIndex = (x: number, y: number) => y * W + x;
const cornerIndex = (x: number, y: number) => y * (W + 1) + x;

/** Manual p.23 Aura view: mood-altering scenery glows positively, while active
 * unhappy-player trouble spots and harsh terrain register negatively. */
export function auraAt(state: RoutingState, x: number, y: number): number {
  let score = 0;
  for (let oy = -5; oy <= 5; oy++) {
    for (let ox = -5; ox <= 5; ox++) {
      const nx = x + ox;
      const ny = y + oy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const distance = Math.hypot(ox, oy);
      if (distance > 5.5) continue;
      score += (terrainAura[state.tiles[tileIndex(nx, ny)] as Tile] ?? 0) * (1 - distance / 6) * 0.34;
    }
  }
  for (const building of state.buildings) {
    const strength = buildingAura[building.kind] ?? 0;
    if (!strength) continue;
    const distance = Math.hypot(x + 0.5 - (building.x + building.w / 2), y + 0.5 - (building.y + building.h / 2));
    if (distance < 10) score += strength * (1 - distance / 10);
  }
  for (const golfer of state.golfers) {
    if (golfer.mood >= 0) continue;
    const distance = Math.hypot(x + 0.5 - golfer.x, y + 0.5 - golfer.y);
    if (distance < 7) score += clamp(golfer.mood / 5, -1, 0) * (1 - distance / 7);
  }
  return clamp(score, -1, 1);
}

function tileBlocked(state: RoutingState, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= W || y >= H) return true;
  const parcel = Math.floor(y / PARCEL_H) * PW + Math.floor(x / PARCEL_W);
  if (!state.owned[parcel]) return true;
  const terrain = state.tiles[tileIndex(x, y)] as Tile;
  if (!isBridgeTile(terrain) && [Tile.WATER, Tile.STREAM, Tile.POT_BUNKER, Tile.ROCK, Tile.BRUSH].includes(terrain)) return true;
  const key = `${x},${y}`;
  if (state.holes.some((hole) => hole.teeTiles.includes(key) || hole.greenTiles.includes(key))) return true;
  return state.buildings.some((building) => building.kind !== 'buildinglot' && x >= building.x && y >= building.y && x < building.x + building.w && y < building.y + building.h);
}

/** Manual p.23 Home Value view. Zero means black/impossible; higher values become
 * progressively brighter green and directly reflect the qualities lot income uses. */
export function homeValueAt(state: RoutingState, x: number, y: number): number {
  if (tileBlocked(state, x, y)) return 0;
  let value = 0.22;
  const centreHeight = (
    state.elevC[cornerIndex(x, y)] + state.elevC[cornerIndex(x + 1, y)] +
    state.elevC[cornerIndex(x, y + 1)] + state.elevC[cornerIndex(x + 1, y + 1)]
  ) / 4;
  for (let oy = -7; oy <= 7; oy++) {
    for (let ox = -7; ox <= 7; ox++) {
      const nx = x + ox;
      const ny = y + oy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const distance = Math.hypot(ox, oy);
      if (distance > 7.5) continue;
      const falloff = (1 - distance / 8) * 0.035;
      const terrain = state.tiles[tileIndex(nx, ny)] as Tile;
      if (isWaterBackedTile(terrain) || isStreamBackedTile(terrain)) value += falloff * 2.1;
      else if (terrain === Tile.TREE) value += falloff * 1.2;
      else if (terrain === Tile.FLOWER) value += falloff * 1.6;
      else if (terrain === Tile.GREEN || terrain === Tile.TEE) value += falloff * 0.9;
      else if (terrain === Tile.POT_BUNKER || terrain === Tile.BRUSH || terrain === Tile.ROCK) value -= falloff * 1.2;
    }
  }
  for (const hole of state.holes) {
    const distance = Math.hypot(x + 0.5 - hole.cup.x, y + 0.5 - hole.cup.y);
    if (distance < 12) value += (hole.beauty * 0.16 + hole.interest * 0.1) * (1 - distance / 12);
  }
  for (const building of state.buildings) {
    const distance = Math.hypot(x + 0.5 - (building.x + building.w / 2), y + 0.5 - (building.y + building.h / 2));
    if (distance >= 12) continue;
    const beauty = building.kind === 'landmark' ? 0.32 : building.kind === 'flowerbed' ? 0.22 : building.kind === 'scenicbridge' ? 0.16 : 0;
    value += beauty * (1 - distance / 12);
  }
  const east = state.elevC[cornerIndex(Math.min(W, x + 1), y)];
  const south = state.elevC[cornerIndex(x, Math.min(H, y + 1))];
  value -= (Math.abs(centreHeight - east) + Math.abs(centreHeight - south)) * 0.035;
  return clamp(value, 0.03, 1);
}

export function buildRoutingHeatmap(state: RoutingState, mode: Exclude<RoutingOverlayMode, 'course'>): Float32Array {
  const values = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) values[tileIndex(x, y)] = mode === 'aura' ? auraAt(state, x, y) : homeValueAt(state, x, y);
  return values;
}
