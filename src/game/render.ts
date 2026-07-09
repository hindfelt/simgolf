import { W, H, TW, TH, EH, MAXE, TINFO, LIE, CH, PATH_MUD, PW, PH, PARCEL_W, PARCEL_H, LAND_COST } from './constants';
import { Tile } from './types';
import type { Ball, Building, Golfer, Hole, Vec } from './types';
import { S, caches } from './state';
import { clamp, hash2, inb, elevAt, idx, cornerH, ownedAt, fmt$ } from './rng';
import { P, PE, screenToWorld, viewXY } from './camera';
import { parFor } from './engine';
import { CATALOG, canPlace, occupiedTiles } from './buildings';
import { lockedTilesForRender } from './engine';
import { golferSprite, treeSprite, buildingSprite, propSprite } from './sprites';
import type { GolferFrame, TreeKind, BSprite } from './sprites';

/* ================= ground cache =================
   Terrain is painted in flat "ortho" grid space (rounded blob autotiles,
   mowing stripes, noise), then every tile is texture-mapped onto its sloped
   iso quad (two triangles, corner heightfield) with slope-based sun shading.
   That gives SimGolf-style rolling ground instead of stair-step terraces. */

const RES = 32; // ortho px per tile; enough resolution for material texture
const GPAD = 56;
const EDGE_DEPTH = 26;
const gox = (Math.max(W, H) * TW) / 2 + GPAD; // room for either rotation
const goy = GPAD + MAXE * EH;
const gc = document.createElement('canvas');
gc.width = Math.max(W, H) * TW + GPAD * 2;
gc.height = ((W + H) * TH) / 2 + GPAD * 2 + TH + MAXE * EH + EDGE_DEPTH;
const gctx = gc.getContext('2d')!;

const oc = document.createElement('canvas');
oc.width = W * RES;
oc.height = H * RES;
const octx = oc.getContext('2d')!;

const bgc = document.createElement('canvas');
const bgctx = bgc.getContext('2d')!;

/** Terrain merge groups: tiles in the same group flow together as one blob. */
type Grp = number;
const Grp = { ROUGH: 0, FAIR: 1, GREEN: 2, SAND: 3, WATER: 4, PATH: 5 } as const;
function groupOf(t: number): Grp {
  switch (t) {
    case Tile.FAIR:
    case Tile.TEE:
      return Grp.FAIR;
    case Tile.GREEN:
      return Grp.GREEN;
    case Tile.SAND:
      return Grp.SAND;
    case Tile.WATER:
      return Grp.WATER;
    case Tile.PATH:
      return Grp.PATH;
    default:
      return Grp.ROUGH;
  }
}
function sameBlob(x: number, y: number, g: Grp): boolean {
  return inb(x, y) && groupOf(S.tiles[idx(x, y)]) === g;
}

/** Rounded cell: corners that touch no same-group orthogonal neighbour get rounded. */
function blobCell(p: Path2D, x: number, y: number, g: Grp, r: number) {
  const u = x * RES;
  const v = y * RES;
  const n = sameBlob(x, y - 1, g);
  const s = sameBlob(x, y + 1, g);
  const w = sameBlob(x - 1, y, g);
  const e = sameBlob(x + 1, y, g);
  p.roundRect(u, v, RES, RES, [n || w ? 0 : r, n || e ? 0 : r, s || e ? 0 : r, s || w ? 0 : r]);
}
function blobPath(g: Grp, r: number, filter?: (x: number, y: number) => boolean): { path: Path2D; any: boolean; tiles: [number, number][] } {
  const path = new Path2D();
  const tiles: [number, number][] = [];
  let any = false;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (groupOf(S.tiles[idx(x, y)]) !== g) continue;
      if (filter && !filter(x, y)) continue;
      blobCell(path, x, y, g, r);
      tiles.push([x, y]);
      any = true;
    }
  return { path, any, tiles };
}

