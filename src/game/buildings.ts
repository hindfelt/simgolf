import { CH } from './constants';
import { Tile } from './types';
import type { Building, BuildingKind, CourseTheme, FacilityBranch, Vec } from './types';
import { S, caches } from './state';
import { inb, tileAt, clamp, tileFlat, cornerH, ownedAt } from './rng';
import { homeValueAt } from './routing';

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
  landmark: { name: 'Landmark', cost: 650, w: 1, h: 1, wall: '#c9ced4', roof: '#8f959c', short: '🗿', blurb: 'A grand stone monument. The course centrepiece.' },
  ballwasher: { name: 'Ball Washer', cost: 90, w: 1, h: 1, wall: '#8a8f96', roof: '#5d6166', short: '🧽', blurb: 'A tee-side courtesy stand. Tiny mood lift nearby.' },
  scenicbridge: { name: 'Scenic Bridge', cost: 380, w: 1, h: 1, wall: '#8a5a30', roof: '#6e4523', short: '🌉', blurb: 'A picturesque footbridge overlook. Golfers love the view.' },
  buildinglot: { name: 'Building Lot', cost: 900, w: 2, h: 2, wall: '#d9d2c2', roof: '#8a7f68', short: '🏡', blurb: 'Home income follows Routing Map value: water, trees and fun holes pay.' },
};

/**
 * Manual (p.9): "The Snack Bar is replaced by the Pub on Links courses. The Tennis Court
 * is replaced by the Stable on Links courses, Spa on Desert courses and Swim Club on Tropical
 * courses. The Marina is replaced by the Church on Links courses and Helipad on Desert courses.
 * The Airstrip is replaced by the Castle on Links courses, the Casino on Desert courses and the
 * Theme Park on Tropical courses." Name/blurb/icon only — cost/footprint/effect and in-world
 * building art are unchanged (a full per-theme sprite redesign is out of scope for this pass).
 */
export const THEME_BUILDING_NAMES: Partial<Record<CourseTheme, Partial<Record<BuildingKind, { name: string; short: string; blurb: string }>>>> = {
  links: {
    snackbar: { name: 'Pub', short: '🍺', blurb: 'A cozy coastal pub. Keeps moods up.' },
    tennis: { name: 'Stable', short: '🐴', blurb: 'Horseback rides along the links. Golfers arrive in a good mood.' },
    marina: { name: 'Church', short: '⛪', blurb: 'A quiet stone chapel. Boosts building-lot income + green fees.' },
    airstrip: { name: 'Castle', short: '🏰', blurb: 'A private castle keep. Raises every green fee.' },
  },
  desert: {
    tennis: { name: 'Spa', short: '💆', blurb: 'A desert spa retreat. Golfers arrive in a good mood.' },
    marina: { name: 'Helipad', short: '🚁', blurb: 'Private helicopter pad. Boosts building-lot income + green fees.' },
    airstrip: { name: 'Casino', short: '🎰', blurb: 'A high-stakes casino. Raises every green fee.' },
  },
  tropical: {
    tennis: { name: 'Swim Club', short: '🏊', blurb: 'A lagoon-side swim club. Golfers arrive in a good mood.' },
    airstrip: { name: 'Theme Park', short: '🎢', blurb: 'A private theme park. Raises every green fee.' },
  },
};

/** `CATALOG[kind]` with the active theme's name/short/blurb reskin applied, if any (cost/footprint/effect are theme-independent). */
export function themedDef(kind: BuildingKind, theme: CourseTheme): BuildingDef {
  const ov = THEME_BUILDING_NAMES[theme]?.[kind];
  return ov ? { ...CATALOG[kind], ...ov } : CATALOG[kind];
}

/* ---------------- facility upgrade progression ---------------- */

export const UPGRADEABLE_FACILITIES: BuildingKind[] = [
  'proshop',
  'snackbar',
  'drivingrange',
  'puttinggreen',
  'cartgarage',
  'hotel',
  'tennis',
  'marina',
  'airstrip',
];
const UPGRADEABLE_SET = new Set<BuildingKind>(UPGRADEABLE_FACILITIES);

