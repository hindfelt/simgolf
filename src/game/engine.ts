import { W, H, HOLE_COST, CH, TINFO, LIE, ROLL, NAMES, SHIRTS, SKINS, SAY, ELEV_COST, MAXE, PW, PH, PARCEL_W, PARCEL_H, LAND_COST, EH } from './constants';
import { Tile } from './types';
import type { Ball, Golfer, Hole, LieKey, Vec, ToolId } from './types';
import { S, caches } from './state';
import { idx, idxC, inb, tileAt, clamp, lerp, rand, pick, gauss, dist, fmt$, hash2, lieOf, elevAt, ownedAt, parcelIdx, cornerH } from './rng';
import { isoOf } from './camera';
import { sfx } from './audio';
import { ui } from '../ui/store';
import {
  CATALOG,
  CH_TILES,
  buildingTiles,
  occupiedTiles,
  canPlace,
  recomputeConnectivity,
  feeMultiplier,
  spawnMoodBonus,
  moveSpeedMul,
  amenityMood,
  passiveIncomePerSec,
} from './buildings';
import type { Building, BuildingKind, EmployeeKind } from './types';
import { EMP_CATALOG, hireCost, skilledUnlocked, addEmployee, fireOne, empWagesPerSec, empSpawnMood, empMoveSpeedMul, empMoodPerHole } from './employees';

/* ---------------- UI bridge ---------------- */
export function setHint(t: string) {
  ui.set({ hint: t });
}
function ticker(name: string, txt: string, cls?: string) {
  ui.ticker(name, txt, cls);
}
export function updateTopbar() {
  ui.set({ cash: S.cash, rep: S.rep, fee: S.fee, golfers: S.golfers.length, holes: S.holes.length });
}
function updatePlayHud() {
  const p = S.player;
  if (!p) return;
  const h = S.holes[p.holeIdx];
  if (!h) return;
  ui.set({
    playHud: {
      holeLabel: 'Hole ' + (p.holeIdx + 1) + ' of ' + S.holes.length + ' · Par ' + h.par,
      strokeLabel:
        'Stroke ' + (p.strokes + 1) + ' · ' +
        (p.lie === 'green' ? 'on the green · drag to putt' : 'lie: ' + p.lie + ' · drag back to swing'),
    },
  });
}

/* ---------------- money & feedback ---------------- */
function floater(wx: number, wy: number, txt: string, color?: string, kind?: 'txt' | 'cash' | 'bub') {
  S.floaters.push({ wx, wy, txt, color: color || '#fff', kind: kind || 'txt', age: 0, life: kind === 'bub' ? 2.6 : 1.6 });
}
function earn(n: number, wx: number, wy: number) {
  S.cash += n;
  floater(wx, wy, '+' + fmt$(n), '#ffd856', 'cash');
  sfx.coin();
  updateTopbar();
}
function spend(n: number): boolean {
  if (S.cash < n) {
    sfx.err();
    setHint('Not enough cash in the bank!');
    return false;
  }
  S.cash -= n;
  updateTopbar();
  return true;
}

/* ---------------- holes ---------------- */
function lockedTiles(): Set<string> {
  const set = new Set<string>();
  for (const h of S.holes) {
    for (const k of h.teeTiles) set.add(k);
    for (const k of h.greenTiles) set.add(k);
  }
  return set;
}
export function parFor(d: number): number {
  return d <= 11 ? 3 : d <= 21 ? 4 : 5;
}
/** Renderer needs read access to hole-locked tiles for the placement ghost. */
export function lockedTilesForRender(): Set<string> {
  return lockedTiles();
}
function computeBeauty(h: Hole) {
  let score = 0;
  let n = 0;
  for (let t = 0; t <= 1; t += 0.2) {
    const px = Math.round(lerp(h.tee.x, h.cup.x, t));
    const py = Math.round(lerp(h.tee.y, h.cup.y, t));
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        const tt = tileAt(px + dx, py + dy);
        if (tt === Tile.TREE || tt === Tile.FLOWER) score += 1;
        if (tt === Tile.WATER) score += 0.7;
        n++;
      }
  }
  h.beauty = clamp((score / n) * 4, 0, 1);
}
function recomputeAllBeauty() {
  for (const h of S.holes) computeBeauty(h);
}
function createHole(tx: number, ty: number, cx: number, cy: number, free: boolean): Hole | null {
  if (!free && !spend(HOLE_COST)) return null;
  const teeTiles: string[] = [];
  const greenTiles: string[] = [];
  for (let dy = 0; dy <= 1; dy++)
    for (let dx = 0; dx <= 1; dx++)
      if (inb(tx + dx, ty + dy)) {
        S.tiles[idx(tx + dx, ty + dy)] = Tile.TEE;
        teeTiles.push(tx + dx + ',' + (ty + dy));
      }
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++)
      if (inb(cx + dx, cy + dy) && dx * dx + dy * dy <= 4.5) {
        S.tiles[idx(cx + dx, cy + dy)] = Tile.GREEN;
        greenTiles.push(cx + dx + ',' + (cy + dy));
      }
  // tees and greens sit on level pads carved into the terrain
  forceLevel(teeTiles, Math.round(elevAt(tx + 1, ty + 1)));
  forceLevel(greenTiles, Math.round(elevAt(cx + 0.5, cy + 0.5)));
  const tee = { x: tx + 1, y: ty + 1 };
  const cup = { x: cx + 0.5, y: cy + 0.5 };
  const h: Hole = { id: Date.now() + Math.random(), tee, cup, par: parFor(dist(tee, cup)), teeTiles, greenTiles, beauty: 0 };
  computeBeauty(h);
  S.holes.push(h);
  rebuildStatics();
  return h;
}
function removeHoleAt(x: number, y: number): boolean {
  const key = x + ',' + y;
  const i = S.holes.findIndex((h) => h.teeTiles.includes(key) || h.greenTiles.includes(key));
  if (i < 0) return false;
  const h = S.holes[i];
  for (const k of h.teeTiles.concat(h.greenTiles)) {
    const [a, b] = k.split(',');
    S.tiles[idx(+a, +b)] = Tile.ROUGH;
  }
  S.holes.splice(i, 1);
  S.cash += 300;
  updateTopbar();
  floater(h.cup.x, h.cup.y, 'Hole removed · +$300', '#ffd856');
  for (const g of S.golfers) {
    if (g.holeIdx > i) g.holeIdx--;
    else if (g.holeIdx === i) sendToNextHole(g);
  }
  if (S.player && S.player.holeIdx >= i) quitRound('That hole vanished under the bulldozer.');
  rebuildStatics();
  return true;
}

/* ---------------- statics cache ---------------- */
export function rebuildStatics() {
  caches.trees = [];
  caches.waterTiles = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const t = tileAt(x, y);
      if (t === Tile.TREE) caches.trees.push({ x: x + 0.5, y: y + 0.5, s: hash2(x, y) });
      if (t === Tile.WATER) caches.waterTiles.push({ x, y });
    }
  recomputeConnectivity();
  caches.groundDirty = true;
}