function drawOrtho() {
  const c = octx;
  c.clearRect(0, 0, oc.width, oc.height);

  // 1) Rough under everything. Large translucent patches hide the tile grid;
  // tiny grass marks keep the material readable at close zoom.
  c.fillStyle = TINFO[Tile.ROUGH].c1;
  c.fillRect(0, 0, oc.width, oc.height);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const u = x * RES;
      const v = y * RES;
      const patch = hash2(x * 5 + 17, y * 7 + 31);
      c.fillStyle = patch > 0.48 ? 'rgba(27,65,29,.12)' : 'rgba(222,239,162,.08)';
      c.beginPath();
      c.ellipse(u + patch * RES, v + hash2(y + 9, x + 23) * RES, RES * (0.42 + patch * 0.3), RES * 0.32, patch * 2.2, 0, Math.PI * 2);
      c.fill();
      for (let i = 0; i < 7; i++) {
        const a = hash2(x * 17 + i * 31, y * 23 + i * 13);
        const b = hash2(y * 19 + i * 7, x * 11 + i * 29);
        c.fillStyle = a > 0.53 ? 'rgba(233,246,190,.09)' : 'rgba(20,53,25,.1)';
        c.fillRect(u + a * (RES - 3), v + b * (RES - 3), 1.5 + b * 1.5, 1.2);
      }
      const t = S.tiles[idx(x, y)];
      if ((t === Tile.ROUGH || t === Tile.TREE) && hash2(x * 3, y * 9) > 0.52) {
        for (let i = 0; i < 2; i++) {
          const tu = u + hash2(x + i * 37, y * 2 + i) * (RES - 8) + 4;
          const tv = v + hash2(x * 2 + i, y + i * 19) * (RES - 8) + 5;
          c.strokeStyle = i ? 'rgba(216,235,154,.2)' : 'rgba(24,60,27,.32)';
          c.lineWidth = 1;
          c.beginPath();
          c.moveTo(tu, tv + 3.5);
          c.quadraticCurveTo(tu - 1, tv, tu - 2.3, tv - 2.6);
          c.moveTo(tu + 0.5, tv + 3.5);
          c.quadraticCurveTo(tu + 1.5, tv, tu + 3, tv - 2.3);
          c.stroke();
        }
      }
    }

  // 2) Water — a recessed shoreline, deep centre and fine caustic marks.
  const water = blobPath(Grp.WATER, RES * 0.5);
  if (water.any) {
    c.strokeStyle = '#a98c55';
    c.lineWidth = 11;
    c.stroke(water.path);
    c.strokeStyle = '#dfc789';
    c.lineWidth = 7;
    c.stroke(water.path);
    const waterGrad = c.createLinearGradient(0, 0, oc.width, oc.height);
    waterGrad.addColorStop(0, TINFO[Tile.WATER].c1);
    waterGrad.addColorStop(0.55, TINFO[Tile.WATER].c2);
    waterGrad.addColorStop(1, '#1c5f8b');
    c.fillStyle = waterGrad;
    c.fill(water.path);
    const deep = new Path2D();
    let anyDeep = false;
    for (const [x, y] of water.tiles)
      if (sameBlob(x - 1, y, Grp.WATER) && sameBlob(x + 1, y, Grp.WATER) && sameBlob(x, y - 1, Grp.WATER) && sameBlob(x, y + 1, Grp.WATER)) {
        deep.roundRect(x * RES - RES * 0.15, y * RES - RES * 0.15, RES * 1.3, RES * 1.3, RES * 0.5);
        anyDeep = true;
      }
    if (anyDeep) {
      c.save();
      c.clip(water.path);
      c.fillStyle = 'rgba(8,40,75,.22)';
      c.fill(deep);
      c.restore();
    }
    c.save();
    c.clip(water.path);
    c.strokeStyle = 'rgba(170,228,237,.22)';
    c.lineWidth = 1.2;
    for (const [x, y] of water.tiles) {
      const a = hash2(x * 13 + 4, y * 17 + 9);
      const b = hash2(y * 11 + 3, x * 7 + 5);
      c.beginPath();
      c.moveTo(x * RES + 5 + a * 10, y * RES + 7 + b * 15);
      c.quadraticCurveTo(x * RES + RES * 0.5, y * RES + 5 + b * 15, x * RES + RES - 5 - a * 8, y * RES + 8 + b * 15);
      c.stroke();
    }
    c.restore();
    c.strokeStyle = '#245b78';
    c.lineWidth = 2;
    c.stroke(water.path);
  }

  // 3) Sand — a darker cut lip, warm depth and lightly raked arcs.
  const sand = blobPath(Grp.SAND, RES * 0.5);
  if (sand.any) {
    c.strokeStyle = '#9f854d';
    c.lineWidth = 7;
    c.stroke(sand.path);
    const sandGrad = c.createLinearGradient(0, 0, oc.width, oc.height);
    sandGrad.addColorStop(0, '#ead69a');
    sandGrad.addColorStop(1, TINFO[Tile.SAND].c2);
    c.fillStyle = sandGrad;
    c.fill(sand.path);
    c.save();
    c.clip(sand.path);
    c.fillStyle = 'rgba(105,75,27,.22)';
    for (const [x, y] of sand.tiles)
      for (let i = 0; i < 7; i++) {
        const a = hash2(x * 3 + i, y * 5 + i);
        const b = hash2(y * 9 + i, x * 7 + i);
        c.fillRect(x * RES + a * (RES - 2), y * RES + b * (RES - 2), 1.3, 1.3);
      }
    c.strokeStyle = 'rgba(126,91,35,.23)';
    c.lineWidth = 1;
    for (const [x, y] of sand.tiles) {
      const rr = RES * (0.19 + hash2(x, y) * 0.08);
      c.beginPath();
      c.arc(x * RES + RES * 0.48, y * RES + RES * 0.52, rr, 0.22, 2.55);
      c.stroke();
    }
    c.restore();
    c.strokeStyle = 'rgba(250,233,181,.65)';
    c.lineWidth = 1.4;
    c.stroke(sand.path);
  }

  // 4) Fairway (tees merge into the same blob) with broad mower lanes.
  const fair = blobPath(Grp.FAIR, RES * 0.5);
  if (fair.any) {
    c.strokeStyle = '#426e32';
    c.lineWidth = 5;
    c.stroke(fair.path);
    c.fillStyle = TINFO[Tile.FAIR].c1;
    c.fill(fair.path);
    c.save();
    c.clip(fair.path);
    c.fillStyle = TINFO[Tile.FAIR].c2;
    const band = RES * 2; // one full tile-diagonal per mow lane
    for (let k = -1; k <= W + H; k += 2) {
      c.beginPath();
      c.moveTo(k * band, 0);
      c.lineTo((k + 1) * band, 0);
      c.lineTo((k + 1) * band - oc.height, oc.height);
      c.lineTo(k * band - oc.height, oc.height);
      c.closePath();
      c.fill();
    }
    c.strokeStyle = 'rgba(231,247,187,.08)';
    c.lineWidth = 2;
    for (let k = -2; k <= W + H; k += 2) {
      c.beginPath();
      c.moveTo(k * band, 0);
      c.lineTo(k * band - oc.height, oc.height);
      c.stroke();
    }
    c.restore();
    c.strokeStyle = 'rgba(30,65,24,.35)';
    c.lineWidth = 1.4;
    c.stroke(fair.path);
    const T = TINFO[Tile.TEE];
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (S.tiles[idx(x, y)] !== Tile.TEE) continue;
        c.fillStyle = T.c1;
        c.beginPath();
        c.roundRect(x * RES + 2, y * RES + 2, RES - 4, RES - 4, 4);
        c.fill();
        c.strokeStyle = 'rgba(38,76,30,.35)';
        c.lineWidth = 1.2;
        c.stroke();
        c.fillStyle = '#fff8da';
        c.beginPath();
        c.arc(x * RES + RES / 2 - 6, y * RES + RES / 2, 2.2, 0, Math.PI * 2);
        c.arc(x * RES + RES / 2 + 6, y * RES + RES / 2, 2.2, 0, Math.PI * 2);
        c.fill();
      }
  }

  // 5) Greens — double fringe, subtle checker cut and a crisp collar.
  const green = blobPath(Grp.GREEN, RES * 0.6);
  if (green.any) {
    c.strokeStyle = '#477f38';
    c.lineWidth = 9;
    c.stroke(green.path);
    c.strokeStyle = '#76ae4c';
    c.lineWidth = 6;
    c.stroke(green.path);
    c.fillStyle = TINFO[Tile.GREEN].c1;
    c.fill(green.path);
    c.save();
    c.clip(green.path);
    for (const [x, y] of green.tiles) {
      c.fillStyle = (x + y) & 1 ? 'rgba(237,255,215,.075)' : 'rgba(25,85,35,.04)';
      c.fillRect(x * RES, y * RES, RES, RES);
    }
    c.restore();
    c.strokeStyle = 'rgba(23,73,30,.35)';
    c.lineWidth = 1.4;
    c.stroke(green.path);
  }

  // 6) pathways — connected gravel vs. disconnected mud
  const conn = caches.pathConnected;
  const pathOn = blobPath(Grp.PATH, RES * 0.35, (x, y) => conn.has(x + ',' + y));
  const pathOff = blobPath(Grp.PATH, RES * 0.35, (x, y) => !conn.has(x + ',' + y));
  for (const [pp, col, edge] of [
    [pathOn, TINFO[Tile.PATH].c1, '#a8895b'],
    [pathOff, PATH_MUD.c1, '#5f5138'],
  ] as const) {
    if (!pp.any) continue;
    c.strokeStyle = edge;
    c.lineWidth = 5;
    c.stroke(pp.path);
    c.fillStyle = col;
    c.fill(pp.path);
    c.save();
    c.clip(pp.path);
    c.fillStyle = 'rgba(70,52,31,.27)';
    for (const [x, y] of pp.tiles)
      for (let i = 0; i < 7; i++) {
        const a = hash2(x * 13 + i, y * 3 + i);
        const b = hash2(y * 5 + i, x * 11 + i);
        c.fillRect(x * RES + a * (RES - 2), y * RES + b * (RES - 2), 1 + a * 1.5, 1 + a);
      }
    c.restore();
    c.strokeStyle = 'rgba(249,225,174,.28)';
    c.lineWidth = 1.2;
    c.stroke(pp.path);
  }

  // 7) flower tiles — lush bed: dark foliage patch, stems, leaves, petal rosettes
  const petals = ['#f2a7c3', '#f7d34d', '#ffffff', '#e78ad1', '#f0806a', '#c8493c', '#9a8ae0'];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (S.tiles[idx(x, y)] !== Tile.FLOWER) continue;
      c.fillStyle = '#315e2f';
      c.beginPath();
      c.roundRect(x * RES + 1.5, y * RES + 1.5, RES - 3, RES - 3, RES * 0.42);
      c.fill();
      c.fillStyle = '#477b38';
      c.beginPath();
      c.roundRect(x * RES + 3.5, y * RES + 3.5, RES - 7, RES - 7, RES * 0.35);
      c.fill();
      for (let i = 0; i < 11; i++) {
        const a = hash2(x * 11 + i, y * 17 + i);
        const b = hash2(y * 11 + i, x * 5 + i);
        const fx = x * RES + 4 + a * (RES - 8);
        const fy = y * RES + 4 + b * (RES - 9);
        // stem + leaf
        c.fillStyle = '#2f6b2a';
        c.fillRect(fx - 0.5, fy, 1, 3.4);
        c.fillRect(fx + (a > 0.5 ? 0.8 : -1.8), fy + 1.6, 1.4, 1);
        // four-petal rosette + bright centre
        c.fillStyle = petals[(i + x * 3 + y) % petals.length];
        c.fillRect(fx - 2.1, fy - 0.8, 1.6, 1.6);
        c.fillRect(fx + 0.5, fy - 0.8, 1.6, 1.6);
        c.fillRect(fx - 0.8, fy - 2.1, 1.6, 1.6);
        c.fillRect(fx - 0.8, fy + 0.5, 1.6, 1.6);
        c.fillStyle = '#f7e27a';
        c.fillRect(fx - 0.8, fy - 0.8, 1.6, 1.6);
      }
    }

  // 8) land you don't own yet: dimmed, with parcel boundaries
  c.fillStyle = 'rgba(24,38,22,.32)';
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!ownedAt(x, y)) c.fillRect(x * RES, y * RES, RES, RES);
  c.strokeStyle = 'rgba(255,255,255,.22)';
  c.lineWidth = 2;
  c.setLineDash([8, 6]);
  for (let py = 0; py < PH; py++)
    for (let px = 0; px < PW; px++)
      if (!S.owned[py * PW + px]) c.strokeRect(px * PARCEL_W * RES + 1, py * PARCEL_H * RES + 1, PARCEL_W * RES - 2, PARCEL_H * RES - 2);
  c.setLineDash([]);
}