interface UpgradeFlavor {
  service: string;
  prestige: string;
  serviceEffect: string;
  prestigeEffect: string;
}

const UPGRADE_FLAVOR: Partial<Record<BuildingKind, UpgradeFlavor>> = {
  proshop: { service: 'Custom Fitting', prestige: "Members' Boutique", serviceEffect: 'Stronger golfer-skill amenity', prestigeEffect: 'Premium retail lifts mood and fees' },
  snackbar: { service: 'Fast Service', prestige: 'Signature Dining', serviceEffect: 'Larger hunger and thirst service radius', prestigeEffect: 'Dining experience lifts mood and fees' },
  drivingrange: { service: 'Performance Bays', prestige: 'Golf Academy', serviceEffect: 'Stronger practice amenity', prestigeEffect: 'Elite coaching adds prestige and fees' },
  puttinggreen: { service: 'Short-Game Lab', prestige: 'Garden Club', serviceEffect: 'Stronger short-game amenity', prestigeEffect: 'Landscaped practice club lifts prestige' },
  cartgarage: { service: 'Expanded Fleet', prestige: 'Concierge Carts', serviceEffect: 'Faster movement around the course', prestigeEffect: 'Comfortable transport lifts guest mood' },
  hotel: { service: 'Guest Wing', prestige: 'Spa Suites', serviceEffect: 'Greater rest coverage and capacity', prestigeEffect: 'Luxury suites strongly lift arrival mood' },
  tennis: { service: 'Sports Centre', prestige: 'Country Club', serviceEffect: 'More recreation for every guest', prestigeEffect: 'Exclusive leisure strongly lifts prestige' },
  marina: { service: 'Harbour Services', prestige: 'Waterfront Club', serviceEffect: 'Greater property-income multiplier', prestigeEffect: 'Luxury arrivals strongly lift green fees' },
  airstrip: { service: 'Flight Services', prestige: 'Private Lounge', serviceEffect: 'More reliable high-value arrivals', prestigeEffect: 'VIP gateway strongly lifts green fees' },
};

export interface FacilityUpgradeOption {
  branch: FacilityBranch;
  targetLevel: 2 | 3;
  name: string;
  cost: number;
  duration: number;
  summary: string;
  lockedReason: string | null;
}

export function isUpgradeableFacility(kind: BuildingKind): boolean {
  return UPGRADEABLE_SET.has(kind);
}

export function facilityLevel(b: Building): 1 | 2 | 3 {
  if (!isUpgradeableFacility(b.kind)) return 1;
  return clamp(Math.trunc(b.level ?? 1), 1, 3) as 1 | 2 | 3;
}

export function facilityOperational(b: Building): boolean {
  return b.open && !b.upgrade;
}

export function facilityDisplayName(b: Building, theme: CourseTheme): string {
  const base = themedDef(b.kind, theme).name;
  const level = facilityLevel(b);
  if (level === 1 || !b.branch || !UPGRADE_FLAVOR[b.kind]) return base;
  const focus = UPGRADE_FLAVOR[b.kind]![b.branch];
  return level === 2 ? `${base} · ${focus}` : `${base} · Premier ${focus}`;
}

const round50 = (value: number) => Math.ceil(value / 50) * 50;

export function facilityUpgradeCost(kind: BuildingKind, targetLevel: 2 | 3, branch: FacilityBranch): number {
  const costMul = targetLevel === 2 ? (branch === 'service' ? 0.55 : 0.7) : branch === 'service' ? 0.9 : 1.1;
  return round50(CATALOG[kind].cost * costMul);
}

export function facilityUpgradeInvestment(b: Building): number {
  if (!isUpgradeableFacility(b.kind) || !b.branch) return 0;
  const level = facilityLevel(b);
  let total = level >= 2 ? facilityUpgradeCost(b.kind, 2, b.branch) : 0;
  if (level >= 3) total += facilityUpgradeCost(b.kind, 3, b.branch);
  return total;
}