/* ---------------- buildings ---------------- */
export function placeBuilding(kind: BuildingKind, tx: number, ty: number): Building | null {
  const def = CATALOG[kind];
  // center the footprint on the tapped tile
  const x = tx - ((def.w / 2) | 0);
  const y = ty - ((def.h / 2) | 0);
  if (!canPlace(kind, x, y, lockedTiles(), occupiedTiles())) {
    setHint('Can’t build there — need clear, dry, unclaimed ground.');
    sfx.err();
    return null;
  }
  if (!spend(def.cost)) return null;
  const b: Building = { id: Date.now() + Math.random(), kind, x, y, w: def.w, h: def.h, open: false };
  if (kind === 'buildinglot') {
    b.stage = 0;
    b.stageT = 0;
  }
  S.buildings.push(b);
  rebuildStatics();
  sfx.coin();
  floater(x + def.w / 2, y + def.h / 2, def.name + '!', '#fff');
  if (!b.open) setHint(def.name + ' built — connect it to the clubhouse with a pathway to open it.');
  else ticker('Pro shop', def.name + ' is open for business.', 'money');
  return b;
}
function removeBuildingAt(x: number, y: number): boolean {
  const k = x + ',' + y;
  const i = S.buildings.findIndex((b) => buildingTiles(b).includes(k));
  if (i < 0) return false;
  const b = S.buildings[i];
  S.buildings.splice(i, 1);
  const refund = Math.round(CATALOG[b.kind].cost * 0.4);
  S.cash += refund;
  updateTopbar();
  floater(b.x + b.w / 2, b.y + b.h / 2, CATALOG[b.kind].name + ' removed · +' + fmt$(refund), '#ffd856');
  rebuildStatics();
  return true;
}

/* ---------------- map generation ---------------- */
function blob(cx: number, cy: number, rx: number, ry: number, t: Tile) {
  for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++)
    for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++)
      if (inb(x, y) && ((x - cx) ** 2) / (rx * rx) + ((y - cy) ** 2) / (ry * ry) <= 1) S.tiles[idx(x, y)] = t;
}
function hill(cx: number, cy: number, rx: number, ry: number, lift: number) {
  // smooth cosine mound on the corner grid
  for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++)
    for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
      if (x < 0 || y < 0 || x > W || y > H) continue;
      const q = Math.sqrt(((x - cx) ** 2) / (rx * rx) + ((y - cy) ** 2) / (ry * ry));
      if (q < 1) S.elevC[idxC(x, y)] = clamp(S.elevC[idxC(x, y)] + Math.round(lift * (Math.cos(q * Math.PI) + 1) * 0.5), 0, MAXE);
    }
}
/** Enforce the ≤1-step slope constraint everywhere (used after bulk edits). */
function relaxTerrain() {
  let changed = true;
  let guard = 300;
  while (changed && guard-- > 0) {
    changed = false;
    for (let y = 0; y <= H; y++)
      for (let x = 0; x <= W; x++) {
        const i = idxC(x, y);
        for (const [nx, ny] of [
          [x + 1, y],
          [x, y + 1],
        ]) {
          if (nx > W || ny > H) continue;
          const ni = idxC(nx, ny);
          const d = S.elevC[i] - S.elevC[ni];
          if (d > 1) {
            S.elevC[ni] = S.elevC[i] - 1;
            changed = true;
          } else if (d < -1) {
            S.elevC[i] = S.elevC[ni] - 1;
            changed = true;
          }
        }
      }
  }
}
export function initMap() {
  S.tiles.fill(Tile.ROUGH);
  S.elevC.fill(0);
  // start owning the north-west quarter; the rest is for sale
  S.owned.fill(0);
  S.owned[0] = S.owned[1] = S.owned[PW] = S.owned[PW + 1] = 1;
  // rolling landscape across the whole map (revealed as parcels are bought)
  hill(33, 25, 8, 6.5, 3);
  hill(36, 8, 6, 5, 2);
  hill(8, 21, 5.5, 4.5, 2);
  hill(22, 30, 5, 4, 1);
  hill(52, 14, 8, 6, 3);
  hill(46, 36, 9, 7, 4);
  hill(12, 40, 6, 5, 2);
  hill(58, 42, 5, 4, 2);
  relaxTerrain();
  blob(30, 11, 3.2, 2.3, Tile.WATER);
  blob(13, 26, 2.2, 1.6, Tile.WATER);
  blob(44, 24, 4, 2.8, Tile.WATER);
  blob(24, 42, 3, 2.2, Tile.WATER);
  blob(57, 30, 2.4, 1.8, Tile.WATER);
  // ponds sit in level basins
  const waterKeys: string[] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (tileAt(x, y) === Tile.WATER) waterKeys.push(x + ',' + y);
  forceLevel(waterKeys, 0);
  for (let i = 0; i < 260; i++) {
    const x = (Math.random() * W) | 0;
    const y = (Math.random() * H) | 0;
    if (Math.hypot(x - CH.x, y - CH.y) < 4) continue;
    if (tileAt(x, y) !== Tile.ROUGH) continue;
    if (x > 5 && x < 18 && y > 4 && y < 13) continue; // keep starter corridor clear
    S.tiles[idx(x, y)] = Math.random() < 0.12 ? Tile.FLOWER : Tile.TREE;
  }
  createHole(7, 7, 15, 10, true);
  for (let t = 0; t <= 1; t += 0.06) {
    const x = Math.round(lerp(7, 15, t));
    const y = Math.round(lerp(7, 10, t));
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++)
        if (inb(x + dx, y + dy) && tileAt(x + dx, y + dy) === Tile.ROUGH && Math.abs(dx) + Math.abs(dy) < 2)
          S.tiles[idx(x + dx, y + dy)] = Tile.FAIR;
  }
  rebuildStatics();
}

/* ---------------- terraforming (corner heightfield) ---------------- */
/** Tiles already modified during the current drag stroke (raise/lower fire once per tile per stroke). */
const strokeTiles = new Set<string>();
export function beginPaintStroke() {
  strokeTiles.clear();
}
const cornersOfTile = (x: number, y: number) => [idxC(x, y), idxC(x + 1, y), idxC(x, y + 1), idxC(x + 1, y + 1)];

/** Set the given tiles' corners to height h and smooth the surroundings unconditionally. */
function forceLevel(tileKeys: string[], h: number) {
  const hh = clamp(h, 0, MAXE);
  const q: number[] = [];
  for (const k of tileKeys) {
    const [a, b] = k.split(',');
    for (const c of cornersOfTile(+a, +b)) {
      S.elevC[c] = hh;
      q.push(c);
    }
  }
  while (q.length) {
    const i = q.pop()!;
    const cy = (i / (W + 1)) | 0;
    const cx = i % (W + 1);
    const hc = S.elevC[i];
    for (const [nx, ny] of [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1],
    ])
      if (nx >= 0 && ny >= 0 && nx <= W && ny <= H) {
        const ni = idxC(nx, ny);
        if (Math.abs(hc - S.elevC[ni]) > 1) {
          S.elevC[ni] = hc > S.elevC[ni] ? hc - 1 : hc + 1;
          q.push(ni);
        }
      }
  }
  caches.groundDirty = true;
}