/* ---- sloped-quad compositing ---- */

/** Grid corner -> iso px inside the ground cache (view-rotated), lifted by its height. */
const gX = (cx: number, cy: number) => {
  const [rx, ry] = viewXY(cx, cy);
  return gox + ((rx - ry) * TW) / 2;
};
const gY = (cx: number, cy: number) => {
  const [rx, ry] = viewXY(cx, cy);
  return goy + ((rx + ry) * TH) / 2 - cornerH(cx, cy) * EH;
};
const gY0 = (cx: number, cy: number) => {
  const [rx, ry] = viewXY(cx, cy);
  return goy + ((rx + ry) * TH) / 2;
};

/** Texture-map one triangle from the ortho canvas onto the ground cache, then shade it. */
function mapTri(
  s0x: number, s0y: number, s1x: number, s1y: number, s2x: number, s2y: number,
  d0x: number, d0y: number, d1x: number, d1y: number, d2x: number, d2y: number,
  shadeAlpha: number
) {
  const den = s0x * (s1y - s2y) + s1x * (s2y - s0y) + s2x * (s0y - s1y);
  if (!den) return;
  const a = (d0x * (s1y - s2y) + d1x * (s2y - s0y) + d2x * (s0y - s1y)) / den;
  const cc = (d0x * (s2x - s1x) + d1x * (s0x - s2x) + d2x * (s1x - s0x)) / den;
  const e = (d0x * (s1x * s2y - s2x * s1y) + d1x * (s2x * s0y - s0x * s2y) + d2x * (s0x * s1y - s1x * s0y)) / den;
  const b = (d0y * (s1y - s2y) + d1y * (s2y - s0y) + d2y * (s0y - s1y)) / den;
  const dd = (d0y * (s2x - s1x) + d1y * (s0x - s2x) + d2y * (s1x - s0x)) / den;
  const f = (d0y * (s1x * s2y - s2x * s1y) + d1y * (s2x * s0y - s0x * s2y) + d2y * (s0x * s1y - s1x * s0y)) / den;
  // slightly inflated clip hides antialiasing seams between triangles
  const cx = (d0x + d1x + d2x) / 3;
  const cy = (d0y + d1y + d2y) / 3;
  const g = 1.035;
  const tri = new Path2D();
  tri.moveTo(cx + (d0x - cx) * g, cy + (d0y - cy) * g);
  tri.lineTo(cx + (d1x - cx) * g, cy + (d1y - cy) * g);
  tri.lineTo(cx + (d2x - cx) * g, cy + (d2y - cy) * g);
  tri.closePath();
  gctx.save();
  gctx.clip(tri);
  gctx.transform(a, b, cc, dd, e, f);
  gctx.drawImage(oc, 0, 0);
  gctx.setTransform(1, 0, 0, 1, 0, 0);
  if (Math.abs(shadeAlpha) > 0.015) {
    gctx.fillStyle = shadeAlpha > 0 ? 'rgba(255,250,225,' + Math.min(0.22, shadeAlpha).toFixed(3) + ')' : 'rgba(15,30,25,' + Math.min(0.26, -shadeAlpha).toFixed(3) + ')';
    gctx.fill(tri);
  }
  gctx.restore();
}

// sun from the upper-left of the screen
const LX = -0.5, LY = -0.22, LZ = 1.0;
const LLEN = Math.hypot(LX, LY, LZ);
const FLAT_B = LZ / LLEN;
const KZ = 0.42; // vertical exaggeration for shading

