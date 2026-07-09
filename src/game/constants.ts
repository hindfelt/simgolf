import { Tile } from './types';
import type { TileInfo, LieInfo, LieKey } from './types';

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
  [Tile.ROUGH]: { name: 'Rough', c1: '#79a340', c2: '#6f9739', cost: 0 },
  [Tile.FAIR]: { name: 'Fairway', c1: '#93d250', c2: '#85c545', cost: 40 },
  [Tile.GREEN]: { name: 'Green', c1: '#8ce49b', c2: '#7dd98d', cost: 45 },
  [Tile.TEE]: { name: 'Tee', c1: '#aae38d', c2: '#9dd980', cost: 0 },
  [Tile.SAND]: { name: 'Sand', c1: '#eedaa2', c2: '#e3cd8d', cost: 25 },
  [Tile.WATER]: { name: 'Water', c1: '#4189cc', c2: '#3a7cba', cost: 80 },
  [Tile.TREE]: { name: 'Trees', c1: '#79a340', c2: '#6f9739', cost: 30 },
  [Tile.FLOWER]: { name: 'Flowers', c1: '#7fa945', c2: '#759e3e', cost: 15 },
  [Tile.PATH]: { name: 'Pathway', c1: '#cbaa77', c2: '#bf9e6a', cost: 8 },
};

/** Unconnected pathway renders as a mud track (manual). */
export const PATH_MUD = { c1: '#7c6a4c', c2: '#726043' };

export const LIE: Record<LieKey, LieInfo> = {
  tee: { max: 12.0, ang: 5, dst: 0.05 },
  fair: { max: 11.0, ang: 5, dst: 0.05 },
  rough: { max: 8.5, ang: 9, dst: 0.09 },
  sand: { max: 5.5, ang: 12, dst: 0.14 },
  tree: { max: 4.5, ang: 14, dst: 0.14 },
  green: { max: 7.0, ang: 2, dst: 0.03 },
  flower: { max: 8.5, ang: 9, dst: 0.09 },
  water: { max: 8.5, ang: 9, dst: 0.09 },
};

export const ROLL: Record<string, number> = {
  green: 1.3,
  fair: 0.9,
  tee: 0.9,
  rough: 0.3,
  sand: 0,
  tree: 0.1,
  flower: 0.3,
  water: 0,
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