/** Corners that terraforming must not move (unless explicitly excluded). */
function cornerPins(exclude?: Set<number>): Set<number> {
  const pins = new Set<number>();
  const pinTile = (x: number, y: number) => {
    for (const c of cornersOfTile(x, y)) pins.add(c);
  };
  for (const b of S.buildings) for (let dy = 0; dy < b.h; dy++) for (let dx = 0; dx < b.w; dx++) pinTile(b.x + dx, b.y + dy);
  for (const [cx, cy] of CH_TILES) pinTile(cx, cy);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (S.tiles[idx(x, y)] === Tile.WATER) pinTile(x, y);
  for (const h of S.holes)
    for (const k of h.teeTiles.concat(h.greenTiles)) {
      const [a, b] = k.split(',');
      pinTile(+a, +b);
    }
  if (exclude) for (const c of exclude) pins.delete(c);
  return pins;
}

/**
 * Plan a height change: seed corners get their target, then the ≤1-step
 * slope constraint ripples outward. Returns the full change set, or null
 * if it would disturb a pinned corner (building, water, another hole).
 */
function planTerraform(seeds: Map<number, number>, pins: Set<number>): Map<number, number> | null {
  const pend = new Map<number, number>();
  const get = (i: number) => (pend.has(i) ? pend.get(i)! : S.elevC[i]);
  const q: number[] = [];
  for (const [i, t] of seeds) {
    if (t === S.elevC[i]) continue;
    if (pins.has(i)) return null;
    pend.set(i, t);
    q.push(i);
  }
  while (q.length) {
    const i = q.pop()!;
    const cy = (i / (W + 1)) | 0;
    const cx = i % (W + 1);
    const h = get(i);
    for (const [nx, ny] of [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1],
    ]) {
      if (nx < 0 || ny < 0 || nx > W || ny > H) continue;
      const ni = idxC(nx, ny);
      const nh = get(ni);
      if (Math.abs(h - nh) <= 1) continue;
      if (pins.has(ni)) return null;
      pend.set(ni, h > nh ? h - 1 : h + 1);
      q.push(ni);
    }
  }
  for (const [i, v] of pend) if (v === S.elevC[i]) pend.delete(i);
  return pend;
}

function featureTilesAt(x: number, y: number): string[] | null {
  const k = x + ',' + y;
  for (const h of S.holes) {
    if (h.teeTiles.includes(k)) return h.teeTiles;
    if (h.greenTiles.includes(k)) return h.greenTiles;
  }
  return null;
}

function terraform(x: number, y: number, dir: 1 | -1): void {
  const k = x + ',' + y;
  if (strokeTiles.has(k)) return;
  if (tileAt(x, y) === Tile.WATER) {
    setHint('Water finds its own level — drain it with the bulldozer first.');
    return;
  }
  if (occupiedTiles().has(k)) {
    setHint('A building sits there. Bulldoze it first.');
    return;
  }

  // tees & greens move as one level slab
  const feat = featureTilesAt(x, y);
  const seedCorners = new Set<number>();
  const tiles = feat ?? [k];
  for (const tk of tiles) {
    const [a, b] = tk.split(',');
    for (const c of cornersOfTile(+a, +b)) seedCorners.add(c);
  }
  let lo = MAXE;
  let hi = 0;
  for (const c of seedCorners) {
    lo = Math.min(lo, S.elevC[c]);
    hi = Math.max(hi, S.elevC[c]);
  }
  const target = clamp(dir > 0 ? lo + 1 : hi - 1, 0, MAXE);
  const seeds = new Map<number, number>();
  for (const c of seedCorners) {
    const cur = S.elevC[c];
    const t = dir > 0 ? Math.max(cur, target) : Math.min(cur, target);
    if (t !== cur) seeds.set(c, t);
  }
  if (!seeds.size) return;

  const plan = planTerraform(seeds, cornerPins(feat ? seedCorners : undefined));
  if (!plan) {
    setHint('No room — a building, pond or another hole is holding that slope in place.');
    sfx.err();
    return;
  }
  if (!plan.size) return;
  const cost = plan.size * ELEV_COST;
  if (!spend(cost)) return;
  for (const [i, v] of plan) S.elevC[i] = v;
  for (const tk of tiles) strokeTiles.add(tk);
  if (feat) floater(x + 0.5, y + 0.5, (dir > 0 ? 'Raised' : 'Lowered') + ' the ' + (S.tiles[idx(x, y)] === Tile.TEE ? 'tee' : 'green') + '!', '#fff');
  caches.groundDirty = true;
}
export function paintAt(wx: number, wy: number) {
  const x = Math.floor(wx);
  const y = Math.floor(wy);
  if (!inb(x, y)) return;
  const tool = S.tool;
  const cur = tileAt(x, y);
  if (!ownedAt(x, y)) {
    setHint('You don’t own that land yet — 🗺️ Buy land to expand.');
    return;
  }
  if (tool === 'raise' || tool === 'lower') {
    terraform(x, y, tool === 'raise' ? 1 : -1);
    return;
  }
  if (tool === 'dozer') {
    const k = x + ',' + y;
    if (occupiedTiles().has(k)) {
      removeBuildingAt(x, y);
      return;
    }
    if (lockedTiles().has(k)) {
      // a green tile (not under the flag) shrinks tile by tile; tees and the cup remove the hole
      const h = S.holes.find((hh) => hh.greenTiles.includes(k));
      if (h && !(Math.floor(h.cup.x) === x && Math.floor(h.cup.y) === y)) {
        if (h.greenTiles.length <= 3) {
          setHint('That green is as small as it gets — bulldoze the flag to remove the hole.');
          return;
        }
        if (!spend(10)) return;
        h.greenTiles = h.greenTiles.filter((t2) => t2 !== k);
        S.tiles[idx(x, y)] = Tile.ROUGH;
        rebuildStatics();
        recomputeAllBeauty();
        return;
      }
      removeHoleAt(x, y);
      return;
    }
    if (cur === Tile.ROUGH) return;
    if (!spend(TINFO[Tile.ROUGH].cost + 10)) return;
    S.tiles[idx(x, y)] = Tile.ROUGH;
    rebuildStatics();
    recomputeAllBeauty();
    return;
  }
  if (tool === 'green') {
    // extend the green of the nearest flag
    if (cur === Tile.GREEN) return;
    const k = x + ',' + y;
    if (lockedTiles().has(k) || occupiedTiles().has(k)) {
      setHint('Something is in the way there.');
      return;
    }
    let best: Hole | null = null;
    let bd = 7.5;
    for (const h of S.holes) {
      const d = Math.hypot(h.cup.x - (x + 0.5), h.cup.y - (y + 0.5));
      if (d < bd) {
        bd = d;
        best = h;
      }
    }
    if (!best) {
      setHint('Paint green near an existing flag to grow that green.');
      return;
    }
    if (!spend(TINFO[Tile.GREEN].cost)) return;
    S.tiles[idx(x, y)] = Tile.GREEN;
    best.greenTiles.push(k);
    forceLevel([k], cornerH(Math.floor(best.cup.x), Math.floor(best.cup.y))); // greens stay one level pad
    rebuildStatics();
    recomputeAllBeauty();
    return;
  }
  const map: Partial<Record<ToolId, Tile>> = { fair: Tile.FAIR, sand: Tile.SAND, water: Tile.WATER, tree: Tile.TREE, flower: Tile.FLOWER, path: Tile.PATH };
  const t = map[tool];
  if (t === undefined) return;
  if (cur === t) return;
  if (lockedTiles().has(x + ',' + y)) {
    setHint('That tile belongs to a hole. Bulldoze the hole to reclaim it.');
    return;
  }
  if (occupiedTiles().has(x + ',' + y)) {
    setHint('A building sits there. Bulldoze it first.');
    return;
  }
  if (!spend(TINFO[t].cost)) return;
  S.tiles[idx(x, y)] = t;
  if (t === Tile.WATER) forceLevel([x + ',' + y], Math.floor(elevAt(x + 0.5, y + 0.5))); // water digs itself a level basin
  rebuildStatics();
  recomputeAllBeauty();
}