/** Light rotated into world coords so the sun stays at the screen's upper-left. */
function worldLight(): [number, number] {
  switch (S.rot & 3) {
    case 1:
      return [-LY, LX];
    case 2:
      return [-LX, -LY];
    case 3:
      return [LY, -LX];
    default:
      return [LX, LY];
  }
}
function triShade(lx: number, ly: number, x0: number, y0: number, h0: number, x1: number, y1: number, h1: number, x2: number, y2: number, h2: number): number {
  const ux = x1 - x0, uy = y1 - y0, uz = (h1 - h0) * KZ;
  const vx = x2 - x0, vy = y2 - y0, vz = (h2 - h0) * KZ;
  let nx = uy * vz - uz * vy;
  let ny = uz * vx - ux * vz;
  let nz = ux * vy - uy * vx;
  if (nz < 0) {
    nx = -nx;
    ny = -ny;
    nz = -nz;
  }
  const nl = Math.hypot(nx, ny, nz) || 1;
  const b = (nx * lx + ny * ly + nz * LZ) / (nl * LLEN);
  const d = b - FLAT_B;
  return d > 0 ? d * 1.0 : d * 1.1;
}

type GroundEdgePoint = { x: number; y: number; baseY: number };

/** All grid corners around the map, clockwise in world space. */
function groundPerimeter(): GroundEdgePoint[] {
  const out: GroundEdgePoint[] = [];
  const add = (x: number, y: number) => out.push({ x: gX(x, y), y: gY(x, y), baseY: gY0(x, y) + EDGE_DEPTH });
  for (let x = 0; x <= W; x++) add(x, 0);
  for (let y = 1; y <= H; y++) add(W, y);
  for (let x = W - 1; x >= 0; x--) add(x, H);
  for (let y = H - 1; y > 0; y--) add(0, y);
  return out;
}

/** Soft cast shadow and layered earth faces make the course a physical diorama. */
function drawGroundBase() {
  const edge = groundPerimeter();
  const outline = new Path2D();
  outline.moveTo(edge[0].x, edge[0].y);
  for (let i = 1; i < edge.length; i++) outline.lineTo(edge[i].x, edge[i].y);
  outline.closePath();

  gctx.save();
  gctx.translate(10, EDGE_DEPTH + 10);
  gctx.filter = 'blur(15px)';
  gctx.fillStyle = 'rgba(4,15,14,.52)';
  gctx.fill(outline);
  gctx.restore();

  for (let i = 0; i < edge.length; i++) {
    const a = edge[i];
    const b = edge[(i + 1) % edge.length];
    const grad = gctx.createLinearGradient(0, Math.min(a.y, b.y), 0, Math.max(a.baseY, b.baseY));
    const lit = b.x - a.x < 0;
    grad.addColorStop(0, lit ? '#6c5435' : '#5a432c');
    grad.addColorStop(0.18, lit ? '#56402b' : '#493523');
    grad.addColorStop(1, lit ? '#2c2a22' : '#22241f');
    gctx.fillStyle = grad;
    gctx.beginPath();
    gctx.moveTo(a.x, a.y);
    gctx.lineTo(b.x, b.y);
    gctx.lineTo(b.x, b.baseY);
    gctx.lineTo(a.x, a.baseY);
    gctx.closePath();
    gctx.fill();

    // Broken strata stop the edge reading as a single flat brown polygon.
    if (i % 3 === 0) {
      gctx.strokeStyle = lit ? 'rgba(219,183,116,.13)' : 'rgba(205,165,102,.09)';
      gctx.lineWidth = 1;
      gctx.beginPath();
      gctx.moveTo(a.x, a.y + (a.baseY - a.y) * 0.54);
      gctx.lineTo(b.x, b.y + (b.baseY - b.y) * 0.54);
      gctx.stroke();
    }
  }
}

/** Screen-sized atmosphere behind the course. Rebuilt only after a resize. */
function buildBackdrop(w: number, h: number) {
  bgc.width = Math.max(1, Math.ceil(w));
  bgc.height = Math.max(1, Math.ceil(h));
  const c = bgctx;
  const sky = c.createLinearGradient(0, 0, w, h);
  sky.addColorStop(0, '#28465a');
  sky.addColorStop(0.48, '#1d3a3c');
  sky.addColorStop(1, '#102820');
  c.fillStyle = sky;
  c.fillRect(0, 0, w, h);

  const glow = c.createRadialGradient(w * 0.24, h * 0.12, 0, w * 0.24, h * 0.12, Math.max(w, h) * 0.72);
  glow.addColorStop(0, 'rgba(218,228,179,.22)');
  glow.addColorStop(0.42, 'rgba(131,176,145,.08)');
  glow.addColorStop(1, 'rgba(8,24,24,0)');
  c.fillStyle = glow;
  c.fillRect(0, 0, w, h);

  // Out-of-focus forest crowns around the frame imply a larger park beyond.
  for (let i = 0; i < 42; i++) {
    const a = hash2(i * 17 + 5, i * 31 + 2);
    const b = hash2(i * 7 + 19, i * 13 + 11);
    const side = i & 3;
    const x = side === 0 ? a * w * 0.24 : side === 1 ? w * (0.76 + a * 0.24) : a * w;
    const y = side === 2 ? b * h * 0.2 : side === 3 ? h * (0.78 + b * 0.22) : b * h;
    const r = 34 + hash2(i, i + 97) * 80;
    c.fillStyle = i % 3 === 0 ? 'rgba(70,110,83,.08)' : 'rgba(6,30,27,.1)';
    c.beginPath();
    c.ellipse(x, y, r, r * (0.42 + b * 0.25), a * Math.PI, 0, Math.PI * 2);
    c.fill();
  }

  c.strokeStyle = 'rgba(178,207,179,.045)';
  c.lineWidth = 1;
  for (let i = 0; i < 12; i++) {
    const y = (i / 11) * h + hash2(i, 4) * 30;
    c.beginPath();
    c.moveTo(-40, y);
    c.bezierCurveTo(w * 0.26, y - 50, w * 0.65, y + 55, w + 40, y - 10);
    c.stroke();
  }

  for (let i = 0; i < Math.ceil((w * h) / 1800); i++) {
    const x = hash2(i * 5, i * 29) * w;
    const y = hash2(i * 37, i * 11) * h;
    c.fillStyle = i & 1 ? 'rgba(255,255,255,.025)' : 'rgba(0,0,0,.035)';
    c.fillRect(x, y, 1.2, 1.2);
  }
}

