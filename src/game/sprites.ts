// Native pixel-art sprites. Everything is plotted once onto an integer pixel
// grid and given a dark one-pixel outline. The world renderer keeps image
// smoothing off so the cast reads as chunky toy figurines, never vector blobs.

import type { EmployeeKind } from './types';
import { COURSE_STAFF_SPRITE_SIZE, GOLFER_SPRITE_SIZE } from './actorGeometry';

export {
  ACTOR_SCALE_MAX,
  ACTOR_SCALE_MIN,
  COURSE_STAFF_FOOT_ANCHOR,
  COURSE_STAFF_SPRITE_SIZE,
  GOLFER_FOOT_ANCHOR,
  GOLFER_SPRITE_SIZE,
  actorSpriteScale,
} from './actorGeometry';

const cache = new Map<string, HTMLCanvasElement>();

type Px = (x: number, y: number, w?: number, h?: number, c?: string) => void;

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D, Px] {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d')!;
  let cur = '#000';
  const px: Px = (x, y, pw = 1, ph = 1, c) => {
    if (c) cur = c;
    ctx.fillStyle = cur;
    const left = Math.round(x);
    const top = Math.round(y);
    const width = Math.max(1, Math.round(pw));
    const height = Math.max(1, Math.round(ph));
    ctx.fillRect(left, top, width, height);
  };
  return [cv, ctx, px];
}

/** Integer Bresenham line used for club shafts and profession tools. */
function pixelLine(p: Px, x0: number, y0: number, x1: number, y1: number, color: string, width = 1) {
  let x = Math.round(x0);
  let y = Math.round(y0);
  const endX = Math.round(x1);
  const endY = Math.round(y1);
  const dx = Math.abs(endX - x);
  const sx = x < endX ? 1 : -1;
  const dy = -Math.abs(endY - y);
  const sy = y < endY ? 1 : -1;
  let error = dx + dy;
  for (;;) {
    p(x, y, width, width, color);
    if (x === endX && y === endY) break;
    const twice = error * 2;
    if (twice >= dy) { error += dy; x += sx; }
    if (twice <= dx) { error += dx; y += sy; }
  }
}

/** Stamp a dark outline around everything drawn in `art`, return final sprite. */
function outlined(art: HTMLCanvasElement, color: string): HTMLCanvasElement {
  const [out, octx] = makeCanvas(art.width, art.height);
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ])
    octx.drawImage(art, dx, dy);
  octx.globalCompositeOperation = 'source-in';
  octx.fillStyle = color;
  octx.fillRect(0, 0, out.width, out.height);
  octx.globalCompositeOperation = 'source-over';
  octx.drawImage(art, 0, 0);
  return out;
}

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const cl = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return 'rgb(' + cl(((n >> 16) & 255) * f) + ',' + cl(((n >> 8) & 255) * f) + ',' + cl((n & 255) * f) + ')';
}

/* ================= golfers ================= */

export type GolferFrame = 'idle' | 'walkA' | 'walkB' | 'address' | 'back' | 'follow' | 'putt' | 'puttFollow';
export type ActorSpriteView = 'front' | 'rear' | 'side';

export type GolferBuild = 'compact' | 'classic' | 'broad';
export type GolferHeadwear = 'cap' | 'visor' | 'flat-cap' | 'bucket-hat';
export type GolferHair = 'close' | 'side-locks' | 'curls' | 'tail';

/**
 * Stable visual identity derived from a golfer's name. Keeping this pure makes
 * the cast recognizable when their palette, animation frame, or camera view
 * changes, and lets the tiny world sprites share an identity with UI portraits.
 */
export interface GolferAppearance {
  build: GolferBuild;
  headwear: GolferHeadwear;
  hair: GolferHair;
  outfit: number;
  face: number;
  pants: number;
  bag: number;
  socks: number;
}

const PANTS = ['#3b4252', '#6b4f35', '#75787f', '#4a5d3a', '#7d4444', '#e8e4d8'];
const HAIR = ['#34251f', '#6e3f28', '#b96f3e', '#d7c8aa', '#272a31'];
const BAGS = ['#8a5a30', '#315f83', '#8b3640', '#4f7042', '#d19a2e'];
const SOCKS = ['#e8e4d8', '#f4c94b', '#94c7d0', '#be6a72'];
const BUILDS = ['compact', 'classic', 'broad'] as const;
const HEADWEAR = ['cap', 'visor', 'flat-cap', 'bucket-hat'] as const;
const HAIRSTYLES = ['close', 'side-locks', 'curls', 'tail'] as const;

function hashStr(s: string): number {
  let h = 2166136261;
  // Math.imul preserves the low 32 bits. Normal JS multiplication loses them
  // once the FNV intermediate exceeds Number's safe integer range, which used
  // to collapse almost the entire named cast into outfit variant zero.
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  // Avalanche the FNV result so independently salted appearance lanes do not
  // inherit correlations from short or similarly suffixed character names.
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
}

function appearanceIndex(seed: string, lane: string, count: number): number {
  return hashStr(seed + '\0' + lane) % count;
}

export function golferAppearance(name: string): GolferAppearance {
  const seed = name.trim().toLowerCase() || 'anonymous golfer';
  return {
    build: BUILDS[appearanceIndex(seed, 'build', BUILDS.length)],
    headwear: HEADWEAR[appearanceIndex(seed, 'headwear', HEADWEAR.length)],
    hair: HAIRSTYLES[appearanceIndex(seed, 'hair', HAIRSTYLES.length)],
    outfit: appearanceIndex(seed, 'outfit', 5),
    face: appearanceIndex(seed, 'face', 5),
    pants: appearanceIndex(seed, 'pants', PANTS.length),
    bag: appearanceIndex(seed, 'bag', BAGS.length),
    socks: appearanceIndex(seed, 'socks', SOCKS.length),
  };
}

const BUILD_GEOMETRY: Record<GolferBuild, {
  shouldersW: number;
  torsoW: number;
  hipsW: number;
  headW: number;
}> = {
  compact: { shouldersW: 8, torsoW: 7, hipsW: 6, headW: 7 },
  classic: { shouldersW: 10, torsoW: 9, hipsW: 7, headW: 8 },
  broad: { shouldersW: 13, torsoW: 11, hipsW: 9, headW: 9 },
};

/**
 * A native 32×44 hand-plotted golfer. Every rectangle and club-shaft pixel is
 * authored on the final canvas grid: there is no logical-coordinate transform
 * or second bitmap bake. The three views share identity cues while changing the
 * actual body silhouette, face direction, bag placement and hat profile.
 */