/* ---------------- land purchase ---------------- */
export function buyLandTap(wx: number, wy: number) {
  const x = Math.floor(wx);
  const y = Math.floor(wy);
  if (!inb(x, y)) return;
  if (ownedAt(x, y)) {
    setHint('You already own this parcel. Tap land marked FOR SALE.');
    return;
  }
  if (!spend(LAND_COST)) return;
  S.owned[parcelIdx(x, y)] = 1;
  caches.groundDirty = true;
  sfx.tada();
  const px = Math.floor(x / PARCEL_W) * PARCEL_W + PARCEL_W / 2;
  const py = Math.floor(y / PARCEL_H) * PARCEL_H + PARCEL_H / 2;
  floater(px, py, 'New land!', '#ffd856');
  ticker('Realtor', 'You bought a new parcel — ' + fmt$(LAND_COST) + '. Room to grow!', 'money');
  setHint('New land acquired. Sculpt it, plant it, build on it.');
}
export function holeToolTap(wx: number, wy: number) {
  const x = Math.floor(wx);
  const y = Math.floor(wy);
  if (!inb(x, y)) return;
  if (!S.holeDraft) {
    const k = x + ',' + y;
    // tapping an existing green moves that hole's flag there
    const gh = S.holes.find((h) => h.greenTiles.includes(k));
    if (gh) {
      if (Math.floor(gh.cup.x) === x && Math.floor(gh.cup.y) === y) {
        setHint('The flag is already there — tap another spot on this green to move it.');
        return;
      }
      gh.cup = { x: x + 0.5, y: y + 0.5 };
      gh.par = parFor(dist(gh.tee, gh.cup));
      computeBeauty(gh);
      sfx.putt();
      floater(gh.cup.x, gh.cup.y, 'Flag moved · Par ' + gh.par, '#fff');
      setHint('Flag repositioned. Paint more green (⛳ Green tool) to reshape it.');
      return;
    }
    if (!ownedAt(x, y)) {
      setHint('Buy this land first (🗺️ Buy land).');
      sfx.err();
      return;
    }
    if (tileAt(x, y) === Tile.WATER || lockedTiles().has(k)) {
      setHint('Can’t put a tee there.');
      sfx.err();
      return;
    }
    S.holeDraft = { tee: { x, y } };
    setHint('Now tap where the FLAG should go (at least 6 tiles away).');
    return;
  }
  const d = Math.hypot(x - S.holeDraft.tee.x, y - S.holeDraft.tee.y);
  if (d < 6) {
    setHint('Too close! Flag must be at least 6 tiles from the tee.');
    sfx.err();
    return;
  }
  if (!ownedAt(x, y)) {
    setHint('The flag needs to be on land you own.');
    sfx.err();
    return;
  }
  if (tileAt(x, y) === Tile.WATER || lockedTiles().has(x + ',' + y)) {
    setHint('The flag needs dry, unclaimed land.');
    sfx.err();
    return;
  }
  const h = createHole(S.holeDraft.tee.x - 1, S.holeDraft.tee.y - 1, x, y, false);
  S.holeDraft = null;
  if (h) {
    sfx.tada();
    floater(h.cup.x, h.cup.y, 'Hole ' + S.holes.length + ' · Par ' + h.par + '!', '#fff');
    setHint('Hole ' + S.holes.length + ' open for play! Paint some fairway between tee and green.');
    ticker('Pro shop', 'Hole ' + S.holes.length + ' (par ' + h.par + ') is now on the card.', 'money');
  }
}