function buildGround() {
  gctx.setTransform(1, 0, 0, 1, 0, 0);
  gctx.clearRect(0, 0, gc.width, gc.height);
  drawGroundBase();

  drawOrtho();
  const [lx, ly] = worldLight();
  gctx.imageSmoothingEnabled = true;
  gctx.imageSmoothingQuality = 'high';
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const h00 = cornerH(x, y);
      const h10 = cornerH(x + 1, y);
      const h01 = cornerH(x, y + 1);
      const h11 = cornerH(x + 1, y + 1);
      const sx = x * RES;
      const sy = y * RES;
      const d00x = gX(x, y), d00y = gY(x, y);
      const d10x = gX(x + 1, y), d10y = gY(x + 1, y);
      const d01x = gX(x, y + 1), d01y = gY(x, y + 1);
      const d11x = gX(x + 1, y + 1), d11y = gY(x + 1, y + 1);
      if (h00 === h10 && h00 === h01 && h00 === h11) {
        // flat tile: one quad, no shading — cheap fast path
        mapTri(sx, sy, sx + RES, sy, sx + RES, sy + RES, d00x, d00y, d10x, d10y, d11x, d11y, 0);
        mapTri(sx, sy, sx + RES, sy + RES, sx, sy + RES, d00x, d00y, d11x, d11y, d01x, d01y, 0);
      } else {
        // one shade per tile (average of both triangle planes) so straight
        // slopes read as a single face instead of a two-tone facet
        const sh =
          (triShade(lx, ly, x, y, h00, x + 1, y, h10, x + 1, y + 1, h11) + triShade(lx, ly, x, y, h00, x + 1, y + 1, h11, x, y + 1, h01)) / 2;
        mapTri(sx, sy, sx + RES, sy, sx + RES, sy + RES, d00x, d00y, d10x, d10y, d11x, d11y, sh);
        mapTri(sx, sy, sx + RES, sy + RES, sx, sy + RES, d00x, d00y, d11x, d11y, d01x, d01y, sh);
      }
    }
  const edge = groundPerimeter();
  gctx.strokeStyle = 'rgba(29,64,31,.82)';
  gctx.lineWidth = 2.2;
  gctx.beginPath();
  gctx.moveTo(edge[0].x, edge[0].y);
  for (let i = 1; i < edge.length; i++) gctx.lineTo(edge[i].x, edge[i].y);
  gctx.closePath();
  gctx.stroke();
  gctx.strokeStyle = 'rgba(206,227,153,.24)';
  gctx.lineWidth = 0.8;
  gctx.stroke();
  caches.groundDirty = false;
}

/* ================= main draw ================= */
export function draw(ctx: CanvasRenderingContext2D, cssW: number, cssH: number) {
  const z = S.cam.z;
  const u = z;
  if (bgc.width !== Math.ceil(cssW) || bgc.height !== Math.ceil(cssH)) buildBackdrop(cssW, cssH);
  ctx.drawImage(bgc, 0, 0, cssW, cssH);
  if (caches.groundDirty) buildGround();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(gc, S.cam.x - gox * z, S.cam.y - goy * z, gc.width * z, gc.height * z);

  for (const w of caches.waterTiles) {
    const s = hash2(w.x, w.y);
    if (s < 0.55) continue;
    const c = PE(w.x + 0.5, w.y + 0.5);
    const ph = S.time * 1.8 + s * 20;
    const a = Math.max(0, Math.sin(ph)) * 0.35;
    if (a < 0.03) continue;
    ctx.strokeStyle = 'rgba(207,244,246,' + a.toFixed(3) + ')';
    ctx.lineWidth = Math.max(0.8, 1.15 * z);
    ctx.beginPath();
    const ox = (s - 0.5) * TW * 0.5 * z;
    const oy = (hash2(w.y, w.x) - 0.5) * TH * 0.5 * z;
    ctx.ellipse(c.x + ox, c.y + oy, 5.5 * z, 1.8 * z, 0, Math.PI * 0.14, Math.PI * 0.86);
    ctx.stroke();
  }

  drawEditorOverlays(ctx, u);

  // depth in view space so rotation keeps the painter's order correct
  const dep = (x: number, y: number) => {
    const [rx, ry] = viewXY(x, y);
    return rx + ry;
  };
  const D: { z: number; f: () => void }[] = [];
  for (let py = 0; py < PH; py++)
    for (let px = 0; px < PW; px++)
      if (!S.owned[py * PW + px]) {
        const sx = px * PARCEL_W + PARCEL_W / 2;
        const sy = py * PARCEL_H + PARCEL_H / 2;
        D.push({ z: dep(sx, sy), f: () => drawForSale(ctx, sx, sy, u) });
      }
  for (const tr of caches.trees) D.push({ z: dep(tr.x, tr.y), f: () => drawTree(ctx, tr, u) });
  S.holes.forEach((h, i) => {
    D.push({ z: dep(h.cup.x, h.cup.y), f: () => drawFlag(ctx, h, i + 1, u) });
    D.push({ z: dep(h.tee.x, h.tee.y) - 0.01, f: () => drawTeeSign(ctx, h, i + 1, u) });
  });
  const bDep = (x: number, y: number, w: number, h: number) =>
    Math.max(dep(x, y), dep(x + w, y), dep(x, y + h), dep(x + w, y + h)) - 0.4;
  D.push({ z: bDep(Math.floor(CH.x) - 1, Math.floor(CH.y) - 1, 2, 2), f: () => drawClubhouse(ctx, u) });
  for (const b of S.buildings) D.push({ z: bDep(b.x, b.y, b.w, b.h), f: () => drawBuilding(ctx, b, u) });
  for (const g of S.golfers) {
    D.push({ z: dep(g.x, g.y), f: () => drawGolfer(ctx, g, u) });
    if (g.ball && (g.state === 'toBall' || g.state === 'preshot' || g.state === 'prePutt' || g.state === 'toTee'))
      D.push({ z: dep(g.ball.x, g.ball.y) - 0.02, f: () => drawRestingBall(ctx, g.ball!, u) });
  }
  if (S.player && S.player.ball) {
    D.push({ z: dep(S.player.ball.x, S.player.ball.y), f: () => drawAvatar(ctx, u) });
    if (S.player.state === 'aim') D.push({ z: dep(S.player.ball.x, S.player.ball.y) - 0.02, f: () => drawRestingBall(ctx, S.player!.ball!, u) });
  }
  for (const b of S.balls) D.push({ z: dep(b.x, b.y) + 2, f: () => drawFlyingBall(ctx, b, u) });
  D.sort((a, b) => a.z - b.z);
  for (const d of D) d.f();

  drawAim(ctx, u);
  drawParticles(ctx, u);
  drawFloaters(ctx, u);

  const vignette = ctx.createRadialGradient(cssW / 2, cssH * 0.46, Math.min(cssW, cssH) * 0.22, cssW / 2, cssH / 2, Math.max(cssW, cssH) * 0.72);
  vignette.addColorStop(0, 'rgba(7,20,20,0)');
  vignette.addColorStop(0.72, 'rgba(7,20,20,.025)');
  vignette.addColorStop(1, 'rgba(4,12,15,.16)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, cssW, cssH);
}

/** Terrain-following tile outline. */
function tileDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, u: number) {
  const cp = (cx: number, cy: number) => {
    const p = P(cx, cy);
    return { x: p.x, y: p.y - cornerH(cx, cy) * EH * u };
  };
  const a = cp(x, y);
  const b = cp(x + 1, y);
  const c = cp(x + 1, y + 1);
  const d = cp(x, y + 1);
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(d.x, d.y);
  ctx.closePath();
}

