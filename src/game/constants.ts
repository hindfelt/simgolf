import { Tile } from './types';
import type { TileInfo, LieInfo, LieKey, CourseTheme } from './types';

export const W = 64;
export const H = 48;
export const TW = 36;
export const TH = 18;
export const HOLE_COST = 1000;
export const CH = { x: 3.5, y: 4.5 }; // clubhouse / spawn point

/** Land parcels: the map is a PW x PH grid of buyable blocks. */
export const PARCEL_W = 16;
export const PARCEL_H = 12;
export const PW = W / PARCEL_W; // 4
export const PH = H / PARCEL_H; // 4
export const LAND_COST = 3500;

/** Elevation: screen px per step, max steps, cost per modified corner. */
export const EH = 9;
export const MAXE = 6;
export const ELEV_COST = 8;

export const TINFO: Record<number, TileInfo> = {
  [Tile.ROUGH]: { name: 'Rough', c1: '#628f42', c2: '#547c39', cost: 0 },
  [Tile.FAIR]: { name: 'Fairway', c1: '#80bf54', c2: '#70ad47', cost: 40 },
  [Tile.FIRM_FAIR]: { name: 'Firm Fairway', c1: '#a8c96a', c2: '#96b158', cost: 55 }, // drier, baked-turf tone — manual: "bounce higher and roll farther"
  [Tile.DEEP_ROUGH]: { name: 'Deep Rough', c1: '#466f35', c2: '#36592b', cost: 18 },
  [Tile.GREEN]: { name: 'Green', c1: '#5cc274', c2: '#4aa85e', cost: 45 }, // deeper emerald, less minty — closer to ParkLandTerrainButtons.pcx's putting green
  [Tile.TEE]: { name: 'Tee', c1: '#98cf72', c2: '#87be63', cost: 0 },
  [Tile.SAND]: { name: 'Sand', c1: '#ecdbab', c2: '#dcc794', cost: 25 }, // paler, closer to the original's cream bunker sand
  [Tile.WATER]: { name: 'Water', c1: '#3d8ea0', c2: '#2a6f82', cost: 80 }, // muted teal-blue, not vivid sky blue — matches both the Desert and Parklands reference ponds
  [Tile.TREE]: { name: 'Trees', c1: '#628f42', c2: '#547c39', cost: 30 },
  [Tile.FLOWER]: { name: 'Flowers', c1: '#5d8b3e', c2: '#507a36', cost: 15 },
  [Tile.PATH]: { name: 'Pathway', c1: '#c5a777', c2: '#b79766', cost: 8 },
  [Tile.WASTE_BUNKER]: { name: 'Waste Bunker', c1: '#a58d5e', c2: '#806c47', cost: 35 },
  [Tile.POT_BUNKER]: { name: 'Pot Bunker', c1: '#595a44', c2: '#333a30', cost: 50 },
  [Tile.STREAM]: { name: 'Stream', c1: '#3d8798', c2: '#245f73', cost: 65 },
  [Tile.BRUSH]: { name: 'Brush', c1: '#4b6e35', c2: '#354f2a', cost: 28 },
  [Tile.ROCK]: { name: 'Rocks', c1: '#7d8077', c2: '#575d58', cost: 32 },
  [Tile.BRIDGE_WATER]: { name: 'Water Bridge', c1: '#b98d58', c2: '#765034', cost: 75 },
  [Tile.BRIDGE_STREAM]: { name: 'Stream Bridge', c1: '#b98d58', c2: '#765034', cost: 55 },
};

/** Unconnected pathway renders as a mud track (manual). */
export const PATH_MUD = { c1: '#78654a', c2: '#66553e' };

/**
 * Course theme palettes (manual: Parklands/Links/Desert/Tropical each recolor the
 * ground, independent of hole layout). `TINFO` above is the Parklands baseline;
 * this only overrides the tiles whose look actually shifts per theme — values are
 * original archetype colors for each landscape type, not sampled from any reference art.
 * Trees aren't listed here: `treeSprite()` paints its own species palette and isn't
 * driven by tile color — theme instead shifts which species show up (see `treeKindFor`).
 */