/* ---------------- shots: shared physics ---------------- */
function aimShot(from: Vec, target: Vec, lie: LieKey, skill: number, angScale: number) {
  const L = LIE[lie] || LIE.rough;
  const minD = lie === 'green' ? 0.15 : 0.6; // putts can be tap-ins
  const remaining = dist(from, target);
  const intend = Math.min(L.max * (0.9 + skill * 0.15), remaining);
  let ang = Math.atan2(target.y - from.y, target.x - from.x);
  ang += gauss() * L.ang * (Math.PI / 180) * (1.35 - skill) * (angScale || 1);
  let d = Math.max(minD, intend * (1 + gauss() * (L.dst + (1 - skill) * 0.05)));
  // uphill shots land short, downhill shots carry long
  const lx = clamp(from.x + Math.cos(ang) * d, 0.6, W - 0.6);
  const ly = clamp(from.y + Math.sin(ang) * d, 0.6, H - 0.6);
  d = Math.max(minD, d - (elevAt(lx, ly) - elevAt(from.x, from.y)) * 0.35);
  return { x: clamp(from.x + Math.cos(ang) * d, 0.6, W - 0.6), y: clamp(from.y + Math.sin(ang) * d, 0.6, H - 0.6), power: d };
}
type BallSpec = Pick<Ball, 'kind' | 'owner' | 'cup' | 'fx' | 'fy' | 'tx' | 'ty' | 'events' | 'holed'>;
function startBall(spec: BallSpec) {
  const d = dist({ x: spec.fx, y: spec.fy }, { x: spec.tx, y: spec.ty });
  const ball: Ball = {
    ...spec,
    t: 0,
    dur: spec.kind === 'fly' ? 0.45 + d * 0.055 : 0.25 + d * 0.1,
    h: spec.kind === 'fly' ? Math.min(64, 10 + d * 4.5) : 0,
    x: spec.fx,
    y: spec.fy,
  };
  S.balls.push(ball);
}
function elevGrad(x: number, y: number): Vec {
  return {
    x: (elevAt(x + 1, y) - elevAt(x - 1, y)) / 2,
    y: (elevAt(x, y + 1) - elevAt(x, y - 1)) / 2,
  };
}
function rollFrom(pos: Vec, dir: Vec, terrKey: string): { pos: Vec; water: Vec | null } {
  let len = (ROLL[terrKey] !== undefined ? ROLL[terrKey] : 0.3) * rand(0.7, 1.3);
  let p = { x: pos.x, y: pos.y };
  const d = { x: dir.x, y: dir.y };
  let guard = 60; // slope feedback could otherwise keep a ball rolling forever
  while (len > 0 && guard-- > 0) {
    const step = Math.min(0.25, len);
    // gravity: curve the roll toward downhill, stretch/shrink remaining roll
    const g = elevGrad(p.x, p.y);
    d.x -= g.x * 0.55 * step;
    d.y -= g.y * 0.55 * step;
    const m = Math.hypot(d.x, d.y) || 1;
    d.x /= m;
    d.y /= m;
    const slope = d.x * g.x + d.y * g.y; // >0 uphill, <0 downhill
    const nx = p.x + d.x * step;
    const ny = p.y + d.y * step;
    const l = lieOf(nx, ny);
    if (l === 'water') return { pos: p, water: { x: nx, y: ny } };
    p = { x: clamp(nx, 0.6, W - 0.6), y: clamp(ny, 0.6, H - 0.6) };
    const drag = l === 'sand' || l === 'rough' || l === 'tree' ? 2.5 : 1;
    len -= step * clamp(drag + slope * 1.6, 0.35, 4);
  }
  return { pos: p, water: null };
}
function resolveFly(b: Ball) {
  const from = { x: b.fx, y: b.fy };
  let pos = { x: b.tx, y: b.ty };
  const events: string[] = [];
  if (lieOf(pos.x, pos.y) === 'tree' && Math.random() < 0.5) {
    const back = rand(0.55, 0.75);
    pos = { x: lerp(from.x, b.tx, back), y: lerp(from.y, b.ty, back) };
    events.push('tree');
    sfx.thunk();
  }
  if (lieOf(pos.x, pos.y) === 'water') {
    splash(pos.x, pos.y);
    sfx.splash();
    events.push('water');
    let drop = from;
    for (let s = 0.95; s >= 0; s -= 0.05) {
      const px = lerp(from.x, pos.x, s);
      const py = lerp(from.y, pos.y, s);
      if (lieOf(px, py) !== 'water') {
        drop = { x: px, y: py };
        break;
      }
    }
    settleShot(b, drop, events, false);
    return;
  }
  const dd = dist(from, pos);
  if (dd > 0.2) {
    const dir = { x: (pos.x - from.x) / dd, y: (pos.y - from.y) / dd };
    const r = rollFrom(pos, dir, lieOf(pos.x, pos.y));
    if (r.water) {
      splash(r.water.x, r.water.y);
      sfx.splash();
      events.push('water');
      settleShot(b, pos, events, false);
      return;
    }
    if (dist(pos, r.pos) > 0.12) {
      startBall({ kind: 'roll', owner: b.owner, cup: b.cup, fx: pos.x, fy: pos.y, tx: r.pos.x, ty: r.pos.y, events });
      return;
    }
  }
  settleShot(b, pos, events, false);
}
function settleShot(b: Ball, pos: Vec, events: string[], holedFlag: boolean) {
  let holed = holedFlag;
  if (!holed && b.cup && lieOf(pos.x, pos.y) === 'green' && dist(pos, b.cup) < 0.45) {
    holed = true;
    events.push('chip');
  }
  if (holed && b.cup) pos = { x: b.cup.x, y: b.cup.y };
  if (b.owner === 'P') {
    onPlayerLand(pos, events, holed);
    return;
  }
  onGolferLand(b.owner, pos, events, holed);
}