export function golferSprite(shirt: string, skin: string, cap: string, frame: GolferFrame, view: ActorSpriteView = 'front', identity = ''): HTMLCanvasElement {
  const key = 'g4|' + shirt + '|' + skin + '|' + cap + '|' + frame + '|' + view + '|' + identity;
  const hit = cache.get(key);
  if (hit) return hit;

  const [art, , p] = makeCanvas(GOLFER_SPRITE_SIZE.width, GOLFER_SPRITE_SIZE.height);
  const identitySeed = identity || shirt + skin + cap;
  const normalizedIdentity = identitySeed.trim().toLowerCase() || 'anonymous golfer';
  const appearance = golferAppearance(normalizedIdentity);
  const geometry = BUILD_GEOMETRY[appearance.build];
  const pants = PANTS[appearance.pants];
  const hair = HAIR[appearanceIndex(normalizedIdentity, 'hair-tone', HAIR.length)];
  const bag = BAGS[appearance.bag];
  const socks = SOCKS[appearance.socks];
  const shirtDk = shade(shirt, 0.78);
  const capDk = shade(cap, 0.75);
  const skinDk = shade(skin, 0.8);
  const walking = frame === 'walkA' || frame === 'walkB';
  const swingBack = frame === 'back';
  const follow = frame === 'follow';
  const putting = frame === 'putt' || frame === 'puttFollow';
  const crouched = frame === 'address' || putting;
  const rear = view === 'rear';
  const side = view === 'side';
  const centre = 15 + (follow ? 1 : swingBack ? -1 : 0);
  const crouch = crouched ? 2 : 0;
  const torsoY = 15 + crouch;
  const hipY = 26 + crouch;
  const torsoW = side ? Math.max(6, geometry.torsoW - 2) : geometry.torsoW;
  const shouldersW = side ? Math.max(7, geometry.shouldersW - 3) : geometry.shouldersW;
  const torsoX = centre - Math.floor(torsoW / 2);
  const shouldersX = centre - Math.floor(shouldersW / 2);
  const hipsW = side ? Math.max(5, geometry.hipsW - 2) : geometry.hipsW;
  const hipsX = centre - Math.floor(hipsW / 2);

  // Walking golfers carry a tall, asymmetrical bag. Its position changes by
  // view so rear-facing actors do not look like mirrored front sprites.
  if (walking) {
    const bagX = rear ? centre - 7 : side ? 4 : 3;
    const bagY = frame === 'walkA' ? 15 : 14;
    p(bagX + 1, bagY, 6, 15, bag);
    p(bagX, bagY + 2, 2, 12, shade(bag, 0.68));
    p(bagX + 2, bagY - 2, 5, 3, shade(bag, 0.78));
    pixelLine(p, bagX + 2, bagY - 2, bagX + 1, 8, '#9aa0a8');
    pixelLine(p, bagX + 5, bagY - 2, bagX + 6, 7, '#c9ced4');
    p(bagX, 7, 3, 2, '#c9ced4');
    p(bagX + 5, 6, 3, 2, '#8f959c');
    pixelLine(p, bagX + 6, bagY + 2, bagX + 9, bagY + 10, shade(bag, 1.22));
  }

  // Whole-body posing starts at the feet. Address and putting use a visibly
  // wider base; backswing/follow-through move weight to opposite legs.
  const shoe = '#2e2a26';
  const drawLeg = (x: number, top: number, bottom: number, footX: number, footY: number, dark = false) => {
    p(x, top, 3, Math.max(2, bottom - top), dark ? shade(pants, 0.78) : pants);
    p(x, bottom, 3, 2, socks);
    p(footX, footY, 5, 3, shoe);
  };
  if (side) {
    if (frame === 'walkA') {
      drawLeg(centre - 3, hipY + 2, 37, centre - 5, 39, true);
      drawLeg(centre + 1, hipY + 2, 38, centre + 2, 40);
    } else if (frame === 'walkB') {
      drawLeg(centre + 1, hipY + 2, 37, centre + 1, 39, true);
      drawLeg(centre - 3, hipY + 2, 38, centre - 5, 40);
    } else if (frame === 'follow') {
      drawLeg(centre - 3, hipY + 2, 38, centre - 4, 40, true);
      drawLeg(centre + 1, hipY + 2, 36, centre + 2, 38);
      p(centre - 5, 38, 2, 3, socks);
    } else {
      const spread = putting ? 4 : frame === 'address' ? 3 : 2;
      drawLeg(centre - spread, hipY + 2, 38, centre - spread - 1, 40, true);
      drawLeg(centre + spread - 1, hipY + 2, 38, centre + spread - 1, 40);
    }
  } else if (frame === 'walkA') {
    drawLeg(centre - 5, hipY + 2, 37, centre - 7, 39, true);
    drawLeg(centre + 2, hipY + 2, 38, centre + 3, 40);
  } else if (frame === 'walkB') {
    drawLeg(centre + 2, hipY + 2, 37, centre + 1, 39, true);
    drawLeg(centre - 5, hipY + 2, 38, centre - 7, 40);
  } else if (frame === 'back') {
    drawLeg(centre - 5, hipY + 2, 38, centre - 6, 40, true);
    drawLeg(centre + 2, hipY + 2, 38, centre + 2, 40);
  } else if (frame === 'follow') {
    drawLeg(centre - 5, hipY + 2, 36, centre - 7, 38, true);
    drawLeg(centre + 2, hipY + 2, 38, centre + 2, 40);
    p(centre - 7, 37, 2, 3, socks);
  } else {
    const spread = putting ? 6 : frame === 'address' ? 5 : 4;
    drawLeg(centre - spread, hipY + 2, 38, centre - spread - 1, 40, true);
    drawLeg(centre + spread - 2, hipY + 2, 38, centre + spread - 2, 40);
  }
  p(hipsX, hipY, hipsW, 5, pants);
  p(hipsX, hipY, 2, 5, shade(pants, 0.78));
  if (rear) p(hipsX + 2, hipY + 1, Math.max(2, hipsW - 4), 1, shade(pants, 1.12));

  // Stepped shoulders and a tapered waist keep compact/classic/broad builds
  // visibly different in alpha silhouette, not just in clothing colour.
  p(shouldersX + 1, torsoY, shouldersW - 2, 2, shirt);
  p(shouldersX, torsoY + 2, shouldersW, 3, shirt);
  p(torsoX, torsoY + 5, torsoW, 7, shirt);
  p(shouldersX, torsoY + 2, 2, 3, shirtDk);
  p(torsoX, torsoY + 5, 2, 7, shirtDk);
  p(torsoX, torsoY + 10, torsoW, 2, shirtDk);
  const chestCenter = centre;
  if (rear) {
    p(torsoX + 2, torsoY + 5, Math.max(2, torsoW - 4), 2, shade(shirt, 1.15));
    p(chestCenter, torsoY + 7, 1, 4, shirtDk);
  } else if (side) {
    p(torsoX + torsoW - 2, torsoY + 5, 2, 7, shade(shirt, 1.12));
    p(torsoX + 1, torsoY + 7, torsoW - 2, 1, shirtDk);
  } else if (appearance.outfit === 0) p(chestCenter - 1, torsoY + 3, 2, 8, shade(shirt, 1.22));
  else if (appearance.outfit === 1) {
    p(torsoX + 1, torsoY + 5, torsoW - 2, 2, shade(shirt, 1.2));
    p(torsoX + 1, torsoY + 9, torsoW - 2, 1, shirtDk);
  } else if (appearance.outfit === 2) {
    p(torsoX + 1, torsoY + 4, 2, 7, shirtDk);
    p(torsoX + torsoW - 3, torsoY + 4, 2, 7, shirtDk);
  } else if (appearance.outfit === 3) p(torsoX + torsoW - 4, torsoY + 5, 3, 3, shade(shirt, 1.25));
  else {
    p(chestCenter - 3, torsoY + 5, 3, 3, shade(shirt, 1.28));
    p(chestCenter, torsoY + 8, 3, 3, shirtDk);
  }

  if (!rear) p(chestCenter - 2, torsoY - 1, 4, 2, '#f2f0e8');

  const headCentre = centre + (side ? 1 : 0) + (crouched ? 1 : 0);
  const headW = side ? Math.max(6, geometry.headW - 1) : geometry.headW;
  const headX = headCentre - Math.floor(headW / 2);
  const headY = 6 + crouch;
  const headRight = headX + headW;
  // Hair is painted before the stepped face so long styles remain a silhouette cue.
  if (appearance.hair === 'close') p(headX - 1, headY + 2, 2, 6, hair);
  else if (appearance.hair === 'side-locks') {
    p(headX - 2, headY + 2, 3, 7, hair);
    p(headX - 1, headY + 8, 3, 2, hair);
  } else if (appearance.hair === 'curls') {
    p(headX - 2, headY + 1, 3, 3, hair);
    p(headX - 2, headY + 5, 3, 3, hair);
    p(headX, headY + 8, 3, 2, hair);
  } else {
    p(headX - 1, headY + 2, 2, 7, hair);
    p(headX - 4, headY + 7, 4, 3, hair);
    p(headX - 4, headY + 10, 2, 2, hair);
  }
  p(headX + 1, headY, headW - 2, 1, skin);
  p(headX, headY + 1, headW, 6, skin);
  p(headX + 1, headY + 7, headW - 2, 2, skin);
  if (rear) {
    p(headX, headY + 1, headW, 4, skinDk);
    p(headX, headY + 4, headW, 5, hair);
  } else if (side) {
    p(headX, headY + 1, 2, 7, skinDk);
    p(headRight, headY + 4, 2, 3, skin);
    p(headRight, headY + 3, 1, 1, '#26221e');
  } else {
    p(headX, headY + 1, 2, 7, skinDk);
    p(headX + 2, headY + 4, 1, 1, '#26221e');
    p(headRight - 3, headY + 4, 1, 1, '#26221e');
  }

  if (appearance.headwear === 'cap') {
    p(headX + 1, headY - 3, headW - 2, 1, cap);
    p(headX, headY - 2, headW, 3, cap);
    p(headX, headY - 2, 2, 3, capDk);
    if (side) p(headRight - 1, headY, 5, 2, capDk);
    else if (!rear) p(headRight - 1, headY, 3, 1, capDk);
  } else if (appearance.headwear === 'visor') {
    p(headX + 1, headY - 2, headW - 2, 2, hair);
    p(headX, headY, headW, 2, cap);
    p(headX, headY, 2, 2, capDk);
    if (side) p(headRight - 1, headY + 1, 5, 1, capDk);
    else if (!rear) p(headRight - 1, headY + 1, 3, 1, capDk);
  } else if (appearance.headwear === 'flat-cap') {
    p(headX + 1, headY - 3, headW - 2, 2, cap);
    p(headX - 1, headY - 1, headW + 2, 3, cap);
    p(headX - 1, headY - 1, 2, 3, capDk);
    if (!rear) p(headRight - 1, headY + 1, side ? 5 : 3, 1, capDk);
  } else {
    p(headX + 1, headY - 3, headW - 2, 3, cap);
    p(headX + 1, headY - 3, 2, 3, capDk);
    p(headX - 3, headY, headW + 6, 2, capDk);
  }

  if (!rear && !side) {
    if (appearance.face === 0) {
      p(headX + 1, headY + 4, headW - 2, 1, '#3b3028');
      p(headX + 2, headY + 4, 1, 1, '#d8e6df');
    } else if (appearance.face === 1) p(headCentre - 1, headY + 7, 3, 1, '#6a3f27');
    else if (appearance.face === 2) p(headX, headY + 4, 2, 4, hair);
    else if (appearance.face === 3) p(headRight - 2, headY + 6, 2, 1, '#c8786b');
    else p(headCentre - 1, headY + 2, 3, 1, hair);
  }

  // Arms and clubs complete eight genuinely different whole-body poses.
  const grey = '#8f959c';
  const steel = '#c9ced4';
  if (swingBack) {
    p(shouldersX, torsoY + 1, 3, 4, shirt);
    pixelLine(p, shouldersX + 1, torsoY + 1, centre - 4, torsoY - 3, skin, 2);
    p(centre - 5, torsoY - 4, 3, 3, skin);
    pixelLine(p, centre - 4, torsoY - 3, 4, 2, grey);
    p(2, 1, 5, 2, steel);
  } else if (follow) {
    const armX = shouldersX + shouldersW - 2;
    p(armX, torsoY + 1, 3, 4, shirt);
    pixelLine(p, armX + 1, torsoY + 1, centre + 5, torsoY - 3, skin, 2);
    p(centre + 4, torsoY - 4, 3, 3, skin);
    pixelLine(p, centre + 5, torsoY - 3, 28, 3, grey);
    p(27, 1, 4, 3, steel);
  } else if (frame === 'puttFollow') {
    p(shouldersX, torsoY + 3, 3, 5, shirt);
    p(shouldersX + shouldersW - 3, torsoY + 3, 3, 5, shirt);
    pixelLine(p, centre - 3, torsoY + 6, centre + 5, torsoY + 12, skin, 2);
    p(centre + 4, torsoY + 11, 3, 3, skin);
    pixelLine(p, centre + 6, torsoY + 13, 26, 38, grey);
    p(24, 38, 5, 2, steel);
  } else if (frame === 'putt') {
    p(shouldersX, torsoY + 3, 3, 5, shirt);
    p(shouldersX + shouldersW - 3, torsoY + 3, 3, 5, shirt);
    pixelLine(p, centre - 3, torsoY + 6, centre + 2, torsoY + 12, skin, 2);
    p(centre + 1, torsoY + 11, 3, 3, skin);
    pixelLine(p, centre + 3, torsoY + 13, 22, 39, grey);
    p(20, 39, 5, 2, steel);
  } else if (frame === 'address') {
    p(shouldersX, torsoY + 3, 3, 5, shirt);
    p(shouldersX + shouldersW - 3, torsoY + 3, 3, 5, shirt);
    pixelLine(p, centre - 3, torsoY + 6, centre + 4, torsoY + 11, skin, 2);
    p(centre + 3, torsoY + 10, 3, 3, skin);
    pixelLine(p, centre + 5, torsoY + 12, 26, 39, grey);
    p(24, 39, 5, 2, steel);
  } else {
    const phase = frame === 'walkA' ? 2 : frame === 'walkB' ? -2 : 0;
    p(shouldersX, torsoY + 2, 3, 5, shirt);
    pixelLine(p, shouldersX + 1, torsoY + 6, shouldersX + 1 - phase, torsoY + 11, skin, 2);
    p(shouldersX + shouldersW - 3, torsoY + 2, 3, 5, shirt);
    pixelLine(p, shouldersX + shouldersW - 2, torsoY + 6, shouldersX + shouldersW - 2 + phase, torsoY + 11, skin, 2);
  }

  const done = outlined(art, '#20242b');
  cache.set(key, done);
  return done;
}

/* ================= course staff =================
   Staff use their own silhouettes instead of borrowing the golfer sprite. That
   keeps golf bags and clubs off the maintenance crew, and lets each profession
   carry a readable tool even at normal zoom. */

export type CourseStaffKind = EmployeeKind;
export type CourseStaffFrame = 'walkA' | 'walkB' | 'workA' | 'workB';
export type CourseStaffBuild = 'slim' | 'standard' | 'broad';

export interface CourseStaffArchetype {
  label: string;
  build: CourseStaffBuild;
  primary: string;
  secondary: string;
  trousers: string;
  skin: string;
  headwear: 'visor' | 'ranger-hat' | 'work-cap' | 'vendor-cap' | 'wide-brim' | 'marshall-cap' | 'sun-hat' | 'straw-hat';
  tool: 'clipboard' | 'binoculars' | 'rake' | 'soda-tray' | 'autograph-book' | 'pace-paddle' | 'watering-can' | 'cocktail-tray';
}

/** Public metadata keeps profession identity testable without needing a DOM canvas. */
export const COURSE_STAFF_ARCHETYPES: Record<CourseStaffKind, CourseStaffArchetype> = {
  clubpro: {
    label: 'Club Pro',
    build: 'slim',
    primary: '#354b8c',
    secondary: '#f1df8c',
    trousers: '#e7e0c7',
    skin: '#c9875d',
    headwear: 'visor',
    tool: 'clipboard',
  },
  ranger: {
    label: 'Course Ranger',
    build: 'broad',
    primary: '#456b3b',
    secondary: '#d0ad58',
    trousers: '#4a4435',
    skin: '#b9784e',
    headwear: 'ranger-hat',
    tool: 'binoculars',
  },
  groundskeeper: {
    label: 'Groundskeeper',
    build: 'broad',
    primary: '#c98236',
    secondary: '#f0d36b',
    trousers: '#405946',
    skin: '#e0a878',
    headwear: 'work-cap',
    tool: 'rake',
  },
  sodavendor: {
    label: 'Soda Vendor',
    build: 'standard',
    primary: '#d54b45',
    secondary: '#ffe168',
    trousers: '#344f77',
    skin: '#8d5a3a',
    headwear: 'vendor-cap',
    tool: 'soda-tray',
  },
  celebrity: {
    label: 'Club Celebrity',
    build: 'slim',
    primary: '#8d4e9f',
    secondary: '#ffd56a',
    trousers: '#46335d',
    skin: '#d79a72',
    headwear: 'wide-brim',
    tool: 'autograph-book',
  },
  marshall: {
    label: 'Course Marshall',
    build: 'broad',
    primary: '#f0a52f',
    secondary: '#fff1a3',
    trousers: '#334b63',
    skin: '#70472f',
    headwear: 'marshall-cap',
    tool: 'pace-paddle',
  },
  turftech: {
    label: 'Turf Gardener',
    build: 'broad',
    primary: '#2f8172',
    secondary: '#eef0df',
    trousers: '#31534f',
    skin: '#8d5a3a',
    headwear: 'sun-hat',
    tool: 'watering-can',
  },
  refreshment: {
    label: 'Refreshment Host',
    build: 'standard',
    primary: '#2d8299',
    secondary: '#f0c96b',
    trousers: '#f0e4c5',
    skin: '#e1a77c',
    headwear: 'straw-hat',
    tool: 'cocktail-tray',
  },
};

const STAFF_BUILD_GEOMETRY: Record<CourseStaffBuild, {
  shouldersW: number;
  torsoW: number;
  hipsW: number;
  headW: number;
}> = {
  slim: { shouldersW: 9, torsoW: 8, hipsW: 7, headW: 7 },
  standard: { shouldersW: 11, torsoW: 10, hipsW: 8, headW: 8 },
  broad: { shouldersW: 14, torsoW: 12, hipsW: 10, headW: 9 },
};