export function facilityUpgradeOptions(b: Building, holeCount = S.holes.length, reputation = S.rep): FacilityUpgradeOption[] {
  if (!isUpgradeableFacility(b.kind) || b.upgrade || facilityLevel(b) >= 3) return [];
  const level = facilityLevel(b);
  const targetLevel = (level + 1) as 2 | 3;
  const branches: FacilityBranch[] = level === 1 ? ['service', 'prestige'] : [b.branch ?? 'service'];
  return branches.map((branch) => {
    const flavor = UPGRADE_FLAVOR[b.kind]!;
    const cost = facilityUpgradeCost(b.kind, targetLevel, branch);
    const duration = targetLevel === 2 ? 14 : 24;
    let lockedReason: string | null = null;
    if (!b.open) lockedReason = 'Connect this facility to the clubhouse first.';
    else if (targetLevel === 2 && holeCount < 3) lockedReason = 'Build 3 holes to unlock level II.';
    else if (targetLevel === 2 && reputation < 2.5) lockedReason = 'Reach 2.5★ reputation to unlock level II.';
    else if (targetLevel === 3 && holeCount < 6) lockedReason = 'Build 6 holes to unlock level III.';
    else if (targetLevel === 3 && reputation < 3.5) lockedReason = 'Reach 3.5★ reputation to unlock level III.';
    const focus = flavor[branch];
    return {
      branch,
      targetLevel,
      name: targetLevel === 2 ? focus : `Premier ${focus}`,
      cost,
      duration,
      summary: branch === 'service' ? flavor.serviceEffect : flavor.prestigeEffect,
      lockedReason,
    };
  });
}

/** Ongoing operating cost for completed upgrades. Disconnected facilities still cost
 * money to own; active construction is charged through its up-front project cost. */
export function facilityMaintenancePerSec(): number {
  let total = 0;
  for (const b of S.buildings) total += facilityMaintenanceFor(b);
  return total;
}

export function facilityMaintenanceFor(b: Building): number {
  const level = facilityLevel(b);
  if (!isUpgradeableFacility(b.kind) || level <= 1) return 0;
  const branchMul = b.branch === 'prestige' ? 1.22 : 1;
  return (CATALOG[b.kind].cost / 9000) * (level - 1) * branchMul;
}

export function upgradedFacilityCount(): number {
  return S.buildings.filter((b) => isUpgradeableFacility(b.kind) && facilityLevel(b) > 1).length;
}

export function upgradingFacilityCount(): number {
  return S.buildings.filter((b) => !!b.upgrade).length;
}

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
      // Facilities need genuinely cleared ground. This also prevents trees, boulders
      // and deep hazards from rendering through a newly placed building.
      if (t !== Tile.ROUGH && t !== Tile.FAIR && t !== Tile.FIRM_FAIR && t !== Tile.FLOWER) return false;
      if (!tileFlat(tx, ty) || cornerH(tx, ty) !== e0) return false; // buildings need one flat level
      const k = key(tx, ty);
      if (locked.has(k) || occ.has(k) || chSet.has(k)) return false;
    }
  return true;
}