function drawForSale(ctx: CanvasRenderingContext2D, x: number, y: number, u: number) {
  const p = PE(x, y);
  ctx.strokeStyle = '#6d4a2b';
  ctx.lineWidth = 2 * u;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x, p.y - 13 * u);
  ctx.stroke();
  const w = 34 * u;
  const h = 12 * u;
  ctx.fillStyle = '#fffdf2';
  ctx.strokeStyle = '#16301f';
  ctx.lineWidth = 1.2 * u;
  ctx.beginPath();
  ctx.roundRect(p.x - w / 2, p.y - 13 * u - h, w, h, 2.5 * u);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#a33d31';
  ctx.font = 'bold ' + 6 * u + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FOR SALE', p.x, p.y - 13 * u - h / 2 + 2.2 * u);
}

function drawEditorOverlays(ctx: CanvasRenderingContext2D, u: number) {
  if (S.mode === 'build' && S.tool === 'land' && S.hover && inb(S.hover.x, S.hover.y)) {
    // outline the hovered parcel
    const px = Math.floor(S.hover.x / PARCEL_W);
    const py = Math.floor(S.hover.y / PARCEL_H);
    const owned = S.owned[py * PW + px] === 1;
    const cp = (cx: number, cy: number) => {
      const p = P(cx, cy);
      return { x: p.x, y: p.y - cornerH(cx, cy) * EH * u };
    };
    const x0 = px * PARCEL_W;
    const y0 = py * PARCEL_H;
    ctx.beginPath();
    const pts = [cp(x0, y0), cp(x0 + PARCEL_W, y0), cp(x0 + PARCEL_W, y0 + PARCEL_H), cp(x0, y0 + PARCEL_H)];
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fillStyle = owned ? 'rgba(124,194,66,.12)' : 'rgba(233,181,60,.18)';
    ctx.fill();
    ctx.setLineDash([8 * u, 6 * u]);
    ctx.strokeStyle = owned ? 'rgba(180,220,150,.8)' : '#ffd856';
    ctx.lineWidth = 2.5 * u;
    ctx.stroke();
    ctx.setLineDash([]);
    const c = PE(x0 + PARCEL_W / 2, y0 + PARCEL_H / 2);
    ctx.fillStyle = '#fffdf2';
    ctx.strokeStyle = 'rgba(20,40,25,.85)';
    ctx.lineWidth = 3;
    ctx.font = '800 ' + clamp(12 * u, 12, 22) + 'px sans-serif';
    ctx.textAlign = 'center';
    const label = owned ? 'Your land' : 'Buy for ' + fmt$(LAND_COST);
    ctx.strokeText(label, c.x, c.y - 20 * u);
    ctx.fillText(label, c.x, c.y - 20 * u);
  }
  if (S.mode === 'build' && S.hover && ['fair', 'green', 'sand', 'water', 'tree', 'flower', 'dozer', 'hole', 'path', 'raise', 'lower'].includes(S.tool)) {
    const { x, y } = S.hover;
    if (inb(x, y)) {
      ctx.beginPath();
      tileDiamond(ctx, x, y, u);
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (S.tool === 'raise' || S.tool === 'lower') {
        const c = PE(x + 0.5, y + 0.5);
        ctx.fillStyle = 'rgba(255,255,255,.95)';
        ctx.font = 'bold ' + 11 * u + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(S.tool === 'raise' ? '▲' : '▼', c.x, c.y - 8 * u);
      }
    }
  }
  if (S.mode === 'build' && S.tool === 'build' && S.buildKind && S.hover) {
    const def = CATALOG[S.buildKind];
    const bx = S.hover.x - ((def.w / 2) | 0);
    const by = S.hover.y - ((def.h / 2) | 0);
    const ok = canPlace(S.buildKind, bx, by, lockedTilesForRender(), occupiedTiles());
    ctx.fillStyle = ok ? 'rgba(124,194,66,.45)' : 'rgba(207,68,55,.45)';
    ctx.strokeStyle = ok ? 'rgba(255,255,255,.9)' : 'rgba(255,180,170,.95)';
    ctx.lineWidth = 1.5;
    for (let dy = 0; dy < def.h; dy++)
      for (let dx = 0; dx < def.w; dx++) {
        ctx.beginPath();
        tileDiamond(ctx, bx + dx, by + dy, u);
        ctx.fill();
        ctx.stroke();
      }
  }
  if (S.holeDraft) {
    const tp = PE(S.holeDraft.tee.x + 0.5, S.holeDraft.tee.y + 0.5);
    ctx.fillStyle = '#fffdf2';
    ctx.strokeStyle = '#16301f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(tp.x, tp.y, 6 * u, 0, 7);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#16301f';
    ctx.font = 'bold ' + 9 * u + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TEE', tp.x, tp.y + 3 * u);
    if (S.hover) {
      const hp = PE(S.hover.x + 0.5, S.hover.y + 0.5);
      ctx.setLineDash([6 * u, 5 * u]);
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = 2 * u;
      ctx.beginPath();
      ctx.moveTo(tp.x, tp.y);
      ctx.lineTo(hp.x, hp.y);
      ctx.stroke();
      ctx.setLineDash([]);
      const d = Math.hypot(S.hover.x - S.holeDraft.tee.x, S.hover.y - S.holeDraft.tee.y);
      ctx.fillStyle = d < 6 ? '#ff9d94' : '#fffdf2';
      ctx.font = 'bold ' + 11 * u + 'px sans-serif';
      ctx.fillText(d < 6 ? 'too close' : 'PAR ' + parFor(d), (tp.x + hp.x) / 2, (tp.y + hp.y) / 2 - 6 * u);
    }
  }
}

/* ================= scenery ================= */
function drawTree(ctx: CanvasRenderingContext2D, tr: { x: number; y: number; s: number }, u: number) {
  const p = PE(tr.x, tr.y);
  const sc = (0.78 + tr.s * 0.38) * u;
  ctx.fillStyle = 'rgba(5,22,17,.24)';
  ctx.beginPath();
  ctx.ellipse(p.x + 7 * sc, p.y + 3 * u, 14 * sc, 4.8 * sc, 0.16, 0, Math.PI * 2);
  ctx.fill();
  const kind: TreeKind = tr.s > 0.85 ? 'blossom' : tr.s > 0.62 ? 'pine' : 'round';
  const spr = treeSprite(kind, ((tr.s * 97) | 0) % 3);
  const sway = Math.sin(S.time * 1.1 + tr.s * 9) * 0.013;
  const k = sc * 0.92;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(p.x, p.y);
  ctx.rotate(sway);
  ctx.drawImage(spr, -21 * k, -52 * k, 42 * k, 56 * k);
  ctx.restore();
  ctx.imageSmoothingEnabled = true;
}