/* ---------------- golfers ---------------- */
function golferCap(): number {
  return Math.min(3 + S.holes.length * 2, 14);
}
function spawnGolfer() {
  const g: Golfer = {
    name: pick(NAMES),
    skill: rand(0.35, 0.95),
    shirt: pick(SHIRTS),
    skin: pick(SKINS),
    cap: pick(SHIRTS),
    x: CH.x,
    y: CH.y,
    tx: CH.x,
    ty: CH.y,
    phase: Math.random() * 9,
    state: 'toTee',
    t: 0,
    holeIdx: 0,
    strokes: 0,
    mood: 0,
    ball: null,
    lie: 'tee',
    chatCd: 0,
    scenicSaid: false,
  };
  const fair = 10 + S.rep * 6 + S.holes.length * 1.5;
  if (S.fee > fair * 1.45 && Math.random() < 0.6) {
    S.lost++;
    floater(CH.x, CH.y - 1, pick(SAY.pricey), '#ffb0a6', 'bub');
    ticker(g.name, pick(SAY.pricey), 'bad');
    return;
  }
  if (S.fee > fair) g.mood -= (S.fee - fair) / 12;
  g.mood += spawnMoodBonus() + empSpawnMood();
  const hole = S.holes[0];
  if (!hole) return;
  g.tx = hole.tee.x + rand(-0.3, 0.3);
  g.ty = hole.tee.y + rand(-0.3, 0.3);
  S.golfers.push(g);
  updateTopbar();
}
function sendToNextHole(g: Golfer) {
  const h = S.holes[g.holeIdx];
  if (!h) {
    g.state = 'leave';
    g.tx = CH.x;
    g.ty = CH.y;
    return;
  }
  g.state = 'toTee';
  g.tx = h.tee.x + rand(-0.3, 0.3);
  g.ty = h.tee.y + rand(-0.3, 0.3);
}
function say(g: Golfer, key: string, cls?: string) {
  if (g.chatCd > 0) return;
  g.chatCd = 4;
  const txt = pick(SAY[key]);
  floater(g.x, g.y - 1.2, txt, '#fff', 'bub');
  ticker(g.name, txt, cls);
}
function aiShot(g: Golfer) {
  const h = S.holes[g.holeIdx];
  if (!h) {
    sendToNextHole(g);
    return;
  }
  g.strokes++;
  const land = aimShot(g.ball!, h.cup, g.lie, g.skill, 1);
  sfx.hit();
  if (land.power > 9 && Math.random() < 0.35) say(g, 'drive');
  startBall({ kind: 'fly', owner: g, cup: h.cup, fx: g.ball!.x, fy: g.ball!.y, tx: land.x, ty: land.y });
  g.face = Math.sign(isoOf(h.cup.x, h.cup.y).ix - isoOf(g.ball!.x, g.ball!.y).ix) || 1;
  g.state = 'watch';
  g.t = 0.55; // hold the follow-through pose briefly
}
function aiPutt(g: Golfer) {
  const h = S.holes[g.holeIdx];
  if (!h) {
    sendToNextHole(g);
    return;
  }
  g.strokes++;
  const d = dist(g.ball!, h.cup);
  let p = d <= 1.3 ? 0.97 : d <= 2.5 ? 0.72 : d <= 4.5 ? 0.42 : d <= 7 ? 0.22 : 0.08;
  p = clamp(p * (0.7 + g.skill * 0.5), 0, 0.96);
  sfx.putt();
  let end: Vec;
  const made = Math.random() < p;
  if (made) end = { x: h.cup.x, y: h.cup.y };
  else {
    const a = Math.atan2(h.cup.y - g.ball!.y, h.cup.x - g.ball!.x) + gauss() * 0.25;
    const nd = clamp(d * rand(0.12, 0.38) + 0.35, 0.4, d);
    end = { x: clamp(h.cup.x - Math.cos(a) * nd, 0.6, W - 0.6), y: clamp(h.cup.y - Math.sin(a) * nd, 0.6, H - 0.6) };
  }
  startBall({ kind: 'putt', owner: g, cup: h.cup, fx: g.ball!.x, fy: g.ball!.y, tx: end.x, ty: end.y, holed: made });
  g.face = Math.sign(isoOf(h.cup.x, h.cup.y).ix - isoOf(g.ball!.x, g.ball!.y).ix) || 1;
  g.state = 'watch';
  g.t = 0.4;
}
function onGolferLand(g: Golfer, pos: Vec, events: string[], holed: boolean) {
  const h = S.holes[g.holeIdx];
  for (const e of events) {
    if (e === 'water') {
      g.strokes++;
      g.mood -= 1;
      say(g, 'water', 'bad');
      floater(pos.x, pos.y - 0.8, '+1 penalty', '#ff9d94');
    }
    if (e === 'tree') {
      g.mood -= 0.4;
      say(g, 'tree', 'bad');
    }
    if (e === 'chip') {
      g.mood += 2;
      say(g, 'chip');
      confetti(pos.x, pos.y);
    }
  }
  g.ball = { x: pos.x, y: pos.y };
  g.lie = lieOf(pos.x, pos.y);
  if (g.lie === 'sand') {
    g.mood -= 0.15;
    if (Math.random() < 0.4) say(g, 'sand');
  }
  if (!g.scenicSaid && h && h.beauty > 0.45 && Math.random() < 0.5) {
    g.scenicSaid = true;
    g.mood += h.beauty;
    say(g, 'scenic');
  }
  if (holed) {
    sfx.hole();
    finishHole(g, false);
    return;
  }
  if (h && g.strokes >= h.par + 5) {
    say(g, 'pickup', 'bad');
    g.mood -= 2;
    finishHole(g, true);
    return;
  }
  g.state = 'toBall';
  g.tx = g.ball.x;
  g.ty = g.ball.y;
}
function finishHole(g: Golfer, pickedUp: boolean) {
  const h = S.holes[g.holeIdx];
  if (h && !pickedUp) {
    const diff = g.strokes - h.par;
    g.mood += diff <= -2 ? 2.6 : diff === -1 ? 1.9 : diff === 0 ? 0.9 : diff === 1 ? 0 : diff === 2 ? -0.8 : -1.6;
    if (diff <= -1) {
      say(g, 'birdie');
      if (Math.random() < 0.8) confetti(h.cup.x, h.cup.y);
      S.rep = clamp(S.rep + 0.02, 0.3, 5);
    } else if (diff === 0 && Math.random() < 0.35) say(g, 'par');
    else if (diff >= 1 && Math.random() < 0.35) say(g, 'bogey', 'bad');
  }
  g.mood += amenityMood() + empMoodPerHole();
  const mult = clamp(1 + g.mood * 0.09, 0.35, 1.9);
  const parPrem = h ? 0.5 + h.par * 0.25 : 1;
  const pay = Math.round(S.fee * mult * parPrem * feeMultiplier() * (pickedUp ? 0.4 : 1));
  if (h) earn(pay, h.cup.x, h.cup.y);
  S.served++;
  g.holeIdx++;
  g.strokes = 0;
  g.scenicSaid = false;
  if (g.holeIdx >= S.holes.length) {
    g.state = 'leave';
    g.tx = CH.x;
    g.ty = CH.y;
  } else sendToNextHole(g);
}
function updateGolfers(dt: number) {
  for (let i = S.golfers.length - 1; i >= 0; i--) {
    const g = S.golfers[i];
    g.chatCd = Math.max(0, g.chatCd - dt);
    g.phase += dt * 9;
    if (g.state === 'toTee' || g.state === 'toBall' || g.state === 'leave') {
      const d = Math.hypot(g.tx - g.x, g.ty - g.y);
      const sp = 2.4 * dt * moveSpeedMul() * empMoveSpeedMul();
      if (d <= sp) {
        g.x = g.tx;
        g.y = g.ty;
        if (g.state === 'leave') {
          const stars = clamp(2.5 + g.mood * 0.35, 0.3, 5);
          S.rep = clamp(S.rep + (stars - S.rep) * 0.09, 0.3, 5);
          if (g.mood >= 2) ticker(g.name, pick(SAY.leaveHappy), 'money');
          else if (g.mood <= -2) ticker(g.name, pick(SAY.leaveMad), 'bad');
          S.golfers.splice(i, 1);
          updateTopbar();
          continue;
        }
        if (g.state === 'toTee') {
          const h = S.holes[g.holeIdx];
          if (!h) {
            g.state = 'leave';
            g.tx = CH.x;
            g.ty = CH.y;
            continue;
          }
          g.ball = { x: h.tee.x + rand(-0.2, 0.2), y: h.tee.y + rand(-0.2, 0.2) };
          g.lie = 'tee';
          g.strokes = 0;
          g.state = 'preshot';
          g.t = rand(0.6, 1.5);
        } else {
          g.state = g.lie === 'green' ? 'prePutt' : 'preshot';
          g.t = rand(0.5, 1.2);
        }
      } else {
        g.x += ((g.tx - g.x) / d) * sp;
        g.y += ((g.ty - g.y) / d) * sp;
        const sdx = isoOf(g.tx, g.ty).ix - isoOf(g.x, g.y).ix; // screen-space horizontal direction
        if (Math.abs(sdx) > 1) g.face = sdx > 0 ? 1 : -1;
      }
    } else if (g.state === 'preshot') {
      g.t -= dt;
      if (g.t <= 0) aiShot(g);
    } else if (g.state === 'prePutt') {
      g.t -= dt;
      if (g.t <= 0) aiPutt(g);
    } else if (g.state === 'watch') {
      g.t -= dt; // follow-through timer for the renderer
    }
  }
}
function updateBalls(dt: number) {
  for (let i = S.balls.length - 1; i >= 0; i--) {
    const b = S.balls[i];
    const spd = b.owner === 'P' ? Math.max(1, S.speed) : S.speed;
    b.t += (dt * spd) / b.dur;
    if (b.t >= 1) {
      S.balls.splice(i, 1);
      if (b.kind === 'fly') resolveFly(b);
      else settleShot(b, { x: b.tx, y: b.ty }, b.events || [], !!b.holed);
    } else {
      b.x = lerp(b.fx, b.tx, b.t);
      b.y = lerp(b.fy, b.ty, b.t);
    }
  }
}
function updateSpawner(dt: number) {
  if (!S.holes.length) return;
  S.nextGolfer -= dt;
  if (S.nextGolfer <= 0 && S.golfers.length < golferCap()) {
    spawnGolfer();
    S.nextGolfer = clamp(12 - S.rep * 1.9, 3, 13) * rand(0.7, 1.3);
  }
}

/* ---------------- particles ---------------- */
function splash(x: number, y: number) {
  for (let i = 0; i < 12; i++)
    S.parts.push({ x, y, vx: rand(-1.6, 1.6), vy: rand(-3.2, -1), g: 8, c: pick(['#bfe3ff', '#7dbcf0', '#ffffff']), age: 0, life: 0.7 });
}
function confetti(x: number, y: number) {
  for (let i = 0; i < 16; i++) S.parts.push({ x, y, vx: rand(-2, 2), vy: rand(-4, -1.4), g: 6, c: pick(SHIRTS), age: 0, life: 1 });
}
function updateParts(dt: number) {
  for (let i = S.parts.length - 1; i >= 0; i--) {
    const p = S.parts[i];
    p.age += dt;
    if (p.age > p.life) {
      S.parts.splice(i, 1);
      continue;
    }
    p.vy += p.g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt * 0.5;
  }
  for (let i = S.floaters.length - 1; i >= 0; i--) {
    const f = S.floaters[i];
    f.age += dt;
    if (f.age > f.life) S.floaters.splice(i, 1);
  }
}