export function courseStaffAnimationFrame(working: boolean, phase: number): CourseStaffFrame {
  const alternate = Math.sin(phase) < 0;
  return working ? (alternate ? 'workB' : 'workA') : alternate ? 'walkB' : 'walkA';
}

/**
 * Native 36×42 profession sprites. Existing callers get the side view by
 * default, while front and rear views are available to directional renderers.
 * Every role keeps its palette, hat and tool across three actual silhouettes.
 */
export function courseStaffSprite(kind: CourseStaffKind, frame: CourseStaffFrame, view: ActorSpriteView = 'side'): HTMLCanvasElement {
  const key = `course-staff-v4|${kind}|${frame}|${view}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const spec = COURSE_STAFF_ARCHETYPES[kind];
  const [art, , p] = makeCanvas(COURSE_STAFF_SPRITE_SIZE.width, COURSE_STAFF_SPRITE_SIZE.height);
  const geometry = STAFF_BUILD_GEOMETRY[spec.build];
  const skin = spec.skin;
  const skinDark = shade(skin, 0.78);
  const shirtDark = shade(spec.primary, 0.72);
  const trouserDark = shade(spec.trousers, 0.7);
  const working = frame === 'workA' || frame === 'workB';
  const alternate = frame === 'walkB' || frame === 'workB';
  const rear = view === 'rear';
  const side = view === 'side';
  const centre = 15;
  const shouldersW = side ? Math.max(7, geometry.shouldersW - 3) : geometry.shouldersW;
  const torsoW = side ? Math.max(7, geometry.torsoW - 2) : geometry.torsoW;
  const hipsW = side ? Math.max(6, geometry.hipsW - 1) : geometry.hipsW;
  const headW = side ? Math.max(6, geometry.headW - 1) : geometry.headW;
  const shouldersX = centre - Math.floor(shouldersW / 2);
  const torsoX = centre - Math.floor(torsoW / 2);
  const hipsX = centre - Math.floor(hipsW / 2);
  const headX = centre - Math.floor(headW / 2) + (side ? 1 : 0);
  const headY = 6;

  // Boots and legs stop at y=36 so the established y=37 foot anchor remains
  // exact. Walk cycles swap both the leading foot and the shaded rear leg.
  const drawStaffLeg = (x: number, bottom: number, footX: number, dark = false) => {
    p(x, 29, 3, Math.max(3, bottom - 29), dark ? trouserDark : spec.trousers);
    p(footX, bottom, 5, 3, '#34302a');
  };
  if (side) {
    if (frame === 'walkA') {
      drawStaffLeg(centre - 3, 33, centre - 5, true);
      drawStaffLeg(centre + 1, 34, centre + 2);
    } else if (frame === 'walkB') {
      drawStaffLeg(centre + 1, 33, centre + 1, true);
      drawStaffLeg(centre - 3, 34, centre - 5);
    } else {
      drawStaffLeg(centre - 3, 34, centre - 4, true);
      drawStaffLeg(centre + 1, 34, centre + 1);
    }
  } else if (frame === 'walkA') {
    drawStaffLeg(centre - 5, 33, centre - 7, true);
    drawStaffLeg(centre + 2, 34, centre + 3);
  } else if (frame === 'walkB') {
    drawStaffLeg(centre + 2, 33, centre + 1, true);
    drawStaffLeg(centre - 5, 34, centre - 7);
  } else {
    drawStaffLeg(centre - 5, 34, centre - 6, true);
    drawStaffLeg(centre + 2, 34, centre + 2);
  }
  p(hipsX, 26, hipsW, 5, spec.trousers);
  p(hipsX, 26, 2, 5, trouserDark);

  // Three build widths are authored directly into the shoulder/torso/hip alpha.
  p(shouldersX + 1, 14, shouldersW - 2, 2, spec.primary);
  p(shouldersX, 16, shouldersW, 4, spec.primary);
  p(torsoX, 20, torsoW, 7, spec.primary);
  p(shouldersX, 16, 2, 4, shirtDark);
  p(torsoX, 20, 2, 7, shirtDark);
  p(torsoX, 25, torsoW, 2, shirtDark);
  p(hipsX, 25, hipsW, 2, '#574733');
  p(centre - 1, 25, 3, 2, '#d6b75b');
  if (rear) {
    p(torsoX + 2, 17, torsoW - 4, 2, spec.secondary);
    p(centre, 19, 1, 5, shirtDark);
  } else if (side) {
    p(torsoX + torsoW - 2, 18, 2, 7, shade(spec.primary, 1.12));
    p(torsoX + 1, 20, torsoW - 2, 1, spec.secondary);
  } else {
    p(centre - 2, 14, 4, 2, spec.secondary);
    p(centre, 16, 1, 8, shade(spec.secondary, 0.9));
  }

  // Stepped face and profile nose. Rear view replaces facial pixels with hair.
  p(headX + 1, headY, headW - 2, 1, skin);
  p(headX, headY + 1, headW, 6, skin);
  p(headX + 1, headY + 7, headW - 2, 2, skin);
  p(headX, headY + 1, 2, 7, skinDark);
  if (rear) {
    p(headX, headY + 1, headW, 4, skinDark);
    p(headX, headY + 5, headW, 4, '#4b3426');
  } else if (side) {
    p(headX + headW, headY + 4, 2, 3, skin);
    p(headX + headW, headY + 3, 1, 1, '#24231f');
  } else {
    p(headX + 2, headY + 4, 1, 1, '#24231f');
    p(headX + headW - 3, headY + 4, 1, 1, '#24231f');
  }

  const bill = (color: string, y: number, length = 5) => {
    if (side) p(headX + headW - 1, y, length, 2, color);
    else if (!rear) p(headX + headW - 1, y, 3, 1, color);
  };
  switch (spec.headwear) {
    case 'visor':
      p(headX + 1, 2, headW - 2, 3, '#5a3828');
      p(headX - 1, 4, headW + 2, 3, spec.secondary);
      bill(shade(spec.secondary, 0.78), 6);
      break;
    case 'ranger-hat':
      p(headX - 3, 4, headW + 6, 2, spec.secondary);
      p(headX + 1, 1, headW - 2, 4, spec.secondary);
      p(headX + 1, 4, headW - 2, 1, shade(spec.secondary, 0.7));
      break;
    case 'work-cap':
      p(headX, 2, headW, 5, spec.secondary);
      p(headX, 2, 2, 5, shade(spec.secondary, 0.74));
      bill(shade(spec.secondary, 0.78), 5);
      break;
    case 'vendor-cap':
      p(headX, 2, headW, 5, spec.secondary);
      p(headX + 2, 2, 2, 5, spec.primary);
      p(headX + headW - 3, 2, 2, 5, spec.primary);
      bill(shade(spec.primary, 0.8), 5);
      break;
    case 'wide-brim':
      p(headX - 3, 4, headW + 7, 2, spec.secondary);
      p(headX + 1, 1, headW - 1, 4, spec.primary);
      p(headX + 1, 4, headW - 1, 1, shade(spec.secondary, 0.72));
      if (!rear) {
        p(headX + 2, 8, headW - 1, 2, '#293044');
        p(headX + 3, 8, 2, 1, '#9fc6d1');
      }
      break;
    case 'marshall-cap':
      p(headX, 2, headW, 5, spec.primary);
      p(centre - 1, 3, 3, 2, spec.secondary);
      bill(shade(spec.primary, 0.72), 5);
      break;
    case 'sun-hat':
      p(headX - 3, 4, headW + 7, 2, spec.secondary);
      p(headX + 1, 1, headW - 1, 4, spec.secondary);
      p(headX + 1, 4, headW - 1, 1, shade(spec.secondary, 0.76));
      p(headX - 2, 6, 2, 4, '#d8c58c');
      break;
    case 'straw-hat':
      p(headX - 4, 4, headW + 8, 2, spec.secondary);
      p(headX + 1, 1, headW - 1, 4, spec.secondary);
      p(headX + 1, 4, headW - 1, 1, spec.primary);
      break;
  }

  // Profession details remain readable when tools overlap the torso.
  const detailX = torsoX + 2;
  switch (kind) {
    case 'clubpro':
      p(detailX, 17, 2, 8, '#f5f0dc');
      p(torsoX + torsoW - 3, 17, 2, 8, '#f5f0dc');
      if (!rear) p(centre, 16, 2, 7, '#d85745');
      break;
    case 'ranger':
      p(detailX, 18, 3, 2, '#e1c465');
      p(torsoX + torsoW - 3, 18, 3, 3, '#303b36');
      pixelLine(p, torsoX + torsoW - 2, 18, torsoX + torsoW - 2, 14, '#303b36');
      break;
    case 'groundskeeper':
      p(detailX, 17, 2, 8, '#ead8b4');
      p(torsoX + torsoW - 3, 17, 2, 8, '#ead8b4');
      break;
    case 'sodavendor':
      p(detailX, 17, torsoW - 4, 8, '#f7e7bf');
      p(centre - 1, 19, 3, 3, '#d54b45');
      break;
    case 'celebrity':
      p(centre - 2, 16, 5, 2, spec.secondary);
      p(centre - 1, 18, 3, 3, '#fff2a2');
      break;
    case 'marshall':
      p(torsoX + 1, 17, torsoW - 2, 3, spec.secondary);
      p(centre - 1, 17, 2, 8, spec.primary);
      p(torsoX + torsoW - 3, 18, 2, 2, '#5f381d');
      break;
    case 'turftech':
      p(detailX, 18, torsoW - 4, 7, '#d9e2bd');
      p(detailX + 1, 22, torsoW - 6, 1, '#6b7d55');
      break;
    case 'refreshment':
      p(detailX, 17, torsoW - 4, 8, '#f5ead1');
      p(detailX + 1, 19, torsoW - 6, 2, '#e3bd5f');
      break;
  }

  // Arm swing is opposite the leading foot. Working arms stay near the prop.
  const armX = shouldersX + shouldersW - 2;
  p(armX, 17, 3, 5, spec.primary);
  const armShift = working ? 0 : frame === 'walkA' ? 2 : -2;
  pixelLine(p, armX + 1, 21, armX + 1 + armShift, 26, skin, 2);
  if (!side) {
    p(shouldersX, 17, 3, 5, spec.primary);
    pixelLine(p, shouldersX + 1, 21, shouldersX + 1 - armShift, 26, skin, 2);
  }

  switch (spec.tool) {
    case 'clipboard': {
      const y = working ? (alternate ? 15 : 13) : 19;
      p(21, y, 7, 10, '#d9ad55');
      p(22, y + 1, 5, 7, '#f5edcf');
      p(23, y - 1, 3, 2, '#6b5135');
      if (working) pixelLine(p, 23, y + 3, 26, y + 3 + Number(alternate), '#4e6c94');
      break;
    }
    case 'binoculars':
      if (working) {
        const y = alternate ? 8 : 10;
        p(20, 12, 3, 3, skin);
        p(20, y, 8, 4, '#263c39');
        p(21, y, 2, 2, '#7eb0b2');
        p(26, y, 2, 2, '#7eb0b2');
      } else {
        p(20, 20, 7, 4, '#263c39');
        p(21, 21, 2, 2, '#7eb0b2');
        p(25, 21, 2, 2, '#7eb0b2');
        pixelLine(p, 21, 20, 19, 16, '#303b36');
      }
      break;
    case 'rake': {
      const tipX = working ? (alternate ? 29 : 30) : 29;
      const tipY = working ? (alternate ? 34 : 31) : 34;
      pixelLine(p, 20, 20, tipX, tipY, '#79532c', 2);
      pixelLine(p, tipX - 4, tipY, tipX + 3, tipY, '#60676a', 2);
      if (tipY <= 34) for (let i = -3; i <= 2; i += 2) p(tipX + i, tipY + 1, 1, 2, '#60676a');
      break;
    }
    case 'soda-tray': {
      const y = working ? (alternate ? 17 : 14) : 20;
      pixelLine(p, 19, 24, 29, y + 2, '#5f4434', 2);
      p(21, y + 1, 11, 2, '#d8c09b');
      p(22, y - 4, 3, 5, '#e94c43');
      p(27, y - 3, 3, 4, '#f1d650');
      pixelLine(p, 23, y - 4, 24, y - 7, '#f3f1dc');
      break;
    }
    case 'autograph-book': {
      const y = working ? (alternate ? 15 : 12) : 19;
      p(21, y, 10, 8, '#f4e8c7');
      p(26, y, 1, 8, '#774c91');
      if (working) pixelLine(p, 22, y + 2, 25, y + 4, '#40536e');
      p(30, y - 2, 3, 3, spec.secondary);
      break;
    }
    case 'pace-paddle': {
      const top = working ? (alternate ? 10 : 7) : 15;
      pixelLine(p, 21, 25, 26, top + 5, '#734d2e', 2);
      p(22, top, 9, 8, '#f3d54e');
      p(24, top + 2, 5, 4, alternate && working ? '#d54b45' : '#497a43');
      break;
    }
    case 'watering-can': {
      const canX = working ? (alternate ? 23 : 21) : 20;
      const canY = working ? (alternate ? 23 : 20) : 23;
      p(canX, canY, 7, 6, '#668fa0');
      p(canX + 1, canY + 1, 5, 2, '#91bac0');
      pixelLine(p, canX + 1, canY, canX + 1, canY - 3, '#4c6f78', 2);
      pixelLine(p, canX + 1, canY - 3, canX + 5, canY - 3, '#4c6f78', 2);
      pixelLine(p, canX + 7, canY + 1, 34, working ? canY + 4 : canY + 2, '#4c6f78', 2);
      if (working) {
        p(33, Math.min(35, canY + 6), 1, 2, '#7fc3d2');
        p(30, Math.min(34, canY + 8 - Number(alternate)), 1, 2, '#7fc3d2');
      }
      break;
    }
    case 'cocktail-tray': {
      const y = working ? (alternate ? 17 : 14) : 20;
      pixelLine(p, 19, 24, 30, y + 2, '#6c4c37', 2);
      p(21, y + 1, 12, 2, '#d8c7a8');
      p(22, y - 4, 3, 5, '#ef7b6d');
      p(28, y - 3, 3, 4, '#7dc7c8');
      p(23, y - 5, 1, 1, '#7cab4a');
      p(29, y - 4, 1, 1, '#f3d14f');
      break;
    }
  }

  const done = outlined(art, '#202b28');
  cache.set(key, done);
  return done;
}

/* ================= buildings =================
   Facilities are baked as isometric pixel sprites: 1 sprite px = 1 css px at
   zoom 1 (TWs/THs match the tile size), so zooming in gives chunky pixels
   that match the golfers and trees. All art is original, styled after
   early-2000s tycoon games: striped awnings, chunky roofs, little props. */

const TWs = 36;
const THs = 18;

export interface BSprite {
  cv: HTMLCanvasElement;
  ax: number; // anchor: canvas px of the footprint centre
  ay: number;
}
const bcache = new Map<string, BSprite>();

type P2 = [number, number];
function poly(ctx: CanvasRenderingContext2D, pts: P2[], fill: string, stroke?: string) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
const mix = (a: P2, b: P2, t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const up = (p: P2, h: number): P2 => [p[0], p[1] - h];

/** Compact top-down commuter aircraft that matches the pixel-world scale. */
export function facilityPlaneSprite(withOutline = true): HTMLCanvasElement {
  const key = 'facility-plane-v3-' + (withOutline ? 'outlined' : 'raw');
  const hit = cache.get(key);
  if (hit) return hit;
  const [art, ctx] = makeCanvas(44, 40);
  // Wingspan is intentionally close to fuselage length: this reads as an
  // aircraft even when the sprite is only a few dozen screen pixels wide.
  poly(ctx, [[29, 18], [23, 3], [17, 3], [20, 19]], '#c8cecb', '#667278');
  poly(ctx, [[29, 22], [23, 37], [17, 37], [20, 21]], '#adb8b7', '#59666d');
  poly(ctx, [[13, 18], [8, 12], [4, 12], [8, 20]], '#c8ceca', '#59666d');
  poly(ctx, [[13, 22], [8, 28], [4, 28], [8, 20]], '#aeb8b6', '#59666d');
  poly(ctx, [[4, 18], [31, 17], [38, 18], [42, 20], [38, 22], [31, 23], [4, 22], [1, 20]], '#e5e7df', '#3d4b52');
  ctx.fillStyle = '#f7f3e8';
  ctx.fillRect(10, 18, 23, 2);
  ctx.fillStyle = '#47788c';
  ctx.fillRect(33, 18, 5, 2);
  ctx.fillStyle = '#345f70';
  ctx.fillRect(32, 20, 6, 2);
  poly(ctx, [[20, 10], [25, 11], [25, 15], [19, 14]], '#68777b', '#36444a');
  poly(ctx, [[20, 30], [25, 29], [25, 25], [19, 26]], '#58676c', '#344249');
  ctx.fillStyle = '#a43e35';
  ctx.fillRect(5, 18, 5, 4);
  const done = withOutline ? outlined(art, '#293940') : art;
  cache.set(key, done);
  return done;
}

/** Low-profile launch viewed from above; no oversized vertical sail. */
export function facilityBoatSprite(withOutline = true): HTMLCanvasElement {
  const key = 'facility-boat-v3-' + (withOutline ? 'outlined' : 'raw');
  const hit = cache.get(key);
  if (hit) return hit;
  const [art, ctx] = makeCanvas(34, 16);
  poly(ctx, [[2, 4], [25, 3], [32, 8], [25, 13], [2, 12], [0, 8]], '#e2dfd3', '#33464f');
  poly(ctx, [[7, 5], [24, 5], [28, 8], [24, 11], [7, 11]], '#b94437', '#78372f');
  poly(ctx, [[13, 5], [23, 5], [25, 8], [23, 10], [13, 10]], '#f1e7cf', '#59666b');
  ctx.fillStyle = '#3e7187';
  ctx.fillRect(17, 6, 6, 3);
  ctx.fillStyle = '#f2c95e';
  ctx.fillRect(29, 7, 2, 2);
  const done = withOutline ? outlined(art, '#293b43') : art;
  cache.set(key, done);
  return done;
}

export function wildlifeSprite(kind: 'duck' | 'rabbit' | 'deer' | 'squirrel'): HTMLCanvasElement {
  const key = 'wildlife-v1-' + kind;
  const hit = cache.get(key);
  if (hit) return hit;
  const [art, ctx] = makeCanvas(32, 30);
  if (kind === 'duck') {
    ctx.fillStyle = '#8b6940';
    ctx.beginPath();
    ctx.ellipse(14, 21, 9, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#634b31';
    ctx.beginPath();
    ctx.ellipse(12, 20, 5, 3, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#315844';
    ctx.beginPath();
    ctx.arc(23, 14, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(20, 15, 4, 6);
    ctx.fillStyle = '#d7a13b';
    ctx.fillRect(26, 14, 5, 2);
    ctx.fillStyle = '#f2eee0';
    ctx.fillRect(20, 16, 4, 2);
  } else if (kind === 'rabbit') {
    ctx.fillStyle = '#8a7a68';
    ctx.beginPath();
    ctx.ellipse(14, 22, 9, 5.5, -0.08, 0, Math.PI * 2);
    ctx.arc(23, 17, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#695c50';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(21, 14);
    ctx.lineTo(19, 4);
    ctx.moveTo(24, 14);
    ctx.lineTo(26, 4);
    ctx.stroke();
    ctx.fillStyle = '#efe9dc';
    ctx.beginPath();
    ctx.arc(5, 19, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#24231f';
    ctx.fillRect(25, 16, 1.5, 1.5);
  } else if (kind === 'squirrel') {
    // small hunched body, big bushy tail curled up over the back — the silhouette that reads instantly
    ctx.fillStyle = '#a15b30';
    ctx.beginPath();
    ctx.ellipse(13, 21, 6, 4.5, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(19, 17, 3.6, 0, Math.PI * 2); // head
    ctx.fill();
    ctx.fillStyle = '#c98a52';
    ctx.beginPath();
    ctx.ellipse(12, 22, 4, 2.6, -0.1, 0, Math.PI * 2); // belly
    ctx.fill();
    // bushy curled tail, thick strokes fanning up and over
    ctx.strokeStyle = '#a15b30';
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      ctx.lineWidth = 3.4 - i * 0.3;
      ctx.beginPath();
      ctx.moveTo(7 + i * 0.6, 22 - i * 0.5);
      ctx.quadraticCurveTo(1 - i, 12 - i * 1.5, 8 + i, 5 + i * 0.5);
      ctx.stroke();
    }
    ctx.fillStyle = '#5c3418';
    ctx.beginPath();
    ctx.moveTo(17, 14);
    ctx.lineTo(16, 10);
    ctx.lineTo(19, 13);
    ctx.fill(); // ear
    ctx.fillStyle = '#1e1712';
    ctx.fillRect(21, 16, 1.4, 1.4); // eye
    ctx.fillStyle = '#7a4a26';
    ctx.fillRect(20, 19, 3, 1.6); // paws holding an acorn
    ctx.fillStyle = '#8b5b35';
    ctx.beginPath();
    ctx.arc(22, 19, 1.4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#573d28';
    ctx.fillRect(8, 21, 3, 8);
    ctx.fillRect(16, 21, 3, 8);
    ctx.fillRect(22, 20, 3, 9);
    ctx.fillStyle = '#8b5b35';
    ctx.beginPath();
    ctx.ellipse(14, 18, 11, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    poly(ctx, [[20, 18], [22, 8], [26, 7], [27, 17]], '#8b5b35');
    ctx.beginPath();
    ctx.ellipse(27, 7, 4.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    poly(ctx, [[24, 5], [21, 1], [25, 3]], '#8b5b35');
    poly(ctx, [[28, 5], [31, 2], [30, 7]], '#8b5b35');
    ctx.fillStyle = '#d4ae75';
    ctx.fillRect(10, 16, 2, 2);
    ctx.fillRect(15, 19, 2, 2);
    ctx.fillRect(19, 15, 2, 2);
    ctx.fillStyle = '#1e211d';
    ctx.fillRect(29, 7, 1, 1);
  }
  const done = outlined(art, '#26372e');
  cache.set(key, done);
  return done;
}

interface BoxOpts {
  wall: string;
  roofC: string;
  wallH: number;
  roofH?: number;
  roof?: 'gable' | 'flat' | 'hip';
  roofStripes?: string;
  winRows?: number;
  winCols?: number; // per SW face
  door?: boolean;
  awning?: [string, string]; // striped canopy over the SW face
}

/** Iso box with pixel-era detailing. `c` maps tile coords -> canvas px. */
function isoBox(ctx: CanvasRenderingContext2D, c: (x: number, y: number) => P2, w: number, h: number, o: BoxOpts) {
  const A = c(0, 0);
  const B = c(w, 0);
  const C = c(w, h);
  const D = c(0, h);
  const base = [A, B, C, D];
  const top = base.map((p) => up(p, o.wallH));
  const edgeUnits = [w, h, w, h];
  const front = base.reduce((best, p, i) => (p[1] > base[best][1] ? i : best), 0);
  const faces = [
    { from: front, to: (front + 3) % 4, units: edgeUnits[(front + 3) % 4] },
    { from: front, to: (front + 1) % 4, units: edgeUnits[front] },
  ];

  for (const face of faces) {
    const lit = base[face.to][0] > base[face.from][0];
    poly(ctx, [base[face.from], base[face.to], top[face.to], top[face.from]], shade(o.wall, lit ? 0.84 : 0.68));
    poly(ctx, [base[face.from], base[face.to], up(base[face.to], 2), up(base[face.from], 2)], shade(o.wall, lit ? 0.58 : 0.48));
  }

  const winFace = (p0: P2, p1: P2, q0: P2, q1: P2, cols: number, rows: number) => {
    for (let r = 0; r < rows; r++)
      for (let i = 0; i < cols; i++) {
        const t0 = (i + 0.3) / cols;
        const t1 = (i + 0.7) / cols;
        const v0 = 0.25 + (r / rows) * 0.55;
        const v1 = v0 + 0.3 / rows;
        const a = mix(p0, p1, t0);
        const b = mix(p0, p1, t1);
        const qa = mix(q0, q1, t0);
        const qb = mix(q0, q1, t1);
        poly(ctx, [mix(a, qa, v0), mix(b, qb, v0), mix(b, qb, v1), mix(a, qa, v1)], '#cfe6f2');
        // sill highlight
        poly(ctx, [mix(a, qa, v1), mix(b, qb, v1), mix(b, qb, v1 + 0.04), mix(a, qa, v1 + 0.04)], 'rgba(255,255,255,.55)');
      }
  };
  const rows = o.winRows ?? 1;
  if (rows > 0)
    for (const face of faces) winFace(base[face.from], base[face.to], top[face.from], top[face.to], o.winCols ?? Math.max(1, Math.round(face.units)), rows);

  const entryFace = faces.find((face) => base[face.to][0] < base[face.from][0]) ?? faces[0];
  if (o.door) {
    const a = mix(base[entryFace.from], base[entryFace.to], 0.14);
    const b = mix(base[entryFace.from], base[entryFace.to], 0.4);
    const qa = mix(top[entryFace.from], top[entryFace.to], 0.14);
    const qb = mix(top[entryFace.from], top[entryFace.to], 0.4);
    poly(ctx, [a, b, mix(b, qb, 0.8), mix(a, qa, 0.8)], '#6e4a2c');
    poly(ctx, [mix(a, b, 0.75), b, mix(b, qb, 0.78), mix(mix(a, b, 0.75), mix(qa, qb, 0.75), 0.78)], '#8a6238');
  }
  if (o.awning) {
    const y0 = o.wallH * 0.62;
    const a = up(mix(base[entryFace.from], base[entryFace.to], 0.05), y0);
    const b = up(mix(base[entryFace.from], base[entryFace.to], 0.5), y0);
    const outward = base[entryFace.to][0] < base[entryFace.from][0] ? -5 : 5;
    const ao: P2 = [a[0] + outward, a[1] + 7];
    const bo: P2 = [b[0] + outward, b[1] + 7];
    const N = 5;
    for (let i = 0; i < N; i++) {
      poly(ctx, [mix(a, b, i / N), mix(a, b, (i + 1) / N), mix(ao, bo, (i + 1) / N), mix(ao, bo, i / N)], i % 2 ? o.awning[0] : o.awning[1]);
    }
    poly(ctx, [ao, bo, [bo[0], bo[1] + 1.5], [ao[0], ao[1] + 1.5]], 'rgba(0,0,0,.25)');
  }
  // roof
  const roofH = o.roofH ?? 10;
  if (o.roof === 'flat') {
    poly(ctx, top, o.roofC);
    for (let i = 0; i < 4; i++) poly(ctx, [up(top[i], 2), up(top[(i + 1) % 4], 2), top[(i + 1) % 4], top[i]], shade(o.roofC, i & 1 ? 0.9 : 1.1));
    return { ridge: up(mix(top[0], top[2], 0.5), 2) };
  }
  const alongX = w >= h;
  const Ra = up(alongX ? c(0, h / 2) : c(w / 2, 0), o.wallH + roofH);
  const Rb = up(alongX ? c(w, h / 2) : c(w / 2, h), o.wallH + roofH);
  const slopes: P2[][] = alongX ? [[top[0], top[1], Rb, Ra], [top[3], top[2], Rb, Ra]] : [[top[0], top[3], Rb, Ra], [top[1], top[2], Rb, Ra]];
  slopes.sort((p, q) => p.reduce((n, v) => n + v[1], 0) - q.reduce((n, v) => n + v[1], 0));
  poly(ctx, slopes[0], shade(o.roofC, 1.08));
  poly(ctx, slopes[1], shade(o.roofC, 0.85));
  if (o.roofStripes) {
    ctx.strokeStyle = o.roofStripes;
    ctx.lineWidth = 1.5;
    for (let t = 0.25; t < 1; t += 0.25) {
      ctx.beginPath();
      const s0 = mix(slopes[1][0], Ra, t);
      const s1 = mix(slopes[1][1], Rb, t);
      ctx.moveTo(s0[0], s0[1]);
      ctx.lineTo(s1[0], s1[1]);
      ctx.stroke();
    }
  }
  const gables: P2[][] = alongX ? [[top[0], top[3], Ra], [top[1], top[2], Rb]] : [[top[0], top[1], Ra], [top[3], top[2], Rb]];
  gables.sort((p, q) => p.reduce((n, v) => n + v[1], 0) - q.reduce((n, v) => n + v[1], 0));
  poly(ctx, gables[0], shade(o.wall, 0.82));
  poly(ctx, gables[1], shade(o.wall, 0.72));
  // ridge cap
  ctx.strokeStyle = shade(o.roofC, 1.25);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(Ra[0], Ra[1]);
  ctx.lineTo(Rb[0], Rb[1]);
  ctx.stroke();
  return { ridge: mix(Ra, Rb, 0.5) };
}

/** Flat ground feature drawn as a diamond panel (courts, greens, strips). */
function isoPanel(ctx: CanvasRenderingContext2D, c: (x: number, y: number) => P2, w: number, h: number, inset: number, fill: string, edge: string) {
  const A = c(inset, inset);
  const B = c(w - inset, inset);
  const C = c(w - inset, h - inset);
  const D = c(inset, h - inset);
  const pts = [A, B, C, D];
  const front = pts.reduce((best, p, i) => (p[1] > pts[best][1] ? i : best), 0);
  for (const other of [(front + 3) % 4, (front + 1) % 4]) {
    const a = pts[front];
    const b = pts[other];
    poly(ctx, [a, b, [b[0], b[1] + 2], [a[0], a[1] + 2]], edge);
  }
  poly(ctx, pts, fill, edge);
  return { A, B, C, D };
}

function makeB(key: string, cw: number, ch: number, w: number, h: number, draw: (ctx: CanvasRenderingContext2D, c: (x: number, y: number) => P2) => void): BSprite {
  const hit = bcache.get(key);
  if (hit) return hit;
  const [art, ctx] = makeCanvas(cw, ch);
  const ox = (h * TWs) / 2 + 6; // canvas px of tile corner (0,0)
  const oy = ch - ((w + h) * THs) / 2 - 8;
  const c = (x: number, y: number): P2 => [ox + ((x - y) * TWs) / 2, oy + ((x + y) * THs) / 2];
  draw(ctx, c);
  const done = outlined(art, 'rgba(25,30,40,.75)');
  const anchor = c(w / 2, h / 2);
  const spr = { cv: done, ax: anchor[0], ay: anchor[1] };
  bcache.set(key, spr);
  return spr;
}

function makeFacility(key: string, w: number, h: number, headroom: number, rotation: number, draw: (ctx: CanvasRenderingContext2D, c: (x: number, y: number) => P2) => void): BSprite {
  const cacheKey = key + '@' + w + 'x' + h + 'r' + (rotation & 3);
  const hit = bcache.get(cacheKey);
  if (hit) return hit;
  const cw = Math.ceil((w + h) * TWs * 0.5 + 14);
  const ch = Math.ceil((w + h) * THs * 0.5 + headroom + 14);
  const [art, ctx] = makeCanvas(cw, ch);
  const viewW = rotation & 1 ? h : w;
  const viewH = rotation & 1 ? w : h;
  const ox = (viewH * TWs) / 2 + 6;
  const oy = ch - ((viewW + viewH) * THs) / 2 - 8;
  const c = (x: number, y: number): P2 => {
    let rx = x;
    let ry = y;
    switch (rotation & 3) {
      case 1: rx = y; ry = w - x; break;
      case 2: rx = w - x; ry = h - y; break;
      case 3: rx = h - y; ry = x; break;
    }
    return [ox + ((rx - ry) * TWs) / 2, oy + ((rx + ry) * THs) / 2];
  };
  draw(ctx, c);
  const done = outlined(art, 'rgba(25,30,40,.75)');
  const anchor = c(w / 2, h / 2);
  const spr = { cv: done, ax: anchor[0], ay: anchor[1] };
  bcache.set(cacheKey, spr);
  return spr;
}

function shrub(ctx: CanvasRenderingContext2D, p: P2, color = '#3f7839') {
  ctx.fillStyle = '#244d2b';
  ctx.beginPath();
  ctx.ellipse(p[0] + 1, p[1] + 1, 5, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  for (const [dx, dy, r] of [[-3, -2, 3], [1, -3, 3.5], [4, -1, 2.7]] as [number, number, number][]) {
    ctx.beginPath();
    ctx.arc(p[0] + dx, p[1] + dy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function lamp(ctx: CanvasRenderingContext2D, p: P2, h = 18) {
  ctx.strokeStyle = '#454c53';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(p[0], p[1]);
  ctx.lineTo(p[0], p[1] - h);
  ctx.stroke();
  ctx.fillStyle = '#fff2b2';
  ctx.strokeStyle = '#454c53';
  ctx.fillRect(p[0] - 2.5, p[1] - h - 2, 5, 3);
  ctx.strokeRect(p[0] - 2.5, p[1] - h - 2, 5, 3);
}

const FLAG_RED = '#d0453a';
function miniFlag(ctx: CanvasRenderingContext2D, x: number, y: number, hgt: number) {
  ctx.strokeStyle = '#f3efe2';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - hgt);
  ctx.stroke();
  poly(ctx, [[x, y - hgt], [x + 7, y - hgt + 2.5], [x, y - hgt + 5]], FLAG_RED);
}

const DEFAULT_FOOTPRINTS: Record<string, [number, number]> = {
  clubhouse: [2, 2],
  proshop: [3, 2],
  snackbar: [2, 2],
  cartgarage: [3, 2],
  hotel: [4, 3],
  tennis: [3, 2],
  puttinggreen: [3, 3],
  drivingrange: [6, 3],
  marina: [5, 3],
  airstrip: [8, 3],
};

export function buildingSprite(kind: string, footprintW?: number, footprintH?: number, rotation = 0): BSprite {
  const [defaultW, defaultH] = DEFAULT_FOOTPRINTS[kind] ?? [2, 2];
  const w = footprintW ?? defaultW;
  const h = footprintH ?? defaultH;
  switch (kind) {
    case 'clubhouse':
      return makeFacility(kind, w, h, 70, rotation, (ctx, c) => {
        isoPanel(ctx, c, w, h, 0.05, '#a9bd83', '#49663d');
        const bc = (x: number, y: number): P2 => c(0.16 + x * ((w - 0.32) / 2), 0.14 + y * ((h - 0.45) / 1.7));
        const r = isoBox(ctx, bc, 2, 1.7, { wall: '#f6efdc', roofC: '#a63e34', wallH: 27, roofH: 15, roofStripes: 'rgba(255,255,255,.25)', winRows: 1, winCols: 2, door: true, awning: ['#b43f35', '#f4e9d4'] });
        // Central cupola gives the clubhouse a silhouette no other building has.
        const cup = (x: number, y: number): P2 => c(w * 0.42 + x * 0.45, h * 0.28 + y * 0.42);
        isoBox(ctx, cup, 1, 1, { wall: '#f4ead5', roofC: '#a63e34', wallH: 10, roofH: 7, winRows: 1 });
        miniFlag(ctx, r.ridge[0], r.ridge[1] - 2, 20);
        shrub(ctx, c(0.3, h - 0.18));
        shrub(ctx, c(w - 0.28, h - 0.2), '#537f3d');
        lamp(ctx, c(w * 0.53, h - 0.1), 17);
      });
    case 'proshop':
      return makeFacility(kind, w, h, 62, rotation, (ctx, c) => {
        isoPanel(ctx, c, w, h, 0.06, '#b8aa82', '#6f6145');
        const bw = Math.max(1.5, w - 0.55);
        const bh = Math.max(1.15, h - 0.58);
        const bc = (x: number, y: number): P2 => c(0.18 + x, 0.12 + y);
        isoBox(ctx, bc, bw, bh, { wall: '#e5d9bd', roofC: '#315f86', wallH: 22, roofH: 12, roofStripes: 'rgba(255,255,255,.22)', winRows: 1, winCols: 3, door: true, awning: ['#315f86', '#eee7d7'] });
        // Large circular golf-ball sign and display clubs make it legible at a glance.
        const g = c(w - 0.35, 0.65);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(g[0], g[1] - 29, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#315f86';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#6d91ad';
        for (const [dx, dy] of [[-2, -2], [2, -1], [0, 2]] as [number, number][]) ctx.fillRect(g[0] + dx, g[1] - 29 + dy, 1, 1);
        const clubs = c(w - 0.22, h - 0.3);
        ctx.strokeStyle = '#5b6268';
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(clubs[0] + i * 2, clubs[1]);
          ctx.lineTo(clubs[0] + i * 2 - 3, clubs[1] - 15 - i);
          ctx.stroke();
        }
        shrub(ctx, c(0.25, h - 0.18));
      });
    case 'snackbar':
      return makeFacility(kind, w, h, 54, rotation, (ctx, c) => {
        isoPanel(ctx, c, w, h, 0.06, '#c2aa7a', '#715e3d');
        const bc = (x: number, y: number): P2 => c(0.12 + x * 0.95, 0.08 + y * 0.85);
        isoBox(ctx, bc, 1.55, 1.25, { wall: '#f0d49c', roofC: '#b94437', wallH: 16, roofH: 9, roofStripes: 'rgba(255,255,255,.26)', winRows: 1, winCols: 2, door: true, awning: ['#bd4337', '#fff1d2'] });
        // Patio furniture makes the small scale intentional instead of underbuilt.
        const u0 = c(w - 0.28, h - 0.3);
        ctx.strokeStyle = '#7a5233';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(u0[0], u0[1]);
        ctx.lineTo(u0[0], u0[1] - 14);
        ctx.stroke();
        for (let i = 0; i < 6; i++)
          poly(
            ctx,
            [
              [u0[0], u0[1] - 14],
              [u0[0] - 10 + i * (20 / 6), u0[1] - 8],
              [u0[0] - 10 + (i + 1) * (20 / 6), u0[1] - 8],
            ],
            i % 2 ? '#d6503f' : '#fff1d2'
          );
        ctx.fillStyle = '#724b2a';
        ctx.fillRect(u0[0] - 5, u0[1] - 1, 10, 2);
        ctx.fillRect(u0[0] - 1, u0[1] - 1, 2, 5);
      });
    case 'cartgarage':
      return makeFacility(kind, w, h, 54, rotation, (ctx, c) => {
        isoPanel(ctx, c, w, h, 0.05, '#8c9294', '#5a6061');
        const bc = (x: number, y: number): P2 => c(0.16 + x, 0.12 + y);
        const bw = Math.max(1.5, w - 0.5);
        const bh = Math.max(0.9, h - 0.82);
        isoBox(ctx, bc, bw, bh, { wall: '#c9ced0', roofC: '#5a6870', wallH: 18, roof: 'flat', winRows: 0 });
        // Three clearly separated roller bays.
        const C0 = bc(bw, bh);
        const D0 = bc(0, bh);
        for (let bay = 0; bay < 3; bay++) {
          const a = mix(C0, D0, 0.08 + bay * 0.3);
          const b = mix(C0, D0, 0.31 + bay * 0.3);
          poly(ctx, [a, b, up(b, 13), up(a, 13)], bay === 1 ? '#9fa7aa' : '#b7bec0', '#687176');
          ctx.strokeStyle = 'rgba(52,61,65,.45)';
          for (let i = 1; i < 5; i++) {
            ctx.beginPath();
            ctx.moveTo(a[0], a[1] - i * 2.5);
            ctx.lineTo(b[0], b[1] - i * 2.5);
            ctx.stroke();
          }
        }
        for (let cart = 0; cart < 2; cart++) {
          const k = c(w - 0.35 - cart * 0.5, h - 0.2 - cart * 0.16);
          poly(ctx, [[k[0] - 6, k[1]], [k[0] + 5, k[1] - 3], [k[0] + 5, k[1] - 8], [k[0] - 6, k[1] - 5]], cart ? '#e7b84d' : '#f2f0e8', '#41484d');
          poly(ctx, [[k[0] - 3, k[1] - 5], [k[0] + 3, k[1] - 7], [k[0] + 3, k[1] - 11], [k[0] - 3, k[1] - 9]], '#315f86');
          ctx.fillStyle = '#252a2d';
          ctx.beginPath();
          ctx.arc(k[0] - 3, k[1] + 0.5, 1.8, 0, Math.PI * 2);
          ctx.arc(k[0] + 4, k[1] - 2, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    case 'hotel':
      return makeFacility(kind, w, h, 88, rotation, (ctx, c) => {
        isoPanel(ctx, c, w, h, 0.05, '#aeb98a', '#536748');
        // Pool and terrace remain visible in front of the taller hotel block.
        const pool = [c(w * 0.58, h * 0.74), c(w * 0.88, h * 0.74), c(w * 0.88, h * 0.94), c(w * 0.58, h * 0.94)];
        poly(ctx, pool, '#4b9fc2', '#e6ddc4');
        ctx.strokeStyle = 'rgba(219,246,247,.65)';
        ctx.beginPath();
        ctx.moveTo(pool[0][0] + 3, pool[0][1]);
        ctx.lineTo(pool[2][0] - 3, pool[2][1]);
        ctx.stroke();
        const bc = (x: number, y: number): P2 => c(0.18 + x, 0.1 + y);
        const bw = Math.max(2, w - 0.55);
        const bh = Math.max(1.4, h - 0.95);
        isoBox(ctx, bc, bw, bh, { wall: '#eadfc7', roofC: '#83374e', wallH: 48, roofH: 13, roofStripes: 'rgba(255,255,255,.18)', winRows: 4, winCols: 4, door: true, awning: ['#8c3a52', '#f2ede0'] });
        // Entrance porte-cochère and rooftop sign add resort identity.
        const e0 = c(w * 0.25, h * 0.78);
        const e1 = c(w * 0.48, h * 0.78);
        poly(ctx, [up(e0, 8), up(e1, 8), [e1[0] - 5, e1[1] - 3], [e0[0] - 5, e0[1] - 3]], '#9d435b', '#633144');
        for (const p of [e0, e1]) {
          ctx.strokeStyle = '#eee4cf';
          ctx.beginPath();
          ctx.moveTo(p[0], p[1]);
          ctx.lineTo(p[0], p[1] - 8);
          ctx.stroke();
        }
        const sign = c(w * 0.48, h * 0.35);
        ctx.fillStyle = '#fff0c6';
        ctx.strokeStyle = '#633144';
        ctx.fillRect(sign[0] - 13, sign[1] - 64, 26, 7);
        ctx.strokeRect(sign[0] - 13, sign[1] - 64, 26, 7);
        ctx.fillStyle = '#83374e';
        ctx.font = 'bold 5px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('RESORT', sign[0], sign[1] - 59);
        shrub(ctx, c(0.25, h - 0.16));
        lamp(ctx, c(w - 0.25, h - 0.18), 21);
      });
    case 'tennis':
      return makeFacility(kind, w, h, 34, rotation, (ctx, c) => {
        isoPanel(ctx, c, w, h, 0.04, '#365e49', '#263f35');
        const A = c(0.22, 0.22);
        const B = c(w - 0.22, 0.22);
        const C = c(w - 0.22, h - 0.22);
        const D = c(0.22, h - 0.22);
        poly(ctx, [A, B, C, D], '#3d9261', '#edf4e8');
        ctx.strokeStyle = 'rgba(244,249,236,.9)';
        ctx.lineWidth = 1;
        for (const [p0, p1] of [
          [c(w / 2, 0.22), c(w / 2, h - 0.22)],
          [c(0.22, h / 2), c(w - 0.22, h / 2)],
          [c(w * 0.25, 0.22), c(w * 0.25, h - 0.22)],
          [c(w * 0.75, 0.22), c(w * 0.75, h - 0.22)],
        ] as [P2, P2][]) {
          ctx.beginPath();
          ctx.moveTo(p0[0], p0[1]);
          ctx.lineTo(p1[0], p1[1]);
          ctx.stroke();
        }
        const n0 = c(w / 2, 0.16);
        const n1 = c(w / 2, h - 0.16);
        ctx.strokeStyle = '#e8f4ec';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(n0[0], n0[1] - 6);
        ctx.lineTo(n1[0], n1[1] - 6);
        ctx.stroke();
        poly(ctx, [n0, n1, up(n1, 6), up(n0, 6)], 'rgba(240,245,240,.55)');
        ctx.strokeStyle = '#5a5f66';
        ctx.lineWidth = 1.4;
        for (const p of [n0, n1]) {
          ctx.beginPath();
          ctx.moveTo(p[0], p[1]);
          ctx.lineTo(p[0], p[1] - 7);
          ctx.stroke();
        }
        // Perimeter fence posts and mesh.
        const fence = [c(0.05, 0.05), c(w - 0.05, 0.05), c(w - 0.05, h - 0.05), c(0.05, h - 0.05)];
        ctx.strokeStyle = 'rgba(202,216,213,.58)';
        for (let i = 0; i < fence.length; i++) {
          const p0 = fence[i];
          const p1 = fence[(i + 1) % fence.length];
          poly(ctx, [p0, p1, up(p1, 11), up(p0, 11)], 'rgba(187,207,202,.12)', 'rgba(190,210,205,.5)');
          for (const p of [p0, p1]) {
            ctx.beginPath();
            ctx.moveTo(p[0], p[1]);
            ctx.lineTo(p[0], p[1] - 12);
            ctx.stroke();
          }
        }
      });
    case 'puttinggreen':
      return makeFacility(kind, w, h, 28, rotation, (ctx, c) => {
        isoPanel(ctx, c, w, h, 0.04, '#5b8c42', '#355f34');
        const A = c(0.28, 0.5);
        const B = c(w - 0.48, 0.24);
        const C = c(w - 0.2, h - 0.7);
        const D = c(w * 0.52, h - 0.2);
        const E = c(0.2, h * 0.64);
        poly(ctx, [A, B, C, D, E], '#76c978', '#4b9a51');
        // Checker mowing patches are broad enough to survive zooming out.
        ctx.fillStyle = 'rgba(226,250,198,.09)';
        for (let gy = 0; gy < 3; gy++)
          for (let gx = 0; gx < 3; gx++)
            if ((gx + gy) & 1) {
              const p0 = c(0.42 + gx * ((w - 0.84) / 3), 0.42 + gy * ((h - 0.84) / 3));
              const p1 = c(0.42 + (gx + 1) * ((w - 0.84) / 3), 0.42 + gy * ((h - 0.84) / 3));
              const p2 = c(0.42 + (gx + 1) * ((w - 0.84) / 3), 0.42 + (gy + 1) * ((h - 0.84) / 3));
              const p3 = c(0.42 + gx * ((w - 0.84) / 3), 0.42 + (gy + 1) * ((h - 0.84) / 3));
              poly(ctx, [p0, p1, p2, p3], 'rgba(226,250,198,.09)');
            }
        ctx.fillStyle = '#123a20';
        const holes: [number, number][] = [
          [w * 0.24, h * 0.7],
          [w * 0.54, h * 0.32],
          [w * 0.78, h * 0.64],
        ];
        for (const [hx, hy] of holes) {
          const p = c(hx, hy);
          ctx.beginPath();
          ctx.ellipse(p[0], p[1], 2.3, 1.1, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        for (let i = 0; i < holes.length; i++) {
          const f = c(holes[i][0], holes[i][1]);
          miniFlag(ctx, f[0], f[1], 12 + i * 2);
        }
        const bunker = c(w * 0.74, h * 0.18);
        ctx.fillStyle = '#e2cb8d';
        ctx.strokeStyle = '#9f854d';
        ctx.beginPath();
        ctx.ellipse(bunker[0], bunker[1], 11, 4.5, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    case 'drivingrange':
      return makeFacility(kind, w, h, 50, rotation, (ctx, c) => {
        isoPanel(ctx, c, w, h, 0.04, '#6cac48', '#456f34');
        // Alternating distance lanes and three large target greens.
        for (let lane = 0; lane < 4; lane++) {
          const y0 = 0.22 + lane * ((h - 0.44) / 4);
          const y1 = 0.22 + (lane + 1) * ((h - 0.44) / 4);
          poly(ctx, [c(1.15, y0), c(w - 0.18, y0), c(w - 0.18, y1), c(1.15, y1)], lane & 1 ? 'rgba(125,191,76,.48)' : 'rgba(153,205,91,.42)');
        }
        for (const [tx, ty, r] of [[w * 0.48, h * 0.35, 8], [w * 0.68, h * 0.7, 10], [w * 0.87, h * 0.34, 7]] as [number, number, number][]) {
          const t = c(tx, ty);
          ctx.fillStyle = '#4f8e40';
          ctx.beginPath();
          ctx.ellipse(t[0], t[1], r, r * 0.42, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#edf0d4';
          ctx.beginPath();
          ctx.ellipse(t[0], t[1], r * 0.48, r * 0.2, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        // Six covered hitting bays establish the building-scale rhythm. This is the one
        // asymmetric, identity-defining feature of the building, so at 180° it mirrors to
        // the opposite long edge instead of rotating to the (now far, occluded) far side.
        const mx = (v: number) => (rotation === 2 ? w - v : v);
        const bayX = mx(0.14);
        const bayDepthX = mx(1.12);
        const markerX = mx(0.72);
        const s0 = c(bayX, 0.12);
        const s1 = c(bayX, h - 0.12);
        poly(ctx, [up(s0, 18), up(s1, 18), up(c(bayDepthX, h - 0.12), 24), up(c(bayDepthX, 0.12), 24)], '#537a3d', '#314d30');
        ctx.strokeStyle = '#5a5f66';
        ctx.lineWidth = 1.4;
        for (let i = 0; i <= 6; i++) {
          const p = c(bayX, 0.12 + (i / 6) * (h - 0.24));
          ctx.beginPath();
          ctx.moveTo(p[0], p[1]);
          ctx.lineTo(p[0], p[1] - 18);
          ctx.stroke();
          if (i < 6) {
            const m = c(markerX, 0.12 + ((i + 0.5) / 6) * (h - 0.24));
            poly(ctx, [[m[0] - 5, m[1]], [m[0], m[1] + 2.5], [m[0] + 5, m[1]], [m[0], m[1] - 2.5]], '#315f4a', '#253d35');
          }
        }
        const netX = mx(w - 0.08);
        const n0 = c(netX, 0.08);
        const n1 = c(netX, h - 0.08);
        ctx.strokeStyle = '#8f959c';
        for (let i = 0; i <= 4; i++) {
          const p = mix(n0, n1, i / 4);
          ctx.beginPath();
          ctx.moveTo(p[0], p[1]);
          ctx.lineTo(p[0], p[1] - 42);
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(200,218,215,.42)';
        ctx.lineWidth = 1;
        for (let i = 1; i <= 7; i++) {
          ctx.beginPath();
          ctx.moveTo(n0[0], n0[1] - i * 5.5);
          ctx.lineTo(n1[0], n1[1] - i * 5.5);
          ctx.stroke();
        }
      });
    case 'marina':
      return makeFacility(kind, w, h, 56, rotation, (ctx, c) => {
        isoPanel(ctx, c, w, h, 0.04, '#2779a5', '#174f73');
        // Depth bands and ripples make this a basin rather than a blue slab.
        poly(ctx, [c(0.18, 0.18), c(w - 0.18, 0.18), c(w - 0.18, h * 0.52), c(0.18, h * 0.52)], 'rgba(91,177,197,.22)');
        ctx.strokeStyle = 'rgba(196,239,239,.3)';
        for (let i = 0; i < 7; i++) {
          const p = c(1.1 + (i / 7) * Math.max(1, w - 1.5), 0.45 + (i % 3) * 0.72);
          ctx.beginPath();
          ctx.ellipse(p[0], p[1], 7, 2, 0, 0.2, 2.8);
          ctx.stroke();
        }
        const d0 = c(0.7, h * 0.52);
        const d1 = c(w - 0.25, h * 0.52);
        poly(ctx, [d0, d1, [d1[0], d1[1] + 6], [d0[0], d0[1] + 6]], '#a9825a', '#6e4523');
        ctx.strokeStyle = 'rgba(90,60,30,.55)';
        ctx.lineWidth = 1;
        for (let t = 0.12; t < 1; t += 0.12) {
          const p = mix(d0, d1, t);
          ctx.beginPath();
          ctx.moveTo(p[0], p[1]);
          ctx.lineTo(p[0], p[1] + 6);
          ctx.stroke();
        }
        // Finger piers create berths on both sides of the main dock.
        for (let i = 1; i <= Math.max(2, Math.floor(w - 1)); i++) {
          const root = mix(d0, d1, i / Math.max(3, Math.floor(w)));
          const len = i & 1 ? -16 : 16;
          poly(ctx, [[root[0] - 2, root[1]], [root[0] + 2, root[1] - 1], [root[0] + 2, root[1] + len], [root[0] - 2, root[1] + len + 1]], '#b68a54', '#6e4523');
        }
        // The boathouse is the one corner-anchored identity feature; mirror it to the
        // opposite corner at 180° so it stays on the near side instead of the far one.
        const boathouseX0 = rotation === 2 ? w - 1.1 : 0.1;
        const bo = (x: number, y: number): P2 => c(boathouseX0 + x * 0.85, 0.08 + y * 0.78);
        isoBox(ctx, bo, 1, 1, { wall: '#e3ecf2', roofC: '#315f86', wallH: 15, roofH: 9, winRows: 1, door: true });
        // Compact launches establish scale without obscuring the dock.
        for (let i = 0; i < 2; i++) {
          const s = c(w * (0.55 + i * 0.22), h * (0.3 + i * 0.43));
          const ahead = c(w * (0.55 + i * 0.22) + 0.4, h * (0.3 + i * 0.43));
          const angle = Math.atan2(ahead[1] - s[1], ahead[0] - s[0]);
          const spr = facilityBoatSprite(false);
          ctx.save();
          ctx.imageSmoothingEnabled = false;
          ctx.translate(s[0], s[1]);
          ctx.rotate(angle);
          ctx.drawImage(spr, -9, -4.25, 18, 8.5);
          ctx.restore();
        }
        lamp(ctx, c(boathouseX0 + 0.62, h * 0.52), 17);
      });
    case 'airstrip':
      return makeFacility(kind, w, h, 58, rotation, (ctx, c) => {
        isoPanel(ctx, c, w, h, 0.03, '#5c7c45', '#354e34');
        const runway = [c(0.32, 0.62), c(w - 0.22, 0.62), c(w - 0.22, h - 0.42), c(0.32, h - 0.42)];
        poly(ctx, runway, '#747c80', '#41484c');
        // Runway shoulders, centreline, thresholds and edge lights.
        ctx.strokeStyle = '#d7d9d3';
        ctx.lineWidth = 1.2;
        for (const [a, b] of [[runway[0], runway[1]], [runway[3], runway[2]]] as [P2, P2][]) {
          ctx.beginPath();
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1]);
          ctx.stroke();
        }
        const mid0 = c(0.55, h / 2);
        const mid1 = c(w - 0.42, h / 2);
        ctx.strokeStyle = '#f2f0e8';
        ctx.lineWidth = 2;
        const dashCount = Math.max(5, Math.floor(w * 1.35));
        for (let i = 0; i < dashCount; i += 2) {
          const a = mix(mid0, mid1, i / dashCount);
          const b = mix(mid0, mid1, Math.min(1, (i + 1) / dashCount));
          ctx.beginPath();
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1]);
          ctx.stroke();
        }
        for (const x of [0.5, w - 0.4]) {
          for (let i = 0; i < 5; i++) {
            const a = c(x, 0.82 + i * ((h - 1.45) / 5));
            const b = c(x + (x < w / 2 ? 0.35 : -0.35), 0.82 + i * ((h - 1.45) / 5));
            ctx.beginPath();
            ctx.moveTo(a[0], a[1]);
            ctx.lineTo(b[0], b[1]);
            ctx.stroke();
          }
        }
        ctx.fillStyle = '#f2d36b';
        for (let i = 0; i <= Math.max(6, Math.floor(w)); i++)
          for (const yy of [0.55, h - 0.35]) {
            const p = c(0.38 + (i / Math.max(6, Math.floor(w))) * (w - 0.7), yy);
            ctx.beginPath();
            ctx.arc(p[0], p[1], 1.1, 0, Math.PI * 2);
            ctx.fill();
          }
        // A real hangar and apron occupy the service edge of the site. This — plus the
        // parked plane and windsock that key off it — is the identity feature, so it
        // mirrors to the opposite edge at 180° instead of rotating out of view.
        const hangarW = Math.max(1.25, Math.min(2, w * 0.28));
        const hangarX0 = rotation === 2 ? w - 0.12 - hangarW : 0.12;
        const hc = (x: number, y: number): P2 => c(hangarX0 + x, 0.06 + y);
        isoBox(ctx, hc, hangarW, 0.72, { wall: '#c8ced0', roofC: '#56646a', wallH: 18, roofH: 9, winRows: 0 });
        const doorA = hc(hangarW, 0.72);
        const doorB = mix(doorA, hc(0, 0.72), 0.75);
        poly(ctx, [doorA, doorB, up(doorB, 13), up(doorA, 13)], '#7d898d', '#49545a');
        ctx.strokeStyle = 'rgba(218,225,225,.38)';
        for (let i = 1; i < 5; i++) {
          ctx.beginPath();
          ctx.moveTo(doorA[0], doorA[1] - i * 2.6);
          ctx.lineTo(doorB[0], doorB[1] - i * 2.6);
          ctx.stroke();
        }
        // A compact parked commuter plane, sized against the hangar and runway.
        const pxRaw = Math.max(2.2, w * 0.68);
        const px = rotation === 2 ? w - pxRaw : pxRaw;
        const py = h * 0.5;
        const planeAt = c(px, py);
        const ahead = c(px + 0.5, py);
        const planeAngle = Math.atan2(ahead[1] - planeAt[1], ahead[0] - planeAt[0]);
        const planeSpr = facilityPlaneSprite(false);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(planeAt[0], planeAt[1]);
        ctx.rotate(planeAngle);
        ctx.fillStyle = 'rgba(28,39,42,.24)';
        ctx.beginPath();
        ctx.ellipse(2, 2, 11, 3.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.drawImage(planeSpr, -15, -13.5, 30, 27);
        ctx.restore();
        // Windsock remains a secondary detail rather than the whole identity.
        const wsk = c(rotation === 2 ? 0.24 : w - 0.24, 0.24);
        ctx.strokeStyle = '#8f959c';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(wsk[0], wsk[1]);
        ctx.lineTo(wsk[0], wsk[1] - 18);
        ctx.stroke();
        poly(ctx, [[wsk[0], wsk[1] - 18], [wsk[0] + 11, wsk[1] - 16], [wsk[0] + 11, wsk[1] - 14], [wsk[0], wsk[1] - 13]], '#e8762c');
        poly(ctx, [[wsk[0] + 4, wsk[1] - 17.2], [wsk[0] + 7, wsk[1] - 16.5], [wsk[0] + 7, wsk[1] - 14.5], [wsk[0] + 4, wsk[1] - 14]], '#fdf6e3');
      });
    case 'lot0':
      return makeB(kind, 120, 84, 2, 2, (ctx, c) => {
        // dirt pad + timber frame
        isoPanel(ctx, c, 2, 2, 0.08, '#c2a06a', '#8a6a41');
        const f = (x: number, y: number): P2 => c(0.35 + x * 1.3, 0.35 + y * 1.3);
        const A = f(0, 0);
        const B = f(1, 0);
        const C = f(1, 1);
        const D = f(0, 1);
        ctx.strokeStyle = '#b08a52';
        ctx.lineWidth = 2;
        for (const [p, q] of [
          [A, B],
          [B, C],
          [C, D],
          [D, A],
        ] as [P2, P2][]) {
          poly(ctx, [p, q, up(q, 10), up(p, 10)], 'rgba(216,184,130,.4)');
          ctx.beginPath();
          ctx.moveTo(p[0], p[1]);
          ctx.lineTo(p[0], p[1] - 10);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(B[0], B[1] - 10);
        ctx.lineTo(C[0], C[1] - 10);
        ctx.lineTo(D[0], D[1] - 10);
        ctx.stroke();
        // material pile
        const m = c(1.7, 0.35);
        poly(ctx, [[m[0] - 6, m[1]], [m[0] + 6, m[1] - 2], [m[0] + 6, m[1] - 6], [m[0] - 6, m[1] - 4]], '#a9825a', '#6e4523');
      });
    default: {
      // houses: 'house<stage>_<variant>'
      const m = /^house([12])_(\d)$/.exec(kind);
      if (m) {
        const stage = +m[1];
        const vi = +m[2] % HOUSE_WALLS.length;
        return makeB(kind, 120, stage === 1 ? 92 : 112, 2, 2, (ctx, c) => {
          // garden
          isoPanel(ctx, c, 2, 2, 0.06, '#7fb54a', '#5f9433');
          const inner = (x: number, y: number): P2 => c(0.16 + x * 0.72, 0.05 + y * 0.72);
          isoBox(ctx, inner, stage === 1 ? 1.3 : 1.7, stage === 1 ? 1.2 : 1.6, {
            wall: HOUSE_WALLS[vi],
            roofC: HOUSE_ROOFS[(vi + (stage === 2 ? 2 : 0)) % HOUSE_ROOFS.length],
            wallH: stage === 1 ? 14 : 26,
            roofH: stage === 1 ? 9 : 12,
            roofStripes: 'rgba(255,255,255,.2)',
            winRows: stage === 1 ? 1 : 2,
            door: true,
          });
          // hedge along the front edge
          ctx.fillStyle = '#4c8a3c';
          for (let t = 0.08; t < 0.95; t += 0.11) {
            const p = mix(c(0.05, 1.95), c(1.6, 1.95), t);
            ctx.beginPath();
            ctx.arc(p[0], p[1] - 1, 2.4, 0, 7);
            ctx.fill();
          }
          if (stage === 2) {
            const ch = c(1.15, 0.5);
            ctx.fillStyle = '#8a6a55';
            ctx.fillRect(ch[0], ch[1] - 46, 5, 12);
            ctx.strokeStyle = 'rgba(40,30,20,.6)';
            ctx.strokeRect(ch[0], ch[1] - 46, 5, 12);
          }
          // flowers by the door
          const fl = c(0.35, 1.75);
          for (let i = 0; i < 4; i++) {
            ctx.fillStyle = ['#f2a7c3', '#f7d34d', '#ffffff', '#e78ad1'][i];
            ctx.beginPath();
            ctx.arc(fl[0] + i * 4 - 6, fl[1] - 1, 1.5, 0, 7);
            ctx.fill();
          }
        });
      }
      // fallback simple box
      return makeB(kind, 120, 100, 2, 2, (ctx, c) => {
        isoBox(ctx, c, 2, 2, { wall: '#d8cdb0', roofC: '#6a7280', wallH: 18, roofH: 10, winRows: 1, door: true });
      });
    }
  }
}

/** 1x1 props: bench and flower-bed planter. */
export function propSprite(kind: 'bench' | 'flowerbed' | 'landmark' | 'ballwasher' | 'scenicbridge'): BSprite {
  const key = 'p|' + kind;
  const hit = bcache.get(key);
  if (hit) return hit;
  const [art, ctx] = makeCanvas(48, 44);
  const cx = 24;
  const cy = 32;
  if (kind === 'bench') {
    // wooden bench, side-on
    ctx.strokeStyle = '#4a3018';
    ctx.lineWidth = 2;
    for (const dx of [-8, 8]) {
      ctx.beginPath();
      ctx.moveTo(cx + dx, cy);
      ctx.lineTo(cx + dx, cy - 7);
      ctx.stroke();
    }
    for (let i = 0; i < 2; i++) {
      poly(ctx, [[cx - 11, cy - 7 - i * 3.4], [cx + 11, cy - 7 - i * 3.4 - 3], [cx + 11, cy - 9.4 - i * 3.4 - 3], [cx - 11, cy - 9.4 - i * 3.4]], i === 0 ? '#b8905e' : '#a9825a');
    }
    for (let i = 0; i < 3; i++)
      poly(ctx, [[cx - 11, cy - 13.5 - i * 3], [cx + 11, cy - 16.5 - i * 3], [cx + 11, cy - 18.3 - i * 3], [cx - 11, cy - 15.3 - i * 3]], i % 2 ? '#a9825a' : '#b8905e');
  } else if (kind === 'landmark') {
    // stone monument: stepped pedestal + a tall tapering obelisk shaft — the tall
    // vertical silhouette the original's Landmark icon reads as (AmenitiesPanel.pcx),
    // rather than a wide fountain basin. Values/shapes only, nothing traced or copied.
    poly(ctx, [[cx - 13, cy + 3], [cx, cy + 9], [cx + 13, cy + 3], [cx, cy - 3]], '#9a9fa6', '#6d7278');
    poly(ctx, [[cx - 13, cy + 3], [cx, cy + 9], [cx, cy + 12], [cx - 13, cy + 6]], '#7d828a');
    poly(ctx, [[cx + 13, cy + 3], [cx, cy + 9], [cx, cy + 12], [cx + 13, cy + 6]], '#5c6167');
    poly(ctx, [[cx - 8, cy], [cx, cy + 4], [cx + 8, cy], [cx, cy - 4]], '#b3b8bf', '#7d828a');
    poly(ctx, [[cx - 8, cy], [cx, cy + 4], [cx, cy + 6], [cx - 8, cy + 2]], '#93989f');
    poly(ctx, [[cx + 8, cy], [cx, cy + 4], [cx, cy + 6], [cx + 8, cy + 2]], '#6d7278');
    // tapering shaft
    poly(ctx, [[cx - 3.4, cy - 3], [cx - 2, cy - 24], [cx + 2, cy - 24], [cx + 3.4, cy - 3]], '#d6dade', '#a4aab0');
    ctx.fillStyle = '#8f959c';
    ctx.fillRect(cx + 0.4, cy - 24, 3, 21); // shadowed edge
    // pyramidal cap
    poly(ctx, [[cx - 2, cy - 24], [cx, cy - 29], [cx + 2, cy - 24]], '#eef1f3', '#c9ced4');
    // carved plaque line + gold accent band, matching the UI's gold "notable" tint
    ctx.strokeStyle = 'rgba(60,66,73,.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 2.6, cy - 12);
    ctx.lineTo(cx + 2.6, cy - 12);
    ctx.stroke();
    ctx.fillStyle = '#e9b53c';
    ctx.fillRect(cx - 2.6, cy - 16, 5.2, 1.6);
  } else if (kind === 'ballwasher') {
    // tee-side courtesy stand: a slim post with a round basin head and a hanging towel
    ctx.fillStyle = '#3b3d42';
    ctx.fillRect(cx - 1.4, cy - 14, 2.8, 16);
    poly(ctx, [[cx - 6, cy - 14], [cx, cy - 11], [cx + 6, cy - 14], [cx, cy - 17]], '#c9ced4', '#8f959c');
    poly(ctx, [[cx - 6, cy - 14], [cx, cy - 11], [cx, cy - 9], [cx - 6, cy - 12]], '#a4aab0');
    poly(ctx, [[cx + 6, cy - 14], [cx, cy - 11], [cx, cy - 9], [cx + 6, cy - 12]], '#7d828a');
    ctx.fillStyle = '#c0453a';
    ctx.fillRect(cx + 1.4, cy - 10, 3, 7); // towel
    ctx.fillStyle = '#a8382e';
    ctx.fillRect(cx + 1.4, cy - 10, 3, 1.6);
  } else if (kind === 'scenicbridge') {
    // short arched wooden footbridge, side-on like the bench
    ctx.strokeStyle = '#4a3018';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy + 2);
    ctx.quadraticCurveTo(cx, cy - 10, cx + 14, cy + 2);
    ctx.stroke();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#8a5a30';
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy + 4);
    ctx.quadraticCurveTo(cx, cy - 7, cx + 14, cy + 4);
    ctx.stroke();
    ctx.strokeStyle = '#6e4523';
    ctx.lineWidth = 1;
    for (let i = -12; i <= 12; i += 4) {
      const t = (i + 14) / 28;
      const px2 = cx + i;
      const py2 = cy + 4 - Math.sin(t * Math.PI) * 11;
      ctx.beginPath();
      ctx.moveTo(px2, py2);
      ctx.lineTo(px2, py2 - 6);
      ctx.stroke();
    }
  } else {
    // wooden planter box bursting with flowers
    poly(ctx, [[cx - 13, cy - 2], [cx, cy + 4], [cx + 13, cy - 2], [cx, cy - 8]], '#7a5233', '#4a3018');
    poly(ctx, [[cx - 13, cy - 2], [cx, cy + 4], [cx, cy + 8], [cx - 13, cy + 2]], '#8a6238');
    poly(ctx, [[cx + 13, cy - 2], [cx, cy + 4], [cx, cy + 8], [cx + 13, cy + 2]], '#6e4523');
    poly(ctx, [[cx - 10, cy - 3], [cx, cy + 2], [cx + 10, cy - 3], [cx, cy - 7]], '#3d2c18');
    const cols = ['#f2a7c3', '#f7d34d', '#ffffff', '#e78ad1', '#f0806a', '#c8493c'];
    for (let i = 0; i < 12; i++) {
      const a = (i * 137.5) % 360;
      const rr = 2 + ((i * 53) % 8);
      const x = cx + Math.cos((a * Math.PI) / 180) * rr;
      const y = cy - 6 - Math.abs(Math.sin((a * Math.PI) / 180)) * 5 - (i % 3) * 2;
      ctx.strokeStyle = '#2f6b2a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y + 3);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.fillStyle = cols[i % cols.length];
      for (const [px2, py2] of [
        [x - 1.4, y],
        [x + 1.4, y],
        [x, y - 1.4],
        [x, y + 1.4],
      ])
        ctx.fillRect(px2 - 0.9, py2 - 0.9, 1.8, 1.8);
      ctx.fillStyle = '#f7e27a';
      ctx.fillRect(x - 0.9, y - 0.9, 1.8, 1.8);
    }
  }
  const done = outlined(art, 'rgba(25,30,40,.7)');
  const spr = { cv: done, ax: cx, ay: cy + 6 };
  bcache.set(key, spr);
  return spr;
}

const HOUSE_WALLS = ['#e8d8b8', '#d8e3ea', '#e6c9c0', '#cfe0c0', '#e3d3ec'];
const HOUSE_ROOFS = ['#a33d31', '#3f6f9c', '#6a8f3c', '#7a5233', '#9a3f5c'];

/* ================= trees ================= */

export type TreeKind = 'round' | 'pine' | 'blossom';

function ditherDisc(p: Px, cx: number, cy: number, r: number, base: string, mid: string, hi: string) {
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++) {
      const d = Math.sqrt(x * x + y * y);
      if (d > r + 0.2) continue;
      let c = base;
      if (x - y < -r * 0.5) c = mid; // upper-left lit
      if (x - y < -r * 0.9 && (x + y) % 2 === 0) c = hi; // dithered highlight
      if (d > r - 0.9 && x + y > r * 0.4) c = shade(base, 0.8); // lower-right rim
      p(cx + x, cy + y, 1, 1, c);
    }
}

/** 42x56 tree sprite. `tone` 0..2 picks a green ramp. */
export function treeSprite(kind: TreeKind, tone: number): HTMLCanvasElement {
  const key = 't|' + kind + '|' + tone;
  const hit = cache.get(key);
  if (hit) return hit;

  const [art, , p] = makeCanvas(42, 56);
  const ramps: [string, string, string][] = [
    ['#22572e', '#397b3e', '#67a94f'],
    ['#1e4d2a', '#306d38', '#559946'],
    ['#315f2d', '#4b8138', '#79ad4c'],
  ];
  const [base, mid, hi] = ramps[tone % 3];
  const trunk = '#6d4a2b';
  const trunkDk = '#54371e';

  if (kind === 'pine') {
    p(18, 39, 6, 15, trunk);
    p(18, 39, 2, 15, trunkDk);
    p(15, 52, 4, 2, trunkDk);
    p(24, 51, 4, 2, trunk);
    // Five irregular tiers produce a fuller, less icon-like pine.
    const tiers: [number, number, number][] = [
      [42, 17, 0],
      [34, 15, 1],
      [27, 12, 2],
      [20, 9, 3],
      [13, 6, 4],
    ];
    for (const [yb, half, tier] of tiers) {
      for (let r = 0; r < 9; r++) {
        const w = Math.max(1, half - r * (half / 9));
        const y = yb - r;
        const c = r > 5 ? mid : base;
        p(21 - w, y, w * 2, 1, c);
        if ((y + tier) % 3 === 0) p(21 - w, y, Math.max(2, w * 0.32), 1, hi);
      }
    }
    p(20, 4, 3, 4, mid);
  } else {
    p(18, 33, 6, 21, trunk);
    p(18, 33, 2, 21, trunkDk);
    p(13, 50, 6, 2, trunkDk);
    p(23, 49, 6, 2, trunk);
    p(15, 31, 4, 8, trunkDk);
    p(23, 29, 4, 10, trunk);
    ditherDisc(p, 21, 15, 12, base, mid, hi);
    ditherDisc(p, 11, 24, 9, base, mid, hi);
    ditherDisc(p, 31, 24, 9, base, mid, hi);
    ditherDisc(p, 21, 27, 10, base, mid, hi);
    ditherDisc(p, 21, 7, 7, base, mid, hi);
    if (kind === 'blossom') {
      const pinks = ['#e990b5', '#f6bed3', '#cf6eab', '#fff0e8'];
      for (let i = 0; i < 28; i++) {
        const a = (i * 137.5) % 360;
        const rr = 4 + ((i * 53) % 13);
        const x = 21 + Math.round(Math.cos((a * Math.PI) / 180) * rr);
        const y = 18 + Math.round(Math.sin((a * Math.PI) / 180) * rr * 0.74);
        p(x, y, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1, pinks[i % pinks.length]);
      }
    }
  }

  const done = outlined(art, '#1e3a1a');
  cache.set(key, done);
  return done;
}
