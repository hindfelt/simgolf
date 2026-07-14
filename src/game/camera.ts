import { W, H, TW, TH, EH, PW, PH, PARCEL_W, PARCEL_H } from './constants';
import { clamp, elevAt } from './rng';
import { S, caches } from './state';
import type { Vec } from './types';

/** Clears the full three-gauge desktop stack (ends at y=111) plus breathing room. */
export const COURSE_SAFE_TOP = 116;
export const CONTROLLER_VISIBLE_HEIGHT = 166;
export const COMPACT_PLAY_CONTROLLER_VISIBLE_HEIGHT = 140;
export const COMPACT_PLAY_MAX_VIEWPORT_HEIGHT = 520;
export const COURSE_SAFE_GAP = 12;
const COURSE_SAFE_SIDE = 10;

export interface CourseSafeViewport {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

/** Mirrors the short-landscape play shell without asking render code to read CSS. */
export function controllerVisibleHeightForViewport(viewportHeight: number, manualPlay = Boolean(S.player)): number {
  const height = Number.isFinite(viewportHeight) ? viewportHeight : 1;
  return manualPlay && height <= COMPACT_PLAY_MAX_VIEWPORT_HEIGHT
    ? COMPACT_PLAY_CONTROLLER_VISIBLE_HEIGHT
    : CONTROLLER_VISIBLE_HEIGHT;
}

/** Unobscured course rectangle shared by fitting, follow, rotation, and glide. */
export function courseSafeViewport(cw: number, ch: number, manualPlay = Boolean(S.player)): CourseSafeViewport {
  const width = Math.max(1, Number.isFinite(cw) ? cw : 1);
  const height = Math.max(1, Number.isFinite(ch) ? ch : 1);
  const left = Math.min(COURSE_SAFE_SIDE, Math.max(0, width - 1));
  const right = Math.max(left + 1, width - COURSE_SAFE_SIDE);
  const desiredBottom = height - controllerVisibleHeightForViewport(height, manualPlay) - COURSE_SAFE_GAP;
  const top = Math.min(COURSE_SAFE_TOP, Math.max(0, desiredBottom - 1));
  const bottom = Math.max(top + 1, desiredBottom);
  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
  };
}

export function cameraPositionForWorldPoint(wx: number, wy: number, cw = S.view.w, ch = S.view.h): Vec {
  const safe = courseSafeViewport(cw, ch);
  const iso = isoOf(wx, wy);
  return {
    x: safe.centerX - iso.ix * S.cam.z,
    y: safe.centerY - (iso.iy - elevAt(wx, wy) * EH) * S.cam.z,
  };
}

/** Follow before an airborne ball or actor can pass under permanent chrome. */
export function coursePointNeedsCameraFollow(point: Vec, cw = S.view.w, ch = S.view.h): boolean {
  const safe = courseSafeViewport(cw, ch);
  const xInset = Math.min(40, safe.width * 0.12);
  const yInset = Math.min(12, safe.height * 0.12);
  return point.x < safe.left + xInset
    || point.x > safe.right - xInset
    || point.y < safe.top + yInset
    || point.y > safe.bottom - yInset;
}

/** World -> view coords under the current 90°-step rotation. */
export function viewXY(wx: number, wy: number): [number, number] {
  switch (S.rot & 3) {
    case 1:
      return [wy, W - wx];
    case 2:
      return [W - wx, H - wy];
    case 3:
      return [H - wy, wx];
    default:
      return [wx, wy];
  }
}

/** Painter depth in rotated view space, shared by rendering and actor picking. */
export function viewDepth(wx: number, wy: number): number {
  const [rx, ry] = viewXY(wx, wy);
  return rx + ry;
}

export function isoOf(wx: number, wy: number) {
  const [rx, ry] = viewXY(wx, wy);
  return { ix: ((rx - ry) * TW) / 2, iy: ((rx + ry) * TH) / 2 };
}

