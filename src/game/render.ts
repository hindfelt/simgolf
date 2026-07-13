import { W, H, TW, TH, EH, MAXE, TINFO, themedTile, CH, PATH_MUD, PW, PH, PARCEL_W, PARCEL_H } from './constants';
import { Tile } from './types';
import type { Ball, Building, Golfer, Hole, Vec } from './types';
import { S, caches } from './state';
import { clamp, hash2, inb, elevAt, idx, cornerH, ownedAt, fmt$, lieOf } from './rng';
import { P, PE, viewXY } from './camera';
import { activePlayingPro, currentPlayerShotForecast, parFor, playerAimIntent, playerEstimatedRoll, playerShotDispersion } from './engine';
import { CATALOG, themedDef, facilityDisplayName, facilityLevel, canPlace, occupiedTiles } from './buildings';
import { lockedTilesForRender } from './engine';
import { GOLFER_SPRITE_SIZE, golferSprite, treeSprite, buildingSprite, propSprite, facilityPlaneSprite, facilityBoatSprite, wildlifeSprite, courseStaffAnimationFrame, courseStaffSprite } from './sprites';
import type { CourseStaffFrame, CourseStaffKind } from './sprites';
import type { GolferFrame, BSprite } from './sprites';
import { facilityActivityPose } from './facilityActivity';
import type { FacilityActivityPose } from './facilityActivity';
import { countEmp } from './employees';
import { BRIDGE_HALF_WIDTH, bridgeConnectionsAt, isStreamBackedTile } from './bridges';
import { ballFlightPosition } from './flightPath';
import { sharedTreeKindFor, treeCollisionProfile } from './treeGeometry';

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
const Grp = {
  ROUGH: 0,
  FAIR: 1,
  GREEN: 2,
  SAND: 3,
  WATER: 4,
  PATH: 5,
  TEE: 6,
  FIRM_FAIR: 7,
  DEEP_ROUGH: 8,
  WASTE: 9,
  POT: 10,
  STREAM: 11,
  BRUSH: 12,
  ROCK: 13,
} as const;
function groupOf(t: number): Grp {
  switch (t) {
    case Tile.FAIR:
      return Grp.FAIR;
    case Tile.FIRM_FAIR:
      return Grp.FIRM_FAIR;
    case Tile.TEE:
      return Grp.TEE;
    case Tile.GREEN:
      return Grp.GREEN;
    case Tile.SAND:
      return Grp.SAND;
    case Tile.DEEP_ROUGH:
      return Grp.DEEP_ROUGH;
    case Tile.WASTE_BUNKER:
      return Grp.WASTE;
    case Tile.POT_BUNKER:
      return Grp.POT;
    case Tile.STREAM:
    case Tile.BRIDGE_STREAM:
      return Grp.STREAM;
    case Tile.BRUSH:
      return Grp.BRUSH;
    case Tile.ROCK:
      return Grp.ROCK;
    case Tile.WATER:
    case Tile.BRIDGE_WATER:
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
  c.fillStyle = themedTile(Tile.ROUGH, S.theme).c1;
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
    const waterInfo = themedTile(Tile.WATER, S.theme);
    const waterDeep: Record<typeof S.theme, string> = { parklands: '#1f5566', links: '#28495a', desert: '#1f6d6e', tropical: '#155e64' };
    const waterGrad = c.createLinearGradient(0, 0, oc.width, oc.height);
    waterGrad.addColorStop(0, waterInfo.c1);
    waterGrad.addColorStop(0.55, waterInfo.c2);
    waterGrad.addColorStop(1, waterDeep[S.theme]);
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
    // Paled toward the original's cream bunker sand (resources/…/Textures/SandBunker*)
    // rather than a saturated tan — a real reference comparison, not a copied asset.
    c.strokeStyle = '#b39f6b';
    c.lineWidth = 7;
    c.stroke(sand.path);
    const sandInfo = themedTile(Tile.SAND, S.theme);
    const sandGrad = c.createLinearGradient(0, 0, oc.width, oc.height);
    sandGrad.addColorStop(0, S.theme === 'parklands' ? '#f1e5bf' : sandInfo.c1);
    sandGrad.addColorStop(1, sandInfo.c2);
    c.fillStyle = sandGrad;
    c.fill(sand.path);
    c.save();
    c.clip(sand.path);
    c.fillStyle = 'rgba(105,75,27,.16)';
    for (const [x, y] of sand.tiles)
      for (let i = 0; i < 7; i++) {
        const a = hash2(x * 3 + i, y * 5 + i);
        const b = hash2(y * 9 + i, x * 7 + i);
        c.fillRect(x * RES + a * (RES - 2), y * RES + b * (RES - 2), 1.3, 1.3);
      }
    c.strokeStyle = 'rgba(126,91,35,.18)';
    c.lineWidth = 1;
    for (const [x, y] of sand.tiles) {
      const rr = RES * (0.19 + hash2(x, y) * 0.08);
      c.beginPath();
      c.arc(x * RES + RES * 0.48, y * RES + RES * 0.52, rr, 0.22, 2.55);
      c.stroke();
    }
    c.restore();
    c.strokeStyle = 'rgba(250,240,201,.7)';
    c.lineWidth = 1.4;
    c.stroke(sand.path);
  }

  // 3b) Manual hazard family. Each material has a distinct silhouette so the
  // player can read the danger at gameplay zoom without relying on UI labels.
  const deepRough = blobPath(Grp.DEEP_ROUGH, RES * 0.36);
  if (deepRough.any) {
    const info = themedTile(Tile.DEEP_ROUGH, S.theme);
    c.strokeStyle = S.theme === 'desert' ? '#756d3e' : '#294725';
    c.lineWidth = 5;
    c.stroke(deepRough.path);
    c.fillStyle = info.c2;
    c.fill(deepRough.path);
    c.save();
    c.clip(deepRough.path);
    for (const [x, y] of deepRough.tiles)
      for (let i = 0; i < 12; i++) {
        const a = hash2(x * 23 + i * 7, y * 19 + i * 17);
        const b = hash2(y * 29 + i * 11, x * 13 + i * 5);
        const px = x * RES + 3 + a * (RES - 6);
        const py = y * RES + 5 + b * (RES - 8);
        const h = 3 + hash2(x + i * 31, y + i * 37) * 5;
        c.strokeStyle = i & 1 ? info.c1 : S.theme === 'desert' ? '#d0b66a' : '#7fa455';
        c.globalAlpha = 0.42;
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(px, py + 2);
        c.quadraticCurveTo(px - 1.4, py - h * 0.4, px - 2.2, py - h);
        c.moveTo(px + 0.5, py + 2);
        c.quadraticCurveTo(px + 1.3, py - h * 0.35, px + 2.4, py - h * 0.82);
        c.stroke();
      }
    c.restore();
    c.globalAlpha = 1;
    c.strokeStyle = 'rgba(20,45,20,.42)';
    c.lineWidth = 1.2;
    c.stroke(deepRough.path);
  }

  const waste = blobPath(Grp.WASTE, RES * 0.42);
  if (waste.any) {
    const info = themedTile(Tile.WASTE_BUNKER, S.theme);
    c.strokeStyle = S.theme === 'desert' ? '#704a30' : '#5d5b38';
    c.lineWidth = 8;
    c.stroke(waste.path);
    c.strokeStyle = S.theme === 'desert' ? '#d0a563' : '#b6a56d';
    c.lineWidth = 5;
    c.stroke(waste.path);
    c.fillStyle = info.c2;
    c.fill(waste.path);
    c.save();
    c.clip(waste.path);
    for (const [x, y] of waste.tiles)
      for (let i = 0; i < 9; i++) {
        const a = hash2(x * 17 + i * 13, y * 31 + i * 5);
        const b = hash2(y * 11 + i * 19, x * 7 + i * 23);
        const px = x * RES + 3 + a * (RES - 6);
        const py = y * RES + 4 + b * (RES - 7);
        c.strokeStyle = i % 3 ? 'rgba(72,61,34,.58)' : 'rgba(219,198,122,.52)';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(px, py + 2);
        c.lineTo(px + (a - 0.5) * 3, py - 3 - b * 3);
        c.stroke();
      }
    c.restore();
  }

  // Pot bunkers are deliberately compact, dark and steep instead of merging into
  // a conventional sand blob. The nested rings create a readable sunken crater.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (S.tiles[idx(x, y)] !== Tile.POT_BUNKER) continue;
      const info = themedTile(Tile.POT_BUNKER, S.theme);
      const cx = x * RES + RES / 2;
      const cy = y * RES + RES / 2;
      c.fillStyle = S.theme === 'desert' ? '#c08e55' : '#7f8057';
      c.beginPath();
      c.ellipse(cx, cy, RES * 0.43, RES * 0.34, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = info.c1;
      c.beginPath();
      c.ellipse(cx + 1, cy + 1, RES * 0.34, RES * 0.25, 0, 0, Math.PI * 2);
      c.fill();
      const pit = c.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, RES * 0.3);
      pit.addColorStop(0, '#171d1a');
      pit.addColorStop(0.68, info.c2);
      pit.addColorStop(1, info.c1);
      c.fillStyle = pit;
      c.beginPath();
      c.ellipse(cx, cy + 2, RES * 0.27, RES * 0.19, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = 'rgba(235,217,150,.42)';
      c.lineWidth = 1;
      c.beginPath();
      c.arc(cx - 1, cy, RES * 0.29, Math.PI * 1.05, Math.PI * 1.83);
      c.stroke();
    }

  // Streams join edge-to-edge. On Links they read as dark peat Burns; on Desert
  // the same gameplay tile is a dry Ravine, with no misleading water highlight.
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!isStreamBackedTile(S.tiles[idx(x, y)])) continue;
      const cx = x * RES + RES / 2;
      const cy = y * RES + RES / 2;
      const joins: [number, number][] = [];
      if (y > 0 && isStreamBackedTile(S.tiles[idx(x, y - 1)])) joins.push([cx, y * RES]);
      if (y + 1 < H && isStreamBackedTile(S.tiles[idx(x, y + 1)])) joins.push([cx, (y + 1) * RES]);
      if (x > 0 && isStreamBackedTile(S.tiles[idx(x - 1, y)])) joins.push([x * RES, cy]);
      if (x + 1 < W && isStreamBackedTile(S.tiles[idx(x + 1, y)])) joins.push([(x + 1) * RES, cy]);
      const channel = new Path2D();
      if (!joins.length) {
        channel.moveTo(cx - RES * 0.12, cy + RES * 0.12);
        channel.lineTo(cx + RES * 0.12, cy - RES * 0.12);
      } else {
        for (const [ex, ey] of joins) {
          channel.moveTo(cx, cy);
          channel.lineTo(ex, ey);
        }
      }
      c.strokeStyle = S.theme === 'desert' ? '#3b2b26' : S.theme === 'links' ? '#393b31' : '#8f774b';
      c.lineWidth = S.theme === 'desert' ? 13 : 12;
      c.stroke(channel);
      const info = themedTile(Tile.STREAM, S.theme);
      c.strokeStyle = info.c2;
      c.lineWidth = S.theme === 'desert' ? 8 : 7;
      c.stroke(channel);
      c.strokeStyle = S.theme === 'desert' ? 'rgba(192,137,75,.42)' : 'rgba(173,235,236,.42)';
      c.lineWidth = 1.4;
      c.stroke(channel);
      if (!joins.length) {
        c.fillStyle = info.c1;
        c.beginPath();
        c.ellipse(cx, cy, RES * 0.22, RES * 0.16, -0.35, 0, Math.PI * 2);
        c.fill();
      }
    }
  c.restore();

  // Brush/Gorse is dense, irregular plant life rather than another flat green.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (S.tiles[idx(x, y)] !== Tile.BRUSH) continue;
      const info = themedTile(Tile.BRUSH, S.theme);
      c.fillStyle = info.c2;
      c.beginPath();
      c.roundRect(x * RES + 2, y * RES + 2, RES - 4, RES - 4, RES * 0.34);
      c.fill();
      for (let i = 0; i < 10; i++) {
        const a = hash2(x * 19 + i * 7, y * 23 + i * 13);
        const b = hash2(y * 17 + i * 11, x * 29 + i * 5);
        const px = x * RES + 4 + a * (RES - 8);
        const py = y * RES + 4 + b * (RES - 8);
        c.fillStyle = i & 1 ? info.c1 : '#263f27';
        c.beginPath();
        c.arc(px, py, 2.5 + a * 2.2, 0, Math.PI * 2);
        c.fill();
        if (S.theme === 'links' && i % 3 === 0) {
          c.fillStyle = '#e0bd43';
          c.fillRect(px - 0.8, py - 1.2, 1.6, 1.6);
        }
      }
    }

  // Rock tiles use a few large faceted boulders; their hard angular edges preview
  // the random ricochet mechanic before the player ever lands on one.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (S.tiles[idx(x, y)] !== Tile.ROCK) continue;
      const info = themedTile(Tile.ROCK, S.theme);
      for (let i = 0; i < 4; i++) {
        const a = hash2(x * 31 + i * 17, y * 11 + i * 7);
        const b = hash2(y * 37 + i * 5, x * 13 + i * 19);
        const px = x * RES + 5 + a * (RES - 10);
        const py = y * RES + 7 + b * (RES - 12);
        const rr = 3.5 + a * 3;
        c.fillStyle = '#303a37';
        c.beginPath();
        c.moveTo(px - rr - 1, py + rr * 0.7 + 1);
        c.lineTo(px - rr * 0.65, py - rr * 0.45);
        c.lineTo(px + rr * 0.15, py - rr - 1);
        c.lineTo(px + rr + 1, py + rr * 0.55 + 1);
        c.closePath();
        c.fill();
        c.fillStyle = i & 1 ? info.c1 : info.c2;
        c.beginPath();
        c.moveTo(px - rr, py + rr * 0.5);
        c.lineTo(px - rr * 0.55, py - rr * 0.4);
        c.lineTo(px + rr * 0.12, py - rr);
        c.lineTo(px + rr, py + rr * 0.45);
        c.closePath();
        c.fill();
        c.fillStyle = 'rgba(238,229,198,.34)';
        c.beginPath();
        c.moveTo(px - rr * 0.55, py - rr * 0.4);
        c.lineTo(px + rr * 0.12, py - rr);
        c.lineTo(px + rr * 0.2, py - rr * 0.1);
        c.closePath();
        c.fill();
      }
    }

  // 4) Fairway with broad mower lanes.
  const fair = blobPath(Grp.FAIR, RES * 0.5);
  if (fair.any) {
    c.strokeStyle = '#426e32';
    c.lineWidth = 5;
    c.stroke(fair.path);
    const fairInfo = themedTile(Tile.FAIR, S.theme);
    c.fillStyle = fairInfo.c1;
    c.fill(fair.path);
    c.save();
    c.clip(fair.path);
    c.fillStyle = fairInfo.c2;
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
  }

  // 4b) Firm fairway — baked, hard-packed turf: flat fill + fine speckle instead of
  // the lush mower-lane stripes, so it visually reads as drier ground (manual: "bounces
  // higher and rolls farther").
  const firm = blobPath(Grp.FIRM_FAIR, RES * 0.5);
  if (firm.any) {
    c.strokeStyle = '#7a8a4a';
    c.lineWidth = 5;
    c.stroke(firm.path);
    const firmInfo = themedTile(Tile.FIRM_FAIR, S.theme);
    c.fillStyle = firmInfo.c1;
    c.fill(firm.path);
    c.save();
    c.clip(firm.path);
    for (const [x, y] of firm.tiles)
      for (let i = 0; i < 5; i++) {
        const a = hash2(x * 11 + i, y * 13 + i * 3);
        const b = hash2(y * 7 + i * 5, x * 17 + i);
        c.fillStyle = a > 0.5 ? 'rgba(80,70,30,.1)' : 'rgba(240,235,190,.12)';
        c.fillRect(x * RES + a * (RES - 3), y * RES + b * (RES - 3), 1.6, 1.6);
      }
    c.restore();
    c.strokeStyle = 'rgba(70,80,40,.35)';
    c.lineWidth = 1.4;
    c.stroke(firm.path);
  }

  // 5) Tee boxes — a compact circular cut with a darker collar and subtle
  // quadrant mowing, matching the understated read of classic SimGolf tees.
  const tee = blobPath(Grp.TEE, RES * 0.78);
  if (tee.any) {
    c.strokeStyle = '#426e32';
    c.lineWidth = 10;
    c.stroke(tee.path);
    c.strokeStyle = '#78aa50';
    c.lineWidth = 6;
    c.stroke(tee.path);
    const teeGrad = c.createLinearGradient(0, 0, oc.width, oc.height);
    teeGrad.addColorStop(0, '#99cf72');
    teeGrad.addColorStop(1, '#76b65c');
    c.fillStyle = teeGrad;
    c.fill(tee.path);
    c.save();
    c.clip(tee.path);
    for (const hole of S.holes) {
      const cx = hole.tee.x * RES;
      const cy = hole.tee.y * RES;
      const radius = RES * 1.08;
      for (let q = 0; q < 4; q++) {
        c.fillStyle = q & 1 ? 'rgba(232,248,188,.09)' : 'rgba(30,83,36,.055)';
        c.beginPath();
        c.moveTo(cx, cy);
        c.arc(cx, cy, radius, -Math.PI / 4 + q * Math.PI / 2, -Math.PI / 4 + (q + 1) * Math.PI / 2);
        c.closePath();
        c.fill();
      }
      c.strokeStyle = 'rgba(43,94,39,.2)';
      c.lineWidth = 2.5;
      c.beginPath();
      c.ellipse(cx, cy, RES * 0.62, RES * 0.62, 0, 0, Math.PI * 2);
      c.stroke();
    }
    c.restore();
    c.strokeStyle = 'rgba(31,73,32,.42)';
    c.lineWidth = 1.4;
    c.stroke(tee.path);
  }

  // 6) Greens — double fringe, subtle checker cut and a crisp collar.
  const green = blobPath(Grp.GREEN, RES * 0.6);
  if (green.any) {
    c.strokeStyle = '#477f38';
    c.lineWidth = 9;
    c.stroke(green.path);
    c.strokeStyle = '#76ae4c';
    c.lineWidth = 6;
    c.stroke(green.path);
    c.fillStyle = themedTile(Tile.GREEN, S.theme).c1;
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

  // 7) pathways — connected gravel vs. disconnected mud
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

  // 8) flower tiles — lush bed: dark foliage patch, stems, leaves, petal rosettes
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

  // 9) land you don't own yet: dimmed, with parcel boundaries
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

  // Elevation-only edits (raise/lower) don't change any tile type or ownership, so the
  // expensive whole-map blob-shape ortho repaint can be skipped — just re-composite the
  // (unchanged) ortho pixels onto the new sloped iso quads below.
  if (caches.orthoDirty) {
    drawOrtho();
    caches.orthoDirty = false;
  }
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

function drawBridge(ctx: CanvasRenderingContext2D, x: number, y: number, u: number) {
  type WorldPoint = { x: number; y: number };
  type Rail = [WorldPoint, WorldPoint];
  const connections = bridgeConnectionsAt(S.tiles, x, y);
  const h = BRIDGE_HALF_WIDTH;
  const cx = x + 0.5;
  const cy = y + 0.5;
  const rect = (x0: number, y0: number, x1: number, y1: number): WorldPoint[] => [
    { x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 },
  ];
  const decks = [rect(cx - h, cy - h, cx + h, cy + h)];
  if (connections.west) decks.push(rect(x, cy - h, cx, cy + h));
  if (connections.east) decks.push(rect(cx, cy - h, x + 1, cy + h));
  if (connections.north) decks.push(rect(cx - h, y, cx + h, cy));
  if (connections.south) decks.push(rect(cx - h, cy, cx + h, y + 1));
  const lift = 2.2 * u;
  const project = (point: WorldPoint) => {
    const screen = PE(point.x, point.y);
    return { x: screen.x, y: screen.y - lift };
  };
  const polygon = (points: { x: number; y: number }[]) => {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
  };

  ctx.save();
  ctx.lineCap = 'square';
  ctx.lineJoin = 'round';
  for (const deck of decks) {
    polygon(deck.map(project).map((point) => ({ x: point.x, y: point.y + 3.2 * u })));
    ctx.fillStyle = '#4b3120';
    ctx.fill();
  }
  for (const deck of decks) {
    polygon(deck.map(project));
    ctx.fillStyle = '#a86d3e';
    ctx.fill();
  }

  const plank = (a: WorldPoint, b: WorldPoint) => {
    const pa = project(a);
    const pb = project(b);
    ctx.strokeStyle = 'rgba(69,38,21,.72)';
    ctx.lineWidth = Math.max(0.8, 0.9 * u);
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  };
  if (connections.west) for (const step of [0.08, 0.2, 0.34]) plank({ x: x + step, y: cy - h }, { x: x + step, y: cy + h });
  if (connections.east) for (const step of [0.66, 0.8, 0.92]) plank({ x: x + step, y: cy - h }, { x: x + step, y: cy + h });
  if (connections.north) for (const step of [0.08, 0.2, 0.34]) plank({ x: cx - h, y: y + step }, { x: cx + h, y: y + step });
  if (connections.south) for (const step of [0.66, 0.8, 0.92]) plank({ x: cx - h, y: y + step }, { x: cx + h, y: y + step });
  if (connections.west || connections.east) plank({ x: cx, y: cy - h }, { x: cx, y: cy + h });
  if (connections.north || connections.south) plank({ x: cx - h, y: cy }, { x: cx + h, y: cy });

  const railSides: Rail[] = [];
  if (connections.west) railSides.push([{ x, y: cy - h }, { x: cx - h, y: cy - h }], [{ x, y: cy + h }, { x: cx - h, y: cy + h }]);
  if (connections.east) railSides.push([{ x: cx + h, y: cy - h }, { x: x + 1, y: cy - h }], [{ x: cx + h, y: cy + h }, { x: x + 1, y: cy + h }]);
  if (connections.north) railSides.push([{ x: cx - h, y }, { x: cx - h, y: cy - h }], [{ x: cx + h, y }, { x: cx + h, y: cy - h }]);
  if (connections.south) railSides.push([{ x: cx - h, y: cy + h }, { x: cx - h, y: y + 1 }], [{ x: cx + h, y: cy + h }, { x: cx + h, y: y + 1 }]);
  if (!connections.north) railSides.push([{ x: cx - h, y: cy - h }, { x: cx + h, y: cy - h }]);
  if (!connections.south) railSides.push([{ x: cx - h, y: cy + h }, { x: cx + h, y: cy + h }]);
  if (!connections.west) railSides.push([{ x: cx - h, y: cy - h }, { x: cx - h, y: cy + h }]);
  if (!connections.east) railSides.push([{ x: cx + h, y: cy - h }, { x: cx + h, y: cy + h }]);
  const railHeight = 6.8 * u;
  for (const [start, end] of railSides) {
    const a = project(start);
    const b = project(end);
    ctx.strokeStyle = '#51331f';
    ctx.lineWidth = Math.max(1, 1.4 * u);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    for (const width of [Math.max(2, 2.5 * u), Math.max(0.9, 1.15 * u)]) {
      ctx.strokeStyle = width > 1.5 * u ? '#3a271b' : '#d29a58';
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y - railHeight);
      ctx.lineTo(b.x, b.y - railHeight);
      ctx.stroke();
    }
    for (const t of [0, 0.5, 1]) {
      const wx = start.x + (end.x - start.x) * t;
      const wy = start.y + (end.y - start.y) * t;
      const p = project({ x: wx, y: wy });
      ctx.strokeStyle = '#3a271b';
      ctx.lineWidth = Math.max(2, 2.5 * u);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y + 1.2 * u);
      ctx.lineTo(p.x, p.y - railHeight - 0.8 * u);
      ctx.stroke();
      ctx.strokeStyle = '#c4894c';
      ctx.lineWidth = Math.max(0.9, 1.1 * u);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/* ================= main draw ================= */
function drawWeather(ctx: CanvasRenderingContext2D, cssW: number, cssH: number) {
  if (S.mode !== 'play' || S.weather.condition === 'clear') return;
  const { intensity, wetness } = S.weather;
  ctx.save();
  ctx.fillStyle = `rgba(17,34,45,${(0.045 + wetness * 0.075).toFixed(3)})`;
  ctx.fillRect(0, 0, cssW, cssH);
  if (intensity > 0.01) {
    const count = Math.min(150, Math.max(18, Math.round((cssW * cssH) / 12500 * intensity)));
    const spanX = cssW + 180;
    const spanY = cssH + 120;
    const drift = S.time * (55 + S.wind.speed * 150) * S.wind.dx;
    const fall = S.time * (360 + intensity * 260);
    const slant = 9 + S.wind.dx * (15 + S.wind.speed * 24);
    ctx.strokeStyle = `rgba(210,235,244,${(0.16 + intensity * 0.26).toFixed(3)})`;
    ctx.lineWidth = Math.max(0.75, 0.8 + intensity * 0.65);
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const rawX = hash2(i * 19 + 7, 31) * spanX + drift;
      const rawY = hash2(i * 29 + 13, 47) * spanY + fall;
      const x = ((rawX % spanX) + spanX) % spanX - 90;
      const y = ((rawY % spanY) + spanY) % spanY - 60;
      const length = 8 + hash2(i * 11 + 3, 71) * (12 + intensity * 14);
      ctx.moveTo(x, y);
      ctx.lineTo(x + slant, y + length);
    }
    ctx.stroke();
  }
  ctx.restore();
}

export function draw(ctx: CanvasRenderingContext2D, cssW: number, cssH: number) {
  const z = S.cam.z;
  const u = z;
  ctx.save();
  if (S.camShake > 0.05) ctx.translate((Math.random() * 2 - 1) * S.camShake, (Math.random() * 2 - 1) * S.camShake);
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
      if (!S.owned[py * PW + px] && S.specialVisitors.landOffer?.parcelIndices.includes(py * PW + px)) {
        const sx = px * PARCEL_W + PARCEL_W / 2;
        const sy = py * PARCEL_H + PARCEL_H / 2;
        D.push({ z: dep(sx, sy), f: () => drawForSale(ctx, sx, sy, u) });
      }
  const tidyStaff = countEmp('groundskeeper') + countEmp('turftech');
  const visiblePatches = Math.max(3, caches.naturePatches.length - tidyStaff * 6);
  for (const patch of caches.naturePatches.slice(0, visiblePatches)) D.push({ z: dep(patch.x, patch.y) - 0.04, f: () => drawNaturePatch(ctx, patch, u) });
  const wildlifeManaged = countEmp('ranger') + countEmp('marshall') > 0;
  for (const animal of caches.wildlife) {
    const pose = wildlifePose(animal, wildlifeManaged);
    D.push({ z: dep(pose.x, pose.y) + 0.03, f: () => drawWildlife(ctx, animal.kind, pose, u) });
  }
  let staffIndex = 0;
  for (const employee of S.employees) {
    const staffKind = employee.kind;
    if (staffKind !== 'ranger' && staffKind !== 'groundskeeper' && staffKind !== 'turftech') continue;
    const pose = courseStaffPose(employee.id, staffKind, staffIndex++);
    D.push({ z: dep(pose.x, pose.y) + 0.05, f: () => drawCourseStaff(ctx, staffKind, pose, u) });
  }
  for (const tr of caches.trees) D.push({ z: dep(tr.x, tr.y), f: () => drawTree(ctx, tr, u) });
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (S.tiles[idx(x, y)] === Tile.BRIDGE_WATER || S.tiles[idx(x, y)] === Tile.BRIDGE_STREAM)
        D.push({ z: dep(x + 0.5, y + 0.5) - 0.08, f: () => drawBridge(ctx, x, y, u) });
  S.holes.forEach((h, i) => {
    D.push({ z: dep(h.cup.x, h.cup.y), f: () => drawFlag(ctx, h, i + 1, u) });
    D.push({ z: dep(h.tee.x, h.tee.y) - 0.01, f: () => drawTeeSign(ctx, h, i + 1, u) });
  });
  const bDep = (x: number, y: number, w: number, h: number) =>
    Math.max(dep(x, y), dep(x + w, y), dep(x, y + h), dep(x + w, y + h)) - 0.4;
  D.push({ z: bDep(Math.floor(CH.x) - 1, Math.floor(CH.y) - 1, 2, 2), f: () => drawClubhouse(ctx, u) });
  for (const b of S.buildings) D.push({ z: bDep(b.x, b.y, b.w, b.h), f: () => drawBuilding(ctx, b, u) });
  for (const activity of S.facilityActivities) {
    if (activity.kind !== 'marina-boat') continue;
    const facility = S.buildings.find((building) => building.id === activity.facilityId);
    if (!facility) continue;
    const pose = facilityActivityPose(activity, facility);
    D.push({ z: bDep(facility.x, facility.y, facility.w, facility.h) + 0.08, f: () => drawFacilityBoat(ctx, pose, u) });
  }
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

  // Aircraft remain above the world painter's order while approaching; their
  // ground shadow still tracks the rolling terrain below.
  for (const activity of S.facilityActivities) {
    if (activity.kind === 'marina-boat') continue;
    const facility = S.buildings.find((building) => building.id === activity.facilityId);
    if (facility) drawFacilityPlane(ctx, facilityActivityPose(activity, facility), u);
  }

  // Weather sits over the course but below aiming and feedback, keeping the shot
  // guide crisp while the scene still reads as wet and windswept.
  drawWeather(ctx, cssW, cssH);
  drawAim(ctx, u);
  drawParticles(ctx, u);
  drawFloaters(ctx, u);

  const vignette = ctx.createRadialGradient(cssW / 2, cssH * 0.46, Math.min(cssW, cssH) * 0.22, cssW / 2, cssH / 2, Math.max(cssW, cssH) * 0.72);
  vignette.addColorStop(0, 'rgba(7,20,20,0)');
  vignette.addColorStop(0.72, 'rgba(7,20,20,.025)');
  vignette.addColorStop(1, 'rgba(4,12,15,.16)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, cssW, cssH);

  const tint = dayNightTint(S.time);
  if (tint) {
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, cssW, cssH);
  }
  ctx.restore();
}

/**
 * A full day is DAY_CYCLE seconds of play. `darkness` is a smooth cosine curve:
 * 0 at noon (t=.25), 1 at midnight (t=.75), .5 at dawn/dusk (t=0/.5) — no branch
 * seams. Returns a translucent wash color, or null in broad daylight (cheap: skips
 * the fillRect entirely near noon).
 */
const DAY_CYCLE = 480;
function dayNightTint(time: number): string | null {
  const t = (time % DAY_CYCLE) / DAY_CYCLE;
  const darkness = (1 - Math.cos(2 * Math.PI * (t - 0.25))) / 2;
  if (darkness < 0.12) return null;
  if (darkness < 0.55) {
    const a = ((darkness - 0.12) / 0.43) * 0.16;
    return `rgba(255,150,95,${a.toFixed(3)})`; // dawn/dusk warm wash
  }
  const a = 0.1 + ((darkness - 0.55) / 0.45) * 0.24;
  return `rgba(14,20,58,${a.toFixed(3)})`; // night blue wash
}

function poseScreenAngle(pose: FacilityActivityPose): number {
  const a = P(pose.x, pose.y);
  const b = P(pose.x + pose.heading.x, pose.y + pose.heading.y);
  return Math.atan2(b.y - a.y, b.x - a.x);
}

function drawFacilityPlane(ctx: CanvasRenderingContext2D, pose: FacilityActivityPose, u: number) {
  const ground = PE(pose.x, pose.y);
  const altitude = pose.altitude * u;
  const angle = poseScreenAngle(pose);
  const k = clamp(u, 0.62, 1.55) * pose.scale * 0.92;
  const shadowScale = clamp(1 - pose.altitude / 125, 0.3, 0.9);

  ctx.save();
  ctx.translate(ground.x + altitude * 0.08, ground.y + altitude * 0.08);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(7,22,22,' + (0.08 + shadowScale * 0.18).toFixed(3) + ')';
  ctx.beginPath();
  ctx.ellipse(1.5 * k, 0, 18 * k * shadowScale, 6.2 * k * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(ground.x, ground.y - altitude);
  ctx.rotate(angle);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(facilityPlaneSprite(), -22 * k, -20 * k, 44 * k, 40 * k);
  ctx.restore();
  ctx.imageSmoothingEnabled = true;
}

function drawFacilityBoat(ctx: CanvasRenderingContext2D, pose: FacilityActivityPose, u: number) {
  const p = PE(pose.x, pose.y);
  const angle = poseScreenAngle(pose);
  const k = clamp(u, 0.62, 1.32) * pose.scale * 0.88;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);
  ctx.strokeStyle = 'rgba(215,245,244,.42)';
  ctx.lineWidth = 1.2;
  for (const oy of [-3, 3]) {
    ctx.beginPath();
    ctx.moveTo(-8 * k, oy * k * 0.35);
    ctx.quadraticCurveTo(-16 * k, oy * k, -24 * k, oy * k * 1.2);
    ctx.stroke();
  }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(facilityBoatSprite(), -17 * k, -8 * k, 34 * k, 16 * k);
  ctx.restore();
  ctx.imageSmoothingEnabled = true;
}

type WildlifeCache = (typeof caches.wildlife)[number];
type NaturePose = { x: number; y: number; altitude: number; bob: number; face: number };

function wildlifePose(animal: WildlifeCache, managed: boolean): NaturePose {
  if (animal.kind === 'bird') {
    const dir = animal.s > 0.5 ? 1 : -1;
    const rawX = animal.x + dir * S.time * (0.38 + animal.s * 0.22);
    const x = ((rawX % W) + W) % W;
    return { x, y: clamp(animal.y + Math.sin(S.time * 0.27 + animal.s * 20) * 2.4, 1, H - 1), altitude: 24 + animal.s * 15, bob: 0, face: dir };
  }
  const radius = animal.kind === 'duck' ? 0.16 : animal.kind === 'squirrel' ? 0.22 : managed ? 0.28 : animal.kind === 'deer' ? 0.68 : 0.52;
  const speed = animal.kind === 'deer' ? 0.22 : animal.kind === 'rabbit' ? 0.48 : animal.kind === 'squirrel' ? 0.65 : 0.3;
  const phase = S.time * speed + animal.s * 31;
  return {
    x: animal.x + Math.cos(phase) * radius,
    y: animal.y + Math.sin(phase * 0.83) * radius * 0.65,
    altitude: 0,
    bob: animal.kind === 'rabbit' ? Math.max(0, Math.sin(phase * 4.5)) * 2.5 : animal.kind === 'squirrel' ? Math.max(0, Math.sin(phase * 6)) * 1.8 : 0,
    face: Math.sin(phase) >= 0 ? 1 : -1,
  };
}

function drawNaturePatch(ctx: CanvasRenderingContext2D, patch: (typeof caches.naturePatches)[number], u: number) {
  const p = PE(patch.x, patch.y);
  const k = clamp(u, 0.6, 1.8);
  if (patch.kind === 'divot') {
    ctx.fillStyle = 'rgba(80,57,31,.64)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 4.2 * k, 1.8 * k, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#668d3f';
    ctx.beginPath();
    ctx.ellipse(p.x + 2.4 * k, p.y - 1.2 * k, 3 * k, 1.2 * k, -0.2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.strokeStyle = '#3b7136';
  ctx.lineWidth = Math.max(0.7, 0.8 * k);
  for (let i = 0; i < 4; i++) {
    const ox = (i - 1.5) * 2.2 * k;
    const oy = Math.sin(i * 2.4 + patch.s * 10) * 1.3 * k;
    ctx.beginPath();
    ctx.moveTo(p.x + ox, p.y + oy);
    ctx.lineTo(p.x + ox - 0.8 * k, p.y + oy - (3.5 + (i & 1)) * k);
    ctx.stroke();
    ctx.fillStyle = i & 1 ? '#f3f0d5' : '#e6cf55';
    ctx.beginPath();
    ctx.arc(p.x + ox - 0.8 * k, p.y + oy - (3.7 + (i & 1)) * k, 1.15 * k, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWildlife(ctx: CanvasRenderingContext2D, kind: WildlifeCache['kind'], pose: NaturePose, u: number) {
  const p = PE(pose.x, pose.y);
  const k = clamp(u, 0.65, 1.75);
  if (kind === 'bird') {
    const y = p.y - pose.altitude * u;
    ctx.strokeStyle = 'rgba(28,42,39,.78)';
    ctx.lineWidth = Math.max(1, 1.3 * k);
    const flap = Math.sin(S.time * 7 + pose.x) * 2.2 * k;
    ctx.beginPath();
    ctx.moveTo(p.x - 7 * k, y + flap);
    ctx.quadraticCurveTo(p.x - 3 * k, y - 2 * k, p.x, y);
    ctx.quadraticCurveTo(p.x + 3 * k, y - 2 * k, p.x + 7 * k, y - flap);
    ctx.stroke();
    return;
  }
  const y = p.y - pose.bob * k;
  ctx.fillStyle = 'rgba(17,39,26,.2)';
  ctx.beginPath();
  ctx.ellipse(p.x + 1.5 * k, p.y + 1.2 * k, (kind === 'deer' ? 7 : kind === 'squirrel' ? 3 : 4.5) * k, 2 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  if (kind === 'duck') {
    ctx.strokeStyle = 'rgba(207,241,239,.36)';
    ctx.beginPath();
    ctx.moveTo(p.x - pose.face * 10 * k, y + 1 * k);
    ctx.lineTo(p.x - pose.face * 5 * k, y);
    ctx.stroke();
  }
  const sk = k * (kind === 'deer' ? 0.88 : kind === 'rabbit' ? 0.6 : kind === 'squirrel' ? 0.42 : 0.55);
  ctx.save();
  ctx.translate(p.x, y + 2 * sk);
  ctx.scale(pose.face, 1);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(wildlifeSprite(kind), -16 * sk, -29 * sk, 32 * sk, 30 * sk);
  ctx.restore();
  ctx.imageSmoothingEnabled = true;
}

function courseStaffPose(id: number, kind: CourseStaffKind, index: number) {
  const targets = kind === 'ranger' ? caches.wildlife : caches.naturePatches;
  const target = targets.length ? targets[Math.abs(Math.floor(id + index * 7)) % targets.length] : { x: CH.x + 4, y: CH.y + 3 };
  const cycle = (S.time * (0.023 + index * 0.002) + (Math.abs(id) % 97) / 97) % 1;
  const smoothStep = (n: number) => n * n * (3 - 2 * n);
  let t = 0;
  let working = false;
  let outbound = true;
  if (cycle < 0.4) t = smoothStep(cycle / 0.4);
  else if (cycle < 0.58) {
    t = 1;
    working = true;
  } else if (cycle < 0.98) {
    t = 1 - smoothStep((cycle - 0.58) / 0.4);
    outbound = false;
  }
  const phase = S.time * (working ? 5.2 : 7.4) + index * 1.7;
  const startScreen = P(CH.x, CH.y);
  const targetScreen = P(target.x, target.y);
  const outwardFace = targetScreen.x >= startScreen.x ? 1 : -1;
  return {
    x: CH.x + (target.x - CH.x) * t,
    y: CH.y + (target.y - CH.y) * t,
    phase,
    face: outbound || working ? outwardFace : -outwardFace,
    frame: courseStaffAnimationFrame(working, phase),
    working,
  };
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
    const parcel = py * PW + px;
    const owned = S.owned[parcel] === 1;
    const offered = !!S.specialVisitors.landOffer?.parcelIndices.includes(parcel);
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
    ctx.fillStyle = owned ? 'rgba(124,194,66,.12)' : offered ? 'rgba(233,181,60,.18)' : 'rgba(75,80,92,.2)';
    ctx.fill();
    ctx.setLineDash([8 * u, 6 * u]);
    ctx.strokeStyle = owned ? 'rgba(180,220,150,.8)' : offered ? '#ffd856' : 'rgba(190,194,204,.7)';
    ctx.lineWidth = 2.5 * u;
    ctx.stroke();
    ctx.setLineDash([]);
    const c = PE(x0 + PARCEL_W / 2, y0 + PARCEL_H / 2);
    ctx.fillStyle = '#fffdf2';
    ctx.strokeStyle = 'rgba(20,40,25,.85)';
    ctx.lineWidth = 3;
    ctx.font = '800 ' + clamp(12 * u, 12, 22) + 'px sans-serif';
    ctx.textAlign = 'center';
    // clear the FOR SALE sign (spans roughly y-25u..y-13u) so the hover label never overlaps it
    const labelY = c.y - 31 * u;
    const label = owned ? 'Your land' : offered ? 'County offer · ' + fmt$(S.specialVisitors.landOffer!.price) : 'Await I.M. Picky';
    ctx.strokeText(label, c.x, labelY);
    ctx.fillText(label, c.x, labelY);
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
        ctx.strokeStyle = 'rgba(20,47,31,.82)';
        ctx.lineWidth = 3;
        ctx.font = 'bold ' + clamp(10 * u, 10, 16) + 'px sans-serif';
        ctx.textAlign = 'center';
        const level = Math.round(elevAt(x + 0.5, y + 0.5));
        const next = clamp(level + (S.tool === 'raise' ? 1 : -1), 0, MAXE);
        const label = (S.tool === 'raise' ? '▲ ' : '▼ ') + level + ' → ' + next;
        ctx.strokeText(label, c.x, c.y - 8 * u);
        ctx.fillText(label, c.x, c.y - 8 * u);
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
  const profile = treeCollisionProfile(Math.floor(tr.x), Math.floor(tr.y), S.theme);
  const p = PE(profile.center.x, profile.center.y);
  const k = profile.visualScale * u;
  ctx.fillStyle = 'rgba(5,22,17,.24)';
  ctx.beginPath();
  ctx.ellipse(p.x + 7.6 * k, p.y + 3 * u, 15.2 * k, 5.2 * k, 0.16, 0, Math.PI * 2);
  ctx.fill();
  const kind = sharedTreeKindFor(S.theme, profile.seed);
  const spr = treeSprite(kind, ((profile.seed * 97) | 0) % 3);
  const sway = Math.sin(S.time * 1.1 + profile.seed * 9) * 0.013;
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
  let dx = h.cup.x - h.tee.x;
  let dy = h.cup.y - h.tee.y;
  const len = Math.hypot(dx, dy) || 1;
  dx /= len;
  dy /= len;
  const px = -dy;
  const py = dx;

  // Two low tee blocks sit perpendicular to the line of play.
  for (const side of [-1, 1]) {
    const marker = PE(h.tee.x + px * side * 0.34 - dx * 0.08, h.tee.y + py * side * 0.34 - dy * 0.08);
    ctx.fillStyle = 'rgba(16,44,27,.28)';
    ctx.beginPath();
    ctx.ellipse(marker.x + 1.4 * u, marker.y + 1.2 * u, 3.2 * u, 1.4 * u, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = side < 0 ? '#f2eee0' : '#e1b33d';
    ctx.strokeStyle = side < 0 ? '#6c766f' : '#8d6721';
    ctx.lineWidth = Math.max(0.7, 0.8 * u);
    ctx.beginPath();
    ctx.roundRect(marker.x - 2.5 * u, marker.y - 3 * u, 5 * u, 3.5 * u, 0.8 * u);
    ctx.fill();
    ctx.stroke();
  }

  const p = PE(h.tee.x - dx * 0.62 - px * 0.7, h.tee.y - dy * 0.62 - py * 0.7);
  ctx.strokeStyle = '#6d4a2b';
  ctx.lineWidth = 1.8 * u;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x, p.y - 10 * u);
  ctx.stroke();
  ctx.fillStyle = '#243d35';
  ctx.strokeStyle = '#d0a83f';
  ctx.lineWidth = 1 * u;
  const w = 20 * u;
  const hh = 9 * u;
  ctx.beginPath();
  ctx.roundRect(p.x - w / 2, p.y - 10 * u - hh, w, hh, 2 * u);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff0b1';
  ctx.font = '800 ' + clamp(5.8 * u, 6, 10) + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(num + '  PAR ' + h.par, p.x, p.y - 10 * u - hh / 2 + 2.1 * u);
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
  drawAnchored(ctx, buildingSprite('clubhouse', 2, 2, S.rot), c.x, c.y, u);
  if (S.cam.z > 0.62) drawWorldLabel(ctx, 'CLUBHOUSE', c.x, c.y - 66 * u, u, 'gold');
}

function spriteKeyFor(b: Building): string {
  if (b.kind !== 'buildinglot') return b.kind;
  const stage = clamp(b.stage ?? 0, 0, 2);
  if (stage === 0) return 'lot0';
  const vi = Math.abs((b.id * 7919) | 0) % 5;
  return 'house' + stage + '_' + vi;
}

/** Pixel-scale additions make upgrade state legible on the course without replacing
 * each facility's identity art. Construction gets real scaffolding; Service gets cool
 * operational signage, while Prestige gets gold entrance architecture and pennants. */
function drawFacilityUpgradeArt(ctx: CanvasRenderingContext2D, b: Building, c: Pt, topY: number, u: number) {
  if (b.kind === 'buildinglot') return;
  if (b.upgrade) {
    const span = clamp((b.w + b.h) * 8 * u, 26 * u, 86 * u);
    const left = c.x - span / 2;
    const right = c.x + span / 2;
    const top = topY + 9 * u;
    const bottom = c.y + 5 * u;
    ctx.save();
    ctx.lineCap = 'square';
    ctx.strokeStyle = '#4e4538';
    ctx.lineWidth = Math.max(1, 1.8 * u);
    for (const x of [left, c.x, right]) {
      ctx.beginPath();
      ctx.moveTo(x, bottom);
      ctx.lineTo(x, top);
      ctx.stroke();
    }
    for (let t = 0.2; t < 1; t += 0.22) {
      const y = bottom + (top - bottom) * t;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
    }
    ctx.strokeStyle = '#d78a2d';
    ctx.lineWidth = Math.max(2, 3 * u);
    ctx.beginPath();
    ctx.moveTo(left, top + 7 * u);
    ctx.lineTo(right, top + 7 * u);
    ctx.stroke();
    ctx.fillStyle = '#f1b547';
    const stripeW = Math.max(3, 5 * u);
    for (let x = left; x < right; x += stripeW * 2) ctx.fillRect(x, top + 4 * u, stripeW, 5 * u);
    ctx.restore();
    return;
  }

  const level = facilityLevel(b);
  if (level <= 1 || !b.branch) return;
  const prestige = b.branch === 'prestige';
  const main = prestige ? '#d7a82f' : '#3b8494';
  const dark = prestige ? '#765616' : '#245260';
  const light = prestige ? '#ffe59a' : '#bce8e8';
  const baseY = c.y + 2 * u;
  const archW = (level === 3 ? 28 : 22) * u;
  const archH = (level === 3 ? 17 : 12) * u;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = dark;
  ctx.fillRect(c.x - archW / 2 - u, baseY - archH - u, 4 * u, archH + 2 * u);
  ctx.fillRect(c.x + archW / 2 - 3 * u, baseY - archH - u, 4 * u, archH + 2 * u);
  ctx.fillStyle = main;
  ctx.fillRect(c.x - archW / 2, baseY - archH, 3 * u, archH);
  ctx.fillRect(c.x + archW / 2 - 3 * u, baseY - archH, 3 * u, archH);
  ctx.fillStyle = dark;
  ctx.fillRect(c.x - archW / 2 - u, baseY - archH - 5 * u, archW + 2 * u, 7 * u);
  ctx.fillStyle = main;
  ctx.fillRect(c.x - archW / 2, baseY - archH - 4 * u, archW, 5 * u);
  ctx.fillStyle = light;
  const marks = level === 3 ? 3 : 2;
  for (let i = 0; i < marks; i++) ctx.fillRect(c.x - (marks * 2.5 * u) / 2 + i * 3 * u, baseY - archH - 2.8 * u, 1.7 * u, 1.7 * u);

  // Paired rooftop pennants are part of the silhouette, not a floating UI badge.
  for (const dx of [-11, 11]) {
    const px = c.x + dx * u;
    ctx.strokeStyle = dark;
    ctx.lineWidth = Math.max(1, 1.2 * u);
    ctx.beginPath();
    ctx.moveTo(px, topY + 14 * u);
    ctx.lineTo(px, topY - (level === 3 ? 9 : 4) * u);
    ctx.stroke();
    ctx.fillStyle = main;
    ctx.beginPath();
    ctx.moveTo(px, topY - (level === 3 ? 9 : 4) * u);
    ctx.lineTo(px + (prestige ? 9 : 7) * u, topY - (level === 3 ? 6 : 1) * u);
    ctx.lineTo(px, topY - (level === 3 ? 3 : -2) * u);
    ctx.closePath();
    ctx.fill();
  }
  if (level === 3) {
    ctx.fillStyle = light;
    ctx.strokeStyle = dark;
    ctx.lineWidth = Math.max(1, u);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 4;
      const r = (i & 1 ? 3.5 : 7) * u;
      const x = c.x + Math.cos(a) * r;
      const y = topY - 11 * u + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawBuilding(ctx: CanvasRenderingContext2D, b: Building, u: number) {
  const e = elevAt(b.x + 0.01, b.y + 0.01);
  const c = cornerAt(b.x + b.w / 2, b.y + b.h / 2, e, u);
  if (b.kind === 'bench' || b.kind === 'flowerbed' || b.kind === 'landmark' || b.kind === 'ballwasher' || b.kind === 'scenicbridge') {
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
  const spr = buildingSprite(key, b.w, b.h, S.rot);
  drawAnchored(ctx, spr, c.x, c.y, u);
  const topY = c.y - spr.ay * u;
  drawFacilityUpgradeArt(ctx, b, c, topY, u);
  if (S.cam.z > 0.68) {
    const level = facilityLevel(b);
    const facilityLabel = level > 1 ? `${themedDef(b.kind, S.theme).name.toUpperCase()} · L${['I', 'II', 'III'][level - 1]}` : facilityDisplayName(b, S.theme).toUpperCase();
    const label = b.kind === 'buildinglot' ? ['BUILDING…', 'COTTAGE', 'ESTATE'][clamp(b.stage ?? 0, 0, 2)] : b.upgrade ? `UPGRADING · ${Math.ceil(b.upgrade.remaining)}s` : facilityLabel;
    drawWorldLabel(ctx, label, c.x, topY - 6 * u, u, level > 1 || b.upgrade ? 'gold' : 'dark');
  }
  if (!b.open) {
    drawWorldLabel(ctx, 'NO PATH', c.x, c.y + Math.max(15, (b.w + b.h) * 2.6) * u, u, 'danger');
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
  bob: number,
  view: 'front' | 'rear' = 'front',
  identity = ''
) {
  const k = clamp(u, 0.65, 1.7) * 0.96;
  const planted = frame === 'address' || frame === 'back' || frame === 'follow' || frame === 'putt';
  ctx.fillStyle = 'rgba(5,22,17,.24)';
  ctx.beginPath();
  ctx.ellipse(x, y + 1.2 * k, (planted ? 7.4 : 6.5) * k, (planted ? 2.5 : 2.2) * k, 0.08, 0, Math.PI * 2);
  ctx.fill();
  const spr = golferSprite(shirt, skin, cap, frame, view, identity);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(x, y - bob);
  ctx.scale(face, 1);
  ctx.drawImage(
    spr,
    -(GOLFER_SPRITE_SIZE.width / 2) * k,
    -(GOLFER_SPRITE_SIZE.height - 1) * k,
    GOLFER_SPRITE_SIZE.width * k,
    GOLFER_SPRITE_SIZE.height * k,
  );
  ctx.restore();
  ctx.imageSmoothingEnabled = true;
}

function drawCourseStaff(
  ctx: CanvasRenderingContext2D,
  kind: CourseStaffKind,
  pose: { x: number; y: number; phase: number; face: number; frame: CourseStaffFrame; working: boolean },
  u: number
) {
  const p = PE(pose.x, pose.y);
  const k = clamp(u, 0.65, 1.75) * 0.82;
  const bob = pose.working ? 0 : Math.abs(Math.sin(pose.phase)) * 1.05 * u;
  const shadowWidth = kind === 'groundskeeper' ? 8.2 : 7.2;
  ctx.fillStyle = 'rgba(5,22,17,.23)';
  ctx.beginPath();
  ctx.ellipse(p.x + 2.5 * u, p.y + 1.5 * u, shadowWidth * u, 2.6 * u, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(p.x, p.y - bob);
  ctx.scale(pose.face, 1);
  ctx.drawImage(courseStaffSprite(kind, pose.frame), -15 * k, -35 * k, 30 * k, 36 * k);
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
  const view = g.facingAway ? 'rear' : 'front';
  drawGolferSprite(ctx, p.x, p.y, u, g.shirt, g.skin, g.cap, golferFrame(g), g.face ?? 1, bob, view, g.name);
  const hovered = !!S.hover && Math.floor(g.x) === S.hover.x && Math.floor(g.y) === S.hover.y;
  if ((g.specialGuest && S.cam.z > 0.58) || hovered) {
    const spriteHeight = GOLFER_SPRITE_SIZE.height * clamp(u, 0.65, 1.7) * 0.96;
    drawWorldLabel(ctx, g.name.toUpperCase(), p.x, p.y - spriteHeight - 3 * u - bob, Math.max(u * 0.88, 0.58), g.specialGuest ? 'gold' : 'dark');
  }
}

function drawAvatar(ctx: CanvasRenderingContext2D, u: number) {
  const pl = S.player!;
  const b = pl.ball!;
  const bp = PE(b.x, b.y);
  const px = bp.x - 7 * u;
  const py = bp.y - 1 * u;
  const frame: GolferFrame = pl.state === 'wait' ? 'follow' : pl.lie === 'green' ? 'putt' : 'address';
  const pro = activePlayingPro();
  drawGolferSprite(ctx, px, py, u, pro.shirt, pro.skin, pro.cap, frame, 1, 0, 'front', pro.name);
  drawWorldLabel(ctx, pro.name.toUpperCase(), px, py - GOLFER_SPRITE_SIZE.height * clamp(u, 0.65, 1.7) * 0.96, u, 'gold');
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

type AimForecast = NonNullable<ReturnType<typeof currentPlayerShotForecast>>;

function aimFlightPoint(path: AimForecast['path'], t: number, u: number): Vec {
  const position = ballFlightPosition(path, t);
  const ground = PE(position.x, position.y);
  return { x: ground.x, y: ground.y - Math.sin(Math.PI * clamp(t, 0, 1)) * path.h * u };
}

function traceAimFlight(ctx: CanvasRenderingContext2D, path: AimForecast['path'], fromT: number, toT: number, u: number) {
  if (toT <= fromT + 0.0001) return false;
  const steps = Math.max(1, Math.ceil((toT - fromT) * 20));
  const first = aimFlightPoint(path, fromT, u);
  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  for (let step = 1; step <= steps; step++) {
    const t = fromT + (toT - fromT) * (step / steps);
    const point = aimFlightPoint(path, t, u);
    ctx.lineTo(point.x, point.y);
  }
  return true;
}

function drawCanopyWarning(ctx: CanvasRenderingContext2D, forecast: AimForecast, u: number) {
  const impact = forecast.canopyImpact;
  if (!impact) return;
  const point = aimFlightPoint(forecast.path, impact.t, u);
  const scale = clamp(u, 0.72, 1.35);
  const label = impact.kind === 'trunk' ? 'TREE RISK' : 'CANOPY RISK';

  // The ideal line's deterministic drop is useful tactical information, but it is
  // kept faint because shot dispersion may still carry the real ball around the tree.
  if (forecast.restingPoint) {
    const rest = PE(forecast.restingPoint.x, forecast.restingPoint.y);
    ctx.save();
    ctx.setLineDash([2 * scale, 3 * scale]);
    ctx.strokeStyle = 'rgba(230,174,77,.56)';
    ctx.lineWidth = Math.max(1, scale);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.lineTo(rest.x, rest.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(216,81,56,.7)';
    ctx.strokeStyle = '#ffe08a';
    ctx.beginPath();
    ctx.arc(rest.x, rest.y, 3.2 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#d85138';
  ctx.strokeStyle = '#ffe08a';
  ctx.lineWidth = Math.max(1, 1.2 * scale);
  ctx.fillRect(-3.8 * scale, -3.8 * scale, 7.6 * scale, 7.6 * scale);
  ctx.strokeRect(-3.8 * scale, -3.8 * scale, 7.6 * scale, 7.6 * scale);
  ctx.restore();

  ctx.save();
  ctx.font = `900 ${Math.max(8, Math.round(8 * scale))}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const labelWidth = Math.ceil(ctx.measureText(label).width + 8 * scale);
  const labelHeight = Math.max(12, Math.ceil(13 * scale));
  const labelX = clamp(point.x + 7 * scale, 4, Math.max(4, S.view.w - labelWidth - 4));
  const labelY = clamp(point.y - labelHeight - 5 * scale, 4, Math.max(4, S.view.h - labelHeight - 4));
  ctx.fillStyle = 'rgba(42,31,22,.92)';
  ctx.fillRect(labelX, labelY, labelWidth, labelHeight);
  ctx.strokeStyle = '#e6ae4d';
  ctx.lineWidth = Math.max(1, scale);
  ctx.strokeRect(labelX + 0.5, labelY + 0.5, labelWidth - 1, labelHeight - 1);
  ctx.fillStyle = '#fff0b5';
  ctx.fillText(label, labelX + 4 * scale, labelY + labelHeight / 2 + 0.4 * scale);
  ctx.restore();
}

function drawAim(ctx: CanvasRenderingContext2D, u: number) {
  const p = S.player;
  if (!p || p.state !== 'aim' || !p.aim || !p.aim.on) return;
  const aim = playerAimIntent(p.aim, p.lie);
  if (!aim) return;
  const { power } = aim;
  const forecast = currentPlayerShotForecast(aim);
  if (!forecast) return;
  const { plan, path, canopyImpact } = forecast;
  const bp = PE(p.ball!.x, p.ball!.y);

  ctx.save();
  if (canopyImpact) {
    const warningStart = Math.max(0, canopyImpact.t - Math.min(0.16, Math.max(0.06, canopyImpact.t * 0.4)));
    ctx.setLineDash([5 * u, 5 * u]);
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 2 * u;
    if (traceAimFlight(ctx, path, 0, warningStart, u)) ctx.stroke();

    // The ideal line's threatened segment glows amber around a red dashed core and
    // stops at its first contact. The dim landing ellipse below preserves dispersion
    // context: the real shot can still miss around either side of this centerline risk.
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(244,183,70,.72)';
    ctx.lineWidth = 4.2 * u;
    if (traceAimFlight(ctx, path, warningStart, canopyImpact.t, u)) ctx.stroke();
    ctx.setLineDash([2.5 * u, 3 * u]);
    ctx.strokeStyle = '#df6847';
    ctx.lineWidth = 2 * u;
    if (traceAimFlight(ctx, path, warningStart, canopyImpact.t, u)) ctx.stroke();
  } else {
    ctx.setLineDash([5 * u, 5 * u]);
    ctx.strokeStyle = 'rgba(255,255,255,.95)';
    ctx.lineWidth = 2 * u;
    if (traceAimFlight(ctx, path, 0, 1, u)) ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();

  drawCanopyWarning(ctx, forecast, u);

  const landX = plan.target.x;
  const landY = plan.target.y;
  const land = PE(landX, landY);
  const spread = playerShotDispersion(p.lie, p.club, p.shape, plan.targetDistance).previewRadius;
  ctx.save();
  ctx.setLineDash(canopyImpact ? [2.5 * u, 4 * u] : []);
  ctx.strokeStyle = canopyImpact ? 'rgba(255,220,145,.3)' : 'rgba(255,255,255,.85)';
  ctx.lineWidth = (canopyImpact ? 1.2 : 1.6) * u;
  ctx.beginPath();
  ctx.ellipse(land.x, land.y, spread * 22 * u, spread * 11 * u, 0, 0, 7);
  ctx.stroke();
  ctx.restore();

  if (!canopyImpact) {
    // The ideal obstructed line has no ground release. Clear forecasts retain the
    // usual rollout estimate after their full-strength landing ellipse.
    const rollLen = p.lie === 'green' ? 0 : playerEstimatedRoll(lieOf(landX, landY), p.shape, p.club);
    if (rollLen > 0.15) {
      const landingDistance = Math.hypot(landX - p.ball!.x, landY - p.ball!.y) || 1;
      const rollDx = (landX - p.ball!.x) / landingDistance;
      const rollDy = (landY - p.ball!.y) / landingDistance;
      const rollEnd = PE(landX + rollDx * rollLen, landY + rollDy * rollLen);
      ctx.setLineDash([3 * u, 4 * u]);
      ctx.strokeStyle = 'rgba(255,255,255,.4)';
      ctx.lineWidth = 1.3 * u;
      ctx.beginPath();
      ctx.moveTo(land.x, land.y);
      ctx.lineTo(rollEnd.x, rollEnd.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
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
