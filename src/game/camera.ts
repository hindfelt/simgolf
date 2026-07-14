import { W, H, TW, TH, EH, PW, PH, PARCEL_W, PARCEL_H } from './constants';
import { clamp, elevAt } from './rng';
import { S, caches } from './state';
import type { Vec } from './types';

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
  const c = screenToWorld(S.view.w / 2, S.view.h / 2);
  S.rot = (S.rot + dir + 4) & 3;
  caches.groundDirty = true;
  S.camTarget = null;
  const iso = isoOf(clamp(c.x, 0, W), clamp(c.y, 0, H));
  S.cam.x = S.view.w / 2 - iso.ix * S.cam.z;
  S.cam.y = S.view.h / 2 - iso.iy * S.cam.z;
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
  const TOP = 46; // floating plaque/gauges
  const BOT = 86; // tile tray
  const availW = cw - 20;
  const availH = ch - TOP - BOT - 20;
  const z = clamp(Math.min(availW / (ix1 - ix0), availH / (iy1 - iy0)), 0.4, 2);
  S.cam.z = z;
  S.cam.x = cw / 2 - ((ix0 + ix1) / 2) * z;
  S.cam.y = TOP + (ch - TOP - BOT) / 2 - ((iy0 + iy1) / 2) * z;
}