/* ---------------- camera glide ---------------- */
function centerCam(x: number, y: number) {
  S.camTarget = { x, y };
}
function updateCamGlide(dt: number) {
  const t = S.camTarget;
  if (!t) return;
  const iso = isoOf(t.x, t.y);
  const wantX = S.view.w / 2 - iso.ix * S.cam.z;
  const wantY = S.view.h / 2 - (iso.iy - elevAt(t.x, t.y) * EH) * S.cam.z;
  const k = Math.min(1, dt * 5);
  S.cam.x += (wantX - S.cam.x) * k;
  S.cam.y += (wantY - S.cam.y) * k;
  if (Math.abs(wantX - S.cam.x) < 2 && Math.abs(wantY - S.cam.y) < 2) S.camTarget = null;
}

/* ---------------- play your own course ---------------- */
export function startRound() {
  if (!S.holes.length) {
    setHint('Build a hole first, boss.');
    sfx.err();
    return;
  }
  if (S.speed === 0) setSpeed(1);
  S.mode = 'play';
  S.player = { holeIdx: 0, strokes: 0, card: [], ball: null, lie: 'tee', state: 'aim', aim: null };
  ui.set({ mode: 'play' });
  setupPlayerHole(0);
  setHint('Your round! Drag back from the ball, release to swing.');
}
function setupPlayerHole(i: number) {
  const p = S.player!;
  const h = S.holes[i];
  p.holeIdx = i;
  p.strokes = 0;
  p.lie = 'tee';
  p.state = 'aim';
  p.aim = null;
  p.ball = { x: h.tee.x, y: h.tee.y };
  centerCam(h.tee.x, h.tee.y); // walk the camera to the next tee
  updatePlayHud();
}
export function playerFire(dirX: number, dirY: number, power: number) {
  const p = S.player;
  const h = p ? S.holes[p.holeIdx] : null;
  if (!p || !h) return;
  p.strokes++;
  const L = LIE[p.lie] || LIE.rough;
  const intend = clamp(power, p.lie === 'green' ? 0.02 : 0.08, 1) * L.max;
  const tgt = { x: p.ball!.x + dirX * intend, y: p.ball!.y + dirY * intend };
  if (p.lie === 'green') {
    sfx.putt();
    const land = aimShot(p.ball!, tgt, 'green', 0.93, 0.8);
    const holed = dist(land, h.cup) < 0.42;
    startBall({ kind: 'putt', owner: 'P', cup: h.cup, fx: p.ball!.x, fy: p.ball!.y, tx: holed ? h.cup.x : land.x, ty: holed ? h.cup.y : land.y, holed });
  } else {
    sfx.hit();
    const land = aimShot(p.ball!, tgt, p.lie, 0.93, 0.55);
    startBall({ kind: 'fly', owner: 'P', cup: h.cup, fx: p.ball!.x, fy: p.ball!.y, tx: land.x, ty: land.y });
  }
  p.state = 'wait';
  p.aim = null;
}
function scoreName(diff: number): string {
  return diff <= -3 ? 'ALBATROSS?!' : diff === -2 ? 'EAGLE!' : diff === -1 ? 'BIRDIE!' : diff === 0 ? 'Par' : diff === 1 ? 'Bogey' : diff === 2 ? 'Double bogey' : '+' + diff;
}
function onPlayerLand(pos: Vec, events: string[], holed: boolean) {
  const p = S.player;
  if (!p) return;
  const h = S.holes[p.holeIdx];
  for (const e of events) {
    if (e === 'water') {
      p.strokes++;
      floater(pos.x, pos.y - 0.8, 'Splash · +1 penalty', '#ff9d94');
    }
    if (e === 'tree') floater(pos.x, pos.y - 0.8, 'Off the timber!', '#ffd2a6');
    if (e === 'chip') confetti(pos.x, pos.y);
  }
  p.ball = { x: pos.x, y: pos.y };
  p.lie = lieOf(pos.x, pos.y);
  centerCam(pos.x, pos.y); // follow the ball
  if (holed && h) {
    const diff = p.strokes - h.par;
    p.card.push({ par: h.par, strokes: p.strokes });
    sfx.hole();
    floater(h.cup.x, h.cup.y - 0.6, scoreName(diff), diff < 0 ? '#ffe27a' : '#fff');
    if (diff < 0) {
      sfx.tada();
      confetti(h.cup.x, h.cup.y);
      S.rep = clamp(S.rep + 0.06, 0.3, 5);
      ticker('The gallery', 'The boss just made ' + scoreName(diff).toLowerCase().replace('!', '') + ' on hole ' + (p.holeIdx + 1) + '!', 'money');
    }
    if (p.holeIdx + 1 >= S.holes.length) {
      endRound();
      return;
    }
    setTimeout(() => {
      if (S.player) setupPlayerHole(p.holeIdx + 1);
    }, 700);
    p.state = 'between';
    return;
  }
  p.state = 'aim';
  updatePlayHud();
}
function endRound() {
  const p = S.player;
  if (!p) return;
  let total = 0;
  let par = 0;
  let cashOut = 0;
  let birdies = 0;
  const rows = p.card.map((c, i) => {
    total += c.strokes;
    par += c.par;
    const d = c.strokes - c.par;
    if (d <= -1) {
      cashOut += 150;
      birdies++;
    } else if (d === 0) cashOut += 60;
    else cashOut += 20;
    return { hole: i + 1, par: c.par, strokes: c.strokes, diff: d };
  });
  cashOut += 100;
  S.cash += cashOut;
  S.rep = clamp(S.rep + birdies * 0.03, 0.3, 5);
  S.mode = 'build';
  S.player = null;
  S.camTarget = null;
  updateTopbar();
  ui.set({ mode: 'build', playHud: null, modal: { kind: 'round', rows, par, total, payout: cashOut } });
  sfx.tada();
}
export function quitRound(msg?: string) {
  if (!S.player) return;
  S.mode = 'build';
  S.player = null;
  S.camTarget = null;
  S.balls = S.balls.filter((b) => b.owner !== 'P');
  ui.set({ mode: 'build', playHud: null });
  setHint(msg || 'Round abandoned. The course won’t judge. Much.');
}