function drawFlag(ctx: CanvasRenderingContext2D, h: Hole, num: number, u: number) {
  const p = PE(h.cup.x, h.cup.y);
  ctx.fillStyle = '#123a20';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, 3.4 * u, 1.7 * u, 0, 0, 7);
  ctx.fill();
  ctx.strokeStyle = '#f3efe2';
  ctx.lineWidth = 1.6 * u;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x, p.y - 30 * u);
  ctx.stroke();
  const wob = Math.sin(S.time * 3 + num) * 2 * u;
  ctx.fillStyle = '#d0453a';
  ctx.strokeStyle = '#8e2c24';
  ctx.lineWidth = 0.8 * u;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y - 30 * u);
  ctx.lineTo(p.x + 14 * u, p.y - 25.5 * u + wob);
  ctx.lineTo(p.x, p.y - 21 * u);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold ' + 7.5 * u + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(num), p.x + 6 * u, p.y - 23 * u + wob * 0.4);
}

function drawTeeSign(ctx: CanvasRenderingContext2D, h: Hole, num: number, u: number) {
  const p = PE(h.tee.x - 1.1, h.tee.y - 1.1);
  ctx.strokeStyle = '#6d4a2b';
  ctx.lineWidth = 2 * u;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x, p.y - 12 * u);
  ctx.stroke();
  ctx.fillStyle = '#fffdf2';
  ctx.strokeStyle = '#16301f';
  ctx.lineWidth = 1.2 * u;
  const w = 22 * u;
  const hh = 11 * u;
  ctx.beginPath();
  ctx.roundRect(p.x - w / 2, p.y - 12 * u - hh, w, hh, 3 * u);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#16301f';
  ctx.font = 'bold ' + 6.5 * u + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(num + ' · PAR ' + h.par, p.x, p.y - 12 * u - hh / 2 + 2.4 * u);
}

/* ================= buildings (baked pixel sprites) ================= */

type Pt = { x: number; y: number };
function cornerAt(cx: number, cy: number, e: number, u: number): Pt {
  const p = P(cx, cy);
  return { x: p.x, y: p.y - e * EH * u };
}

/** Draw a baked sprite with its anchor at (x,y), pixelated. */
function drawAnchored(ctx: CanvasRenderingContext2D, spr: BSprite, x: number, y: number, u: number, scale = 1) {
  const k = u * scale;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(spr.cv, x - spr.ax * k, y - spr.ay * k, spr.cv.width * k, spr.cv.height * k);
  ctx.restore();
  ctx.imageSmoothingEnabled = true;
}

function drawWorldLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, u: number, tone: 'dark' | 'gold' | 'danger' = 'dark') {
  const size = clamp(6.4 * u, 7, 11);
  ctx.font = '800 ' + size + 'px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + clamp(10 * u, 9, 16);
  const h = size + clamp(6 * u, 6, 10);
  ctx.fillStyle = tone === 'danger' ? 'rgba(112,41,31,.92)' : 'rgba(18,43,34,.9)';
  ctx.strokeStyle = tone === 'danger' ? '#f1a078' : tone === 'gold' ? '#e9b53c' : 'rgba(231,239,205,.52)';
  ctx.lineWidth = Math.max(1, 1.1 * u);
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, h * 0.38);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = tone === 'gold' ? '#ffe39a' : '#fff8df';
  ctx.fillText(text, x, y + 0.3);
  ctx.textBaseline = 'alphabetic';
}

/** Boxy facilities get a soft ground shadow; flat panels bring their own ground. */
const SHADOWED = new Set(['proshop', 'snackbar', 'cartgarage', 'hotel', 'clubhouse']);

function drawClubhouse(ctx: CanvasRenderingContext2D, u: number) {
  const e = elevAt(CH.x, CH.y);
  const c = cornerAt(Math.floor(CH.x), Math.floor(CH.y), e, u);
  ctx.fillStyle = 'rgba(5,22,17,.24)';
  ctx.beginPath();
  ctx.ellipse(c.x + 8 * u, c.y + 4 * u, 42 * u, 14 * u, 0.12, 0, Math.PI * 2);
  ctx.fill();
  drawAnchored(ctx, buildingSprite('clubhouse'), c.x, c.y, u);
  if (S.cam.z > 0.62) drawWorldLabel(ctx, 'CLUBHOUSE', c.x, c.y - 66 * u, u, 'gold');
}

function spriteKeyFor(b: Building): string {
  if (b.kind !== 'buildinglot') return b.kind;
  const stage = clamp(b.stage ?? 0, 0, 2);
  if (stage === 0) return 'lot0';
  const vi = Math.abs((b.id * 7919) | 0) % 5;
  return 'house' + stage + '_' + vi;
}