export const THEME_TINFO: Record<CourseTheme, Partial<Record<number, { c1: string; c2: string }>>> = {
  parklands: {},
  links: {
    [Tile.ROUGH]: { c1: '#8a9a5b', c2: '#76854c' },
    [Tile.FAIR]: { c1: '#8fae66', c2: '#7c9b56' },
    [Tile.FIRM_FAIR]: { c1: '#aab675', c2: '#929d61' },
    [Tile.DEEP_ROUGH]: { c1: '#69773f', c2: '#536333' },
    [Tile.GREEN]: { c1: '#56b06e', c2: '#469358' },
    [Tile.SAND]: { c1: '#d9cfa8', c2: '#c7bc92' },
    [Tile.WATER]: { c1: '#4a7d94', c2: '#375f73' },
    [Tile.WASTE_BUNKER]: { c1: '#8f8059', c2: '#716548' },
    [Tile.POT_BUNKER]: { c1: '#4f513e', c2: '#2e332b' },
    [Tile.STREAM]: { c1: '#385f68', c2: '#263f49' },
    [Tile.BRUSH]: { c1: '#5a6731', c2: '#3e4d27' },
    [Tile.ROCK]: { c1: '#777a72', c2: '#555a56' },
  },
  desert: {
    [Tile.ROUGH]: { c1: '#b99a5c', c2: '#a3854c' },
    [Tile.FAIR]: { c1: '#a3c15a', c2: '#8fac4a' },
    [Tile.FIRM_FAIR]: { c1: '#c2c66c', c2: '#aaad56' },
    [Tile.DEEP_ROUGH]: { c1: '#8f9d52', c2: '#778444' },
    [Tile.GREEN]: { c1: '#63b06a', c2: '#519657' },
    [Tile.SAND]: { c1: '#e0b978', c2: '#cba362' },
    [Tile.WATER]: { c1: '#3f9fa0', c2: '#2d7d7e' },
    [Tile.WASTE_BUNKER]: { c1: '#c09559', c2: '#936d43' },
    [Tile.POT_BUNKER]: { c1: '#70513b', c2: '#3d2e29' },
    [Tile.STREAM]: { c1: '#76523a', c2: '#3e302a' },
    [Tile.BRUSH]: { c1: '#7e713d', c2: '#5d5632' },
    [Tile.ROCK]: { c1: '#a87952', c2: '#77553e' },
  },
  tropical: {
    [Tile.ROUGH]: { c1: '#4a9c4f', c2: '#3c8140' },
    [Tile.FAIR]: { c1: '#6bc94f', c2: '#5aad42' },
    [Tile.FIRM_FAIR]: { c1: '#8acb61', c2: '#72ad4f' },
    [Tile.DEEP_ROUGH]: { c1: '#2f7437', c2: '#255d31' },
    [Tile.GREEN]: { c1: '#4fd47a', c2: '#3fb164' },
    [Tile.SAND]: { c1: '#f2ecd8', c2: '#e0d8bd' },
    [Tile.WATER]: { c1: '#2fa8b0', c2: '#1f8890' },
    [Tile.WASTE_BUNKER]: { c1: '#baa878', c2: '#927f59' },
    [Tile.POT_BUNKER]: { c1: '#4b5942', c2: '#293b32' },
    [Tile.STREAM]: { c1: '#2aa0a8', c2: '#176e7c' },
    [Tile.BRUSH]: { c1: '#28693b', c2: '#1e5030' },
    [Tile.ROCK]: { c1: '#7f8981', c2: '#56645d' },
  },
};

/** `TINFO[tile]` with the active theme's color override applied, if any (cost is theme-independent). */
export function themedTile(tile: Tile, theme: CourseTheme): TileInfo {
  const ov = THEME_TINFO[theme]?.[tile];
  return ov ? { ...TINFO[tile], c1: ov.c1, c2: ov.c2 } : TINFO[tile];
}

/** Manual theme substitutions: Links use a Burn and Gorse; Desert swaps its base
 * ground to Desert while the deep-rough tool becomes the playable Rough, and its
 * stream becomes a dry Ravine. */
export function themedTerrainName(tile: Tile, theme: CourseTheme): string {
  if (theme === 'links' && tile === Tile.STREAM) return 'Burn';
  if (theme === 'links' && tile === Tile.BRUSH) return 'Gorse';
  if (theme === 'desert' && tile === Tile.ROUGH) return 'Desert';
  if (theme === 'desert' && tile === Tile.DEEP_ROUGH) return 'Rough';
  if (theme === 'desert' && tile === Tile.STREAM) return 'Ravine';
  return TINFO[tile].name;
}

export const LIE: Record<LieKey, LieInfo> = {
  tee: { max: 12.0, ang: 5, dst: 0.05 },
  fair: { max: 11.0, ang: 5, dst: 0.05 },
  firmfair: { max: 12.4, ang: 5, dst: 0.05 }, // bounces higher, rolls farther — same accuracy as fair, more distance
  rough: { max: 8.5, ang: 9, dst: 0.09 },
  deeprough: { max: 6.8, ang: 12, dst: 0.13 },
  sand: { max: 5.5, ang: 12, dst: 0.14 },
  waste: { max: 6.1, ang: 13, dst: 0.15 },
  pot: { max: 3.5, ang: 18, dst: 0.22 },
  stream: { max: 4, ang: 16, dst: 0.2 },
  brush: { max: 4.6, ang: 16, dst: 0.18 },
  rock: { max: 5.4, ang: 15, dst: 0.18 },
  tree: { max: 4.5, ang: 14, dst: 0.14 },
  green: { max: 7.0, ang: 2, dst: 0.03 },
  flower: { max: 8.5, ang: 9, dst: 0.09 },
  water: { max: 8.5, ang: 9, dst: 0.09 },
  bridge: { max: 9.5, ang: 6, dst: 0.07 },
};

export const ROLL: Record<string, number> = {
  green: 1.3,
  fair: 0.9,
  firmfair: 1.5,
  tee: 0.9,
  rough: 0.3,
  deeprough: 0.08,
  sand: 0,
  waste: 0.05,
  pot: 0,
  stream: 0,
  brush: 0.03,
  rock: 0.15,
  tree: 0.1,
  flower: 0.3,
  water: 0,
  bridge: 0.65,
};