/* ---------------- tools + speed + fee ---------------- */
const HINTS: Record<string, string> = {
  pan: 'Drag to pan · pinch or scroll to zoom · hold SPACE to pan with any tool.',
  hole: 'Tap the map to place a TEE · tap an existing green to move its flag.',
  fair: 'Drag to paint fairway. Golfers love a good lie.',
  green: 'Paint near a flag to grow or reshape that green.',
  land: 'Tap a parcel marked FOR SALE to buy it.',
  sand: 'Bunkers: cheap, cruel, classic.',
  water: 'Water hazards eat golf balls and break hearts.',
  tree: 'Trees add beauty and bounce shots into next week.',
  flower: 'Flower beds. Pure beauty, zero mercy required.',
  path: 'Drag to lay pathway. Connect facilities to the clubhouse to open them.',
  raise: 'Drag to raise the land. Sculpt hills, plateaus and elevated tees.',
  lower: 'Drag to lower the land. Dig valleys and punchbowl greens.',
  build: 'Pick a facility, then tap the course to place it.',
  dozer: 'Tap to clear terrain, a hole, or a building. Refunds some cash.',
};
export function setTool(id: ToolId) {
  S.tool = id;
  S.holeDraft = null;
  if (id !== 'build') S.buildKind = null;
  ui.set({ tool: id, hint: HINTS[id] || '' });
}
export function selectBuilding(kind: BuildingKind) {
  S.tool = 'build';
  S.buildKind = kind;
  S.holeDraft = null;
  ui.set({ tool: 'build', hint: 'Placing ' + CATALOG[kind].name + ' — tap the course. Cost ' + fmt$(CATALOG[kind].cost) + '.' });
}
export function buildTap(wx: number, wy: number) {
  if (!S.buildKind) return;
  placeBuilding(S.buildKind, Math.floor(wx), Math.floor(wy));
}

/* ---------------- staff ---------------- */
function bumpStaff() {
  ui.set({ staffVersion: ui.get().staffVersion + 1 });
}
export function hireEmployee(kind: EmployeeKind) {
  const def = EMP_CATALOG[kind];
  if (def.skilled && !skilledUnlocked()) {
    setHint('Skilled staff unlock once your course has 6 holes.');
    sfx.err();
    return;
  }
  if (!spend(hireCost(kind))) return;
  addEmployee(kind);
  sfx.coin();
  ticker('Front office', def.name + ' joined the crew ($' + def.wage.toFixed(1) + '/s).', 'money');
  bumpStaff();
}
export function fireEmployee(kind: EmployeeKind) {
  if (fireOne(kind)) {
    setHint(EMP_CATALOG[kind].name + ' has been let go.');
    bumpStaff();
  }
}
export function setSpeed(n: number) {
  if (S.mode === 'play' && n === 0) n = 1;
  S.speed = n;
  ui.set({ speed: n });
}
export function setFee(delta: number) {
  S.fee = clamp(S.fee + delta, 5, 100);
  updateTopbar();
}
export function setMuted(m: boolean) {
  S.muted = m;
  ui.set({ muted: m });
}

/* ---------------- save / load ---------------- */
const SAVE_KEY = 'fairway-mogul-save-v1';
export function saveGame() {
  try {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        v: 2,
        cash: S.cash,
        fee: S.fee,
        rep: S.rep,
        served: S.served,
        lost: S.lost,
        tiles: Array.from(S.tiles),
        elevC: Array.from(S.elevC),
        owned: Array.from(S.owned),
        holes: S.holes,
        buildings: S.buildings,
        employees: S.employees,
      })
    );
  } catch {
    /* storage full or unavailable — skip silently */
  }
}
export function loadGame(): boolean {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if ((d.v !== 1 && d.v !== 2) || !Array.isArray(d.tiles) || d.tiles.length !== W * H) return false;
    S.cash = d.cash;
    S.fee = d.fee;
    S.rep = d.rep;
    S.served = d.served || 0;
    S.lost = d.lost || 0;
    S.tiles = Uint8Array.from(d.tiles);
    S.owned = Array.isArray(d.owned) && d.owned.length === PW * PH ? Uint8Array.from(d.owned) : (() => {
      const o = new Uint8Array(PW * PH);
      o.fill(1); // saves from before land parcels owned everything they had
      return o;
    })();
    if (d.v === 2 && Array.isArray(d.elevC) && d.elevC.length === (W + 1) * (H + 1)) {
      S.elevC = Uint8Array.from(d.elevC);
    } else {
      // v1 stored per-tile steps; approximate as corner heights and smooth
      S.elevC = new Uint8Array((W + 1) * (H + 1));
      if (Array.isArray(d.elev) && d.elev.length === W * H) {
        const tileE = (x: number, y: number) => (inb(x, y) ? d.elev[idx(x, y)] : 0);
        for (let y = 0; y <= H; y++)
          for (let x = 0; x <= W; x++)
            S.elevC[idxC(x, y)] = Math.max(tileE(x, y), tileE(x - 1, y), tileE(x, y - 1), tileE(x - 1, y - 1));
      }
      relaxTerrain();
    }
    S.holes = d.holes || [];
    S.buildings = d.buildings || [];
    S.employees = d.employees || [];
    rebuildStatics();
    updateTopbar();
    return true;
  } catch {
    return false;
  }
}
export function newCourse() {
  localStorage.removeItem(SAVE_KEY);
  S.cash = 20000;
  S.fee = 20;
  S.rep = 2.5;
  S.served = 0;
  S.lost = 0;
  S.holes = [];
  S.buildings = [];
  S.employees = [];
  S.golfers = [];
  S.balls = [];
  S.floaters = [];
  S.parts = [];
  S.player = null;
  S.mode = 'build';
  initMap();
  updateTopbar();
  ui.set({ mode: 'build', playHud: null, modal: null });
  setTool('hole');
  setHint('Fresh land, fresh start. Build your first hole!');
}

/* ---------------- building lots develop into homes ---------------- */
function updateLots(dtw: number) {
  for (const b of S.buildings) {
    if (b.kind !== 'buildinglot' || !b.open || (b.stage ?? 0) >= 2) continue;
    b.stageT = (b.stageT ?? 0) + dtw;
    const need = b.stage === 0 ? 25 : 55;
    if (b.stageT >= need) {
      b.stage = (b.stage ?? 0) + 1;
      b.stageT = 0;
      floater(b.x + b.w / 2, b.y + b.h / 2, b.stage === 1 ? 'Cottage built!' : 'Estate finished!', '#ffd856');
      ticker('Realtor', b.stage === 1 ? 'A cottage went up on your building lot.' : 'The lot upgraded to a luxury estate. Income up!', 'money');
      sfx.tada();
    }
  }
}

/* ---------------- per-frame update (no draw) ---------------- */
let incomeAcc = 0;
function accrueIncome(dtw: number) {
  // net cash flow: passive lot income minus staff wages
  incomeAcc += (passiveIncomePerSec() - empWagesPerSec()) * dtw;
  if (incomeAcc >= 1 || incomeAcc <= -1) {
    const whole = incomeAcc >= 0 ? Math.floor(incomeAcc) : Math.ceil(incomeAcc);
    incomeAcc -= whole;
    S.cash = Math.max(0, S.cash + whole);
    updateTopbar();
  }
}
let saveAcc = 0;
export function update(dt: number) {
  const dtw = dt * S.speed;
  S.time += dt;
  if (dtw > 0) {
    updateSpawner(dtw);
    updateGolfers(dtw);
    updateLots(dtw);
    accrueIncome(dtw);
  }
  updateBalls(dt);
  updateParts(dt);
  updateCamGlide(dt);
  saveAcc += dt;
  if (saveAcc >= 10) {
    saveAcc = 0;
    saveGame();
  }
}