function drawBuilding(ctx: CanvasRenderingContext2D, b: Building, u: number) {
  const def = CATALOG[b.kind];
  const e = elevAt(b.x + 0.01, b.y + 0.01);
  const c = cornerAt(b.x + b.w / 2, b.y + b.h / 2, e, u);
  if (b.kind === 'bench' || b.kind === 'flowerbed') {
    ctx.fillStyle = 'rgba(5,22,17,.2)';
    ctx.beginPath();
    ctx.ellipse(c.x + 3 * u, c.y + 1.5 * u, 10 * u, 3.5 * u, 0.12, 0, Math.PI * 2);
    ctx.fill();
    drawAnchored(ctx, propSprite(b.kind), c.x, c.y, u, 0.8);
    return;
  }
  const key = spriteKeyFor(b);
  if (SHADOWED.has(key) || key.startsWith('house')) {
    ctx.fillStyle = 'rgba(5,22,17,.23)';
    ctx.beginPath();
    ctx.ellipse(c.x + 7 * u, c.y + 4 * u, ((b.w + b.h) / 2) * 20 * u, ((b.w + b.h) / 2) * 7.5 * u, 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
  drawAnchored(ctx, buildingSprite(key), c.x, c.y, u);
  if (S.cam.z > 0.68) {
    const spr = buildingSprite(key);
    const topY = c.y - spr.ay * u;
    drawWorldLabel(ctx, b.kind === 'buildinglot' ? ['BUILDING…', 'COTTAGE', 'ESTATE'][clamp(b.stage ?? 0, 0, 2)] : def.name.toUpperCase(), c.x, topY - 6 * u, u);
  }
  if (!b.open) {
    drawWorldLabel(ctx, 'NO PATH', c.x, c.y + 9 * u, u, 'danger');
  }
}

/* ================= actors ================= */
function drawGolferSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  u: number,
  shirt: string,
  skin: string,
  cap: string,
  frame: GolferFrame,
  face: number,
  bob: number
) {
  ctx.fillStyle = 'rgba(5,22,17,.24)';
  ctx.beginPath();
  ctx.ellipse(x + 2.5 * u, y + 1.5 * u, 6.2 * u, 2.5 * u, 0.1, 0, Math.PI * 2);
  ctx.fill();
  const spr = golferSprite(shirt, skin, cap, frame);
  const k = u * 0.8;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(x, y - bob);
  ctx.scale(face, 1);
  ctx.drawImage(spr, -12 * k, -31 * k, 24 * k, 32 * k);
  ctx.restore();
  ctx.imageSmoothingEnabled = true;
}

function golferFrame(g: Golfer): GolferFrame {
  if (g.state === 'toTee' || g.state === 'toBall' || g.state === 'leave') return Math.sin(g.phase) > 0 ? 'walkA' : 'walkB';
  if (g.state === 'prePutt') return 'putt';
  if (g.state === 'preshot') return g.t < 0.28 ? 'back' : 'address';
  if (g.state === 'watch') return g.t > 0 ? 'follow' : 'idle';
  return 'idle';
}

function drawGolfer(ctx: CanvasRenderingContext2D, g: Golfer, u: number) {
  const p = PE(g.x, g.y);
  const walking = g.state === 'toTee' || g.state === 'toBall' || g.state === 'leave';
  const bob = walking ? Math.abs(Math.sin(g.phase)) * 1.2 * u : 0;
  drawGolferSprite(ctx, p.x, p.y, u, g.shirt, g.skin, g.cap, golferFrame(g), g.face ?? 1, bob);
}

function drawAvatar(ctx: CanvasRenderingContext2D, u: number) {
  const pl = S.player!;
  const b = pl.ball!;
  const bp = PE(b.x, b.y);
  const px = bp.x - 7 * u;
  const py = bp.y - 1 * u;
  const frame: GolferFrame = pl.state === 'wait' ? 'follow' : pl.lie === 'green' ? 'putt' : 'address';
  drawGolferSprite(ctx, px, py, u, '#e9b53c', '#f1c6a0', '#fffdf2', frame, 1, 0);
  drawWorldLabel(ctx, 'YOU', px, py - 31 * u, u, 'gold');
}

function drawRestingBall(ctx: CanvasRenderingContext2D, b: Vec, u: number) {
  const p = PE(b.x, b.y);
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 0.6 * u, 2 * u, 1 * u, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = 'rgba(0,0,0,.3)';
  ctx.lineWidth = 0.6 * u;
  ctx.beginPath();
  ctx.arc(p.x, p.y - 1 * u, 2 * u, 0, 7);
  ctx.fill();
  ctx.stroke();
}

function drawFlyingBall(ctx: CanvasRenderingContext2D, b: Ball, u: number) {
  const p = PE(b.x, b.y);
  const e = b.kind === 'fly' ? Math.sin(Math.PI * clamp(b.t, 0, 1)) * b.h * u : 0;
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  const sh = clamp(1 - e / (70 * u), 0.35, 1);
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 0.6 * u, 2.4 * u * sh + 0.6 * u, 1.2 * u * sh + 0.3 * u, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = 'rgba(0,0,0,.3)';
  ctx.lineWidth = 0.6 * u;
  ctx.beginPath();
  ctx.arc(p.x, p.y - 1 * u - e, 2.2 * u, 0, 7);
  ctx.fill();
  ctx.stroke();
}

function drawAim(ctx: CanvasRenderingContext2D, u: number) {
  const p = S.player;
  if (!p || p.state !== 'aim' || !p.aim || !p.aim.on) return;
  const a = p.aim;
  const w0 = screenToWorld(a.sx, a.sy);
  const w1 = screenToWorld(a.cx, a.cy);
  let dx = w0.x - w1.x;
  let dy = w0.y - w1.y;
  const pl = Math.hypot(dx, dy);
  if (pl < 0.15) return;
  dx /= pl;
  dy /= pl;
  const L = LIE[p.lie] || LIE.rough;
  const power = clamp(pl / 9, 0.08, 1);
  const intend = power * L.max;
  const bp = PE(p.ball!.x, p.ball!.y);
  ctx.setLineDash([5 * u, 5 * u]);
  ctx.strokeStyle = 'rgba(255,255,255,.95)';
  ctx.lineWidth = 2 * u;
  ctx.beginPath();
  ctx.moveTo(bp.x, bp.y - 1 * u);
  for (let t = 0.1; t <= 1.001; t += 0.1) {
    const q = PE(p.ball!.x + dx * intend * t, p.ball!.y + dy * intend * t);
    ctx.lineTo(q.x, q.y - (p.lie === 'green' ? 0 : Math.sin(Math.PI * t) * intend * 3.4 * u));
  }
  ctx.stroke();
  ctx.setLineDash([]);
  const land = PE(p.ball!.x + dx * intend, p.ball!.y + dy * intend);
  const spread = intend * (L.dst + 0.04) + intend * Math.sin((L.ang * Math.PI) / 180) * 0.6 + 0.3;
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = 1.6 * u;
  ctx.beginPath();
  ctx.ellipse(land.x, land.y, spread * 22 * u, spread * 11 * u, 0, 0, 7);
  ctx.stroke();
  ctx.fillStyle = 'rgba(20,40,28,.75)';
  ctx.fillRect(bp.x - 18 * u, bp.y + 8 * u, 36 * u, 6 * u);
  ctx.fillStyle = power > 0.85 ? '#e9b53c' : '#7cc242';
  ctx.fillRect(bp.x - 17 * u, bp.y + 9 * u, 34 * u * power, 4 * u);
}

function drawParticles(ctx: CanvasRenderingContext2D, u: number) {
  for (const p of S.parts) {
    const q = PE(p.x, p.y);
    ctx.globalAlpha = clamp(1 - p.age / p.life, 0, 1);
    ctx.fillStyle = p.c;
    ctx.fillRect(q.x - 1.5 * u, q.y - 1.5 * u - 6 * u, 3 * u, 3 * u);
  }
  ctx.globalAlpha = 1;
}

function drawFloaters(ctx: CanvasRenderingContext2D, u: number) {
  ctx.textAlign = 'center';
  for (const f of S.floaters) {
    const rise = f.kind === 'bub' ? 8 : 22;
    const q = PE(f.wx, f.wy);
    const y = q.y - 14 * u - f.age * rise;
    const alpha = clamp(f.life - f.age, 0, 1) / Math.min(1, f.life);
    ctx.globalAlpha = clamp(alpha * 1.4, 0, 1);
    if (f.kind === 'bub') {
      ctx.font = '600 ' + clamp(11 * u, 10, 15) + 'px sans-serif';
      const w = ctx.measureText(f.txt).width + 14;
      ctx.fillStyle = 'rgba(255,253,242,.95)';
      ctx.strokeStyle = '#16301f';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(q.x - w / 2, y - 16, w, 20, 8);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(q.x - 4, y + 4);
      ctx.lineTo(q.x, y + 10);
      ctx.lineTo(q.x + 4, y + 4);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,253,242,.95)';
      ctx.fill();
      ctx.fillStyle = '#16301f';
      ctx.fillText(f.txt, q.x, y - 2);
    } else {
      ctx.font = '800 ' + clamp((f.kind === 'cash' ? 13 : 12) * u, 11, 18) + 'px sans-serif';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(10,30,20,.8)';
      ctx.strokeText(f.txt, q.x, y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.txt, q.x, y);
    }
  }
  ctx.globalAlpha = 1;
}