/** BFS over connected pathway tiles seeded from the clubhouse. */
export function recomputeConnectivity() {
  const connected = new Set<string>();
  const isPath = (x: number, y: number) => inb(x, y) && [Tile.PATH, Tile.BRIDGE_WATER, Tile.BRIDGE_STREAM].includes(tileAt(x, y));
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
    if (b.kind === 'bench' || b.kind === 'flowerbed' || b.kind === 'landmark' || b.kind === 'ballwasher' || b.kind === 'scenicbridge') {
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

/* ---------------- gameplay effects (connected, completed facilities only) ---------------- */
function openFacilities(kind?: BuildingKind): Building[] {
  return S.buildings.filter((b) => facilityOperational(b) && (kind === undefined || b.kind === kind));
}

/** Service upgrades emphasize the primary operational effect; Prestige upgrades trade
 * some throughput for stronger mood/fee value. */
function primaryMul(b: Building): number {
  const steps = facilityLevel(b) - 1;
  return 1 + steps * (b.branch === 'service' ? 0.38 : 0.2);
}

function prestigeMul(b: Building): number {
  const steps = facilityLevel(b) - 1;
  return 1 + steps * (b.branch === 'prestige' ? 0.5 : 0.18);
}

/** Cumulative green-fee multiplier from airstrips + marinas. */
export function feeMultiplier(): number {
  let bonus = 0;
  for (const b of openFacilities()) {
    if (b.kind === 'airstrip') bonus += 0.05 * (b.branch === 'prestige' ? prestigeMul(b) : primaryMul(b));
    if (b.kind === 'marina') bonus += 0.03 * (b.branch === 'prestige' ? prestigeMul(b) : primaryMul(b));
    if (b.branch === 'prestige') bonus += 0.003 * (facilityLevel(b) - 1);
  }
  return clamp(1 + bonus, 1, 2.2);
}

/** Extra starting mood for arriving golfers (tennis court, hotel). */
export function spawnMoodBonus(): number {
  let mood = 0;
  for (const b of [...openFacilities('tennis'), ...openFacilities('hotel')]) {
    const base = b.kind === 'tennis' ? 0.8 : 0.5;
    mood += base * (b.branch === 'prestige' ? prestigeMul(b) : primaryMul(b));
  }
  return clamp(mood, 0, 3.4);
}

/** Golfer walk-speed multiplier from cart garages. */
export function moveSpeedMul(): number {
  let bonus = 0;
  for (const b of openFacilities('cartgarage')) bonus += 0.28 * primaryMul(b);
  return clamp(1 + bonus, 1, 2.05);
}

/** Per-hole mood bonus from skill/comfort amenities. Snack bars satisfy hunger/thirst
 *  by proximity instead (see `facilityNeedBoost`) so placement near holes matters. */
export function amenityMood(): number {
  const weight: Partial<Record<BuildingKind, number>> = {
    proshop: 1,
    drivingrange: 1,
    puttinggreen: 1,
    bench: 1,
    flowerbed: 1,
    landmark: 1.5,
    ballwasher: 0.5,
    scenicbridge: 1.2,
    snackbar: 0.35,
    hotel: 0.45,
    tennis: 0.55,
  };
  let comfort = 0;
  for (const b of openFacilities()) {
    const base = weight[b.kind] ?? 0;
    if (!base) continue;
    comfort += base * (b.branch === 'prestige' ? prestigeMul(b) : primaryMul(b));
  }
  return clamp(comfort * 0.14, 0, 2.1);
}

const NEED_RADIUS = 12; // tiles — how far a facility's help reaches

/** 0..1: how well an open facility of one of `kinds` covers a spot, 1 = right on top of it. */
export function facilityNeedBoost(pos: Vec, kinds: BuildingKind[]): number {
  let best = 0;
  for (const b of S.buildings) {
    if (!facilityOperational(b) || !kinds.includes(b.kind)) continue;
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const d = Math.hypot(pos.x - cx, pos.y - cy);
    const steps = facilityLevel(b) - 1;
    const radius = NEED_RADIUS * (1 + steps * (b.branch === 'service' ? 0.2 : 0.1));
    const strength = clamp(1 - d / radius, 0, 1) * (1 + steps * (b.branch === 'service' ? 0.18 : 0.08));
    best = Math.max(best, strength);
  }
  return clamp(best, 0, 1);
}

/** Passive $/sec from building lots (marina amplifies, developed homes pay more). */
export function passiveIncomePerSec(): number {
  let marinaBonus = 0;
  for (const b of openFacilities('marina')) marinaBonus += 0.4 * primaryMul(b);
  const marinaMul = 1 + marinaBonus;
  let base = 0;
  for (const b of S.buildings) {
    if (!b.open || b.kind !== 'buildinglot') continue;
    const siteValue = homeValueAt(S, Math.floor(b.x + b.w / 2), Math.floor(b.y + b.h / 2));
    base += [0.4, 1.6, 3.2][clamp(b.stage ?? 0, 0, 2)] * (0.55 + siteValue * 1.45);
  }
  return base * marinaMul;
}

export function openFacilityCount(): number {
  return openFacilities().length;
}