/** Rotate the view a quarter turn, keeping the screen-centre point centred. */
export function rotateView(dir: 1 | -1) {
  const safe = courseSafeViewport(S.view.w, S.view.h);
  const c = screenToWorld(safe.centerX, safe.centerY);
  S.rot = (S.rot + dir + 4) & 3;
  caches.groundDirty = true;
  S.camTarget = null;
  const iso = isoOf(clamp(c.x, 0, W), clamp(c.y, 0, H));
  S.cam.x = safe.centerX - iso.ix * S.cam.z;
  S.cam.y = safe.centerY - iso.iy * S.cam.z;
}

/** World tile coords -> screen (css) pixels. */
export function P(wx: number, wy: number): Vec {
  const o = isoOf(wx, wy);
  return { x: S.cam.x + o.ix * S.cam.z, y: S.cam.y + o.iy * S.cam.z };
}

/** Like P() but lifted by the terrain elevation under the point. */
export function PE(wx: number, wy: number): Vec {
  const p = P(wx, wy);
  return { x: p.x, y: p.y - elevAt(wx, wy) * EH * S.cam.z };
}

export function screenToWorld(px: number, py: number): Vec {
  const ix = (px - S.cam.x) / S.cam.z;
  const iy = (py - S.cam.y) / S.cam.z;
  const vx = ix / TW + iy / TH;
  const vy = iy / TH - ix / TW;
  switch (S.rot & 3) {
    case 1:
      return { x: W - vy, y: vx };
    case 2:
      return { x: W - vx, y: H - vy };
    case 3:
      return { x: vy, y: H - vx };
    default:
      return { x: vx, y: vy };
  }
}

/** Like screenToWorld but corrected for terrain height under the cursor. */
export function screenToWorldT(px: number, py: number): Vec {
  let w = screenToWorld(px, py);
  for (let i = 0; i < 3; i++) w = screenToWorld(px, py + elevAt(w.x, w.y) * EH * S.cam.z);
  return w;
}

export function zoomAt(px: number, py: number, f: number) {
  const z2 = clamp(S.cam.z * f, 0.4, 3.4);
  const ix = (px - S.cam.x) / S.cam.z;
  const iy = (py - S.cam.y) / S.cam.z;
  S.cam.x = px - ix * z2;
  S.cam.y = py - iy * z2;
  S.cam.z = z2;
}

export function fitCamera(cw: number, ch: number) {
  // fit the owned parcels (plus a margin), not the whole for-sale map
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let py = 0; py < PH; py++)
    for (let px = 0; px < PW; px++)
      if (S.owned[py * PW + px]) {
        x0 = Math.min(x0, px * PARCEL_W);
        y0 = Math.min(y0, py * PARCEL_H);
        x1 = Math.max(x1, (px + 1) * PARCEL_W);
        y1 = Math.max(y1, (py + 1) * PARCEL_H);
      }
  if (x1 <= x0) {
    x0 = 0;
    y0 = 0;
    x1 = W;
    y1 = H;
  }
  x0 = Math.max(0, x0 - 2);
  y0 = Math.max(0, y0 - 2);
  x1 = Math.min(W, x1 + 2);
  y1 = Math.min(H, y1 + 2);
  const corners = [isoOf(x0, y0), isoOf(x1, y0), isoOf(x1, y1), isoOf(x0, y1)];
  const ix0 = Math.min(...corners.map((c) => c.ix));
  const ix1 = Math.max(...corners.map((c) => c.ix));
  const iy0 = Math.min(...corners.map((c) => c.iy));
  const iy1 = Math.max(...corners.map((c) => c.iy));
  const safe = courseSafeViewport(cw, ch);
  const availW = safe.width;
  const availH = safe.height;
  const z = clamp(Math.min(availW / (ix1 - ix0), availH / (iy1 - iy0)), 0.4, 2);
  S.cam.z = z;
  S.cam.x = safe.centerX - ((ix0 + ix1) / 2) * z;
  S.cam.y = safe.centerY - ((iy0 + iy1) / 2) * z;
}