/**
 * Player-only club choice for non-putt shots (putts always use the green-lie path
 * regardless of club). `mul` scales the lie's max distance; `angScale` feeds straight
 * into `aimShot`'s existing per-call aim-wobble parameter. `iron` reproduces the game's
 * original fixed-angScale-0.55, mul-1 behavior exactly, so it's the safe default.
 */
export const CLUBS: Record<'driver' | 'iron' | 'wedge', { label: string; mul: number; angScale: number }> = {
  driver: { label: 'Driver', mul: 1.25, angScale: 0.85 },
  iron: { label: 'Iron', mul: 1.0, angScale: 0.55 },
  wedge: { label: 'Wedge', mul: 0.55, angScale: 0.3 },
};

/**
 * Player-only shot technique (manual p.21-22), picked before each full swing (hidden on
 * the green — putts don't have a shape). `heightMul` scales the drawn/flown arc height;
 * curvature (fade/draw) and the no-roll/no-tree-deflect effects (backspin/punch) are
 * applied directly in `playerFire`/`resolveFly`, not here.
 */
export const SHOT_SHAPES: Record<'straight' | 'fade' | 'draw' | 'backspin' | 'punch', { label: string; heightMul: number }> = {
  straight: { label: 'Straight', heightMul: 1 },
  fade: { label: 'Fade', heightMul: 1 },
  draw: { label: 'Draw', heightMul: 1 },
  backspin: { label: 'Backspin', heightMul: 1.3 },
  punch: { label: 'Punch', heightMul: 0.45 },
};

export const NAMES = [
  'Big Earl', 'Doris', 'Chip', 'Sandy Bunkerson', 'Bogey Bill', 'Ms. Mulligan', 'Tex', 'Prof. Putter',
  'Lady Ferndale', 'Two-Putt Tony', 'Gale', 'Slice Ricky', 'Mimi', 'Old Duff', 'Birdie Jean', 'The Colonel',
  'Wanda', 'Divot Dave', 'Sir Reginald', 'Peaches', 'Gus', 'Countess Vi', 'Marv', 'Lil Scooter',
];
export const SHIRTS = ['#d0453a', '#3f7fd0', '#e9b53c', '#8e5bc0', '#e0743a', '#2fa48a', '#d867a8', '#5d6d7e', '#b9d24a', '#efefef'];
export const SKINS = ['#f1c6a0', '#e0a878', '#c98a5e', '#8d5a3a', '#6b4226', '#f6d7b8'];

export const SAY: Record<string, string[]> = {
  drive: ['What a drive!', 'Straight down the middle!', 'Crushed it!', 'That one had a stamp on it.'],
  water: ['Kersplash. Wonderful.', 'That lake owes me a ball.', 'I do not swim. My ball apparently does.', 'Glub glub goes my scorecard.'],
  tree: ['That tree jumped out of nowhere!', 'Ow. Timber.', 'Since when is this a forest?', 'My ball lives here now.'],
  sand: ['Beach day, apparently.', 'I did not bring sunscreen.', 'Ah yes, the world’s worst sandbox.'],
  deeprough: ['I may need a machete.', 'That grass swallowed it whole.', 'Deep rough. Deep regret.'],
  waste: ['This bunker has its own ecosystem.', 'Long grass and a bad stance. Perfect.', 'Waste bunker: accurate name.'],
  pot: ['I have fallen into a tiny crater.', 'Get me a ladder and a sand wedge.', 'This pot bunker has no bottom.'],
  stream: ['The current can keep that one.', 'A very expensive little splash.', 'My ball has joined the watershed.'],
  brush: ['Something in there just hissed.', 'That ball belongs to the shrubbery now.', 'I should have packed pruning shears.'],
  rock: ['Ricochet! That was not the plan.', 'The geology has opinions.', 'Rock beats golf ball.'],
  birdie: ['BIRDIE! Drinks on me!', 'Tell the pro shop I’m famous.', 'Frame that scorecard!', 'A birdie! Kiss the trophy!'],
  par: ['Solid par. I’ll take it.', 'Par. Respectable.', 'Right on script.'],
  bogey: ['Bogey. I blame the wind.', 'One over. The grass moved.', 'Fine. FINE.'],
  pickup: ['I give up on this hole...', 'Picking up. Don’t look at me.', 'This hole cheats.'],
  pricey: ['These fees are highway robbery!', 'I could buy my own course for this.', 'Steep prices for this lawn.'],
  scenic: ['What a view!', 'Gorgeous hole!', 'Someone paint this for me.', 'Simply lovely out here.'],
  chip: ['IT WENT IN?! IT WENT IN!', 'Chip-in! Somebody saw that, right?', 'Straight into the cup. Casual.'],
  leaveHappy: ['Best round of my life!', 'I’m telling everyone about this place.', 'Same time next week!'],
  leaveMad: ['Never again.', 'My lawyer will hear about this course.', 'I want my balls back. All nine.'],
};
