// A* over the tile grid so golfers walk around water/trees/steep ground instead of
// cutting straight through them. Framework-free, mirrors the module style of course.ts.
import { W, H } from './constants';
import { Tile } from './types';
import type { Vec } from './types';
import { tileAt, inb, elevAt } from './rng';
import { S } from './state';
import { bridgeConnectionsAt, isBridgeTile, isPointOnBridgeDeck } from './bridges';

/** Raw water is never valid walking ground; bridge decks remain ordinary route tiles. */
export function golferTileWalkable(x: number, y: number): boolean {
  if (!inb(x, y)) return false;
  const tile = tileAt(x, y);
  return tile !== Tile.WATER && tile !== Tile.STREAM;
}

/** Exact-point counterpart: bridge backing water is safe only on the authored deck. */
export function golferPointWalkable(point: Vec): boolean {
  const x = Math.floor(point.x);
  const y = Math.floor(point.y);
  if (!golferTileWalkable(x, y)) return false;
  return !isBridgeTile(tileAt(x, y)) || isPointOnBridgeDeck(S.tiles, point.x, point.y);
}

/** Rare legacy/edit recovery: relocate a golfer standing in raw water to nearest dry land. */
export function nearestDryGolferPoint(from: Vec): Vec | null {
  let best: Vec | null = null;
  let bestDistance = Infinity;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const tile = tileAt(x, y);
      if (tile === Tile.WATER || tile === Tile.STREAM || isBridgeTile(tile)) continue;
      const candidate = { x: x + 0.5, y: y + 0.5 };
      const distance = (candidate.x - from.x) ** 2 + (candidate.y - from.y) ** 2;
      if (distance < bestDistance) {
        best = candidate;
        bestDistance = distance;
      }
    }
  }
  return best;
}

function terrainCost(x: number, y: number): number {
  switch (tileAt(x, y)) {
    case Tile.PATH:
    case Tile.BRIDGE_WATER:
    case Tile.BRIDGE_STREAM:
      return 0.6;
    case Tile.TREE:
      return 5;
    case Tile.SAND:
    case Tile.WASTE_BUNKER:
      return 1.6;
    case Tile.POT_BUNKER:
      return 4;
    case Tile.BRUSH:
    case Tile.ROCK:
      return 5;
    case Tile.ROUGH:
    case Tile.DEEP_ROUGH:
    case Tile.FLOWER:
      return tileAt(x, y) === Tile.DEEP_ROUGH ? 2.1 : 1.4;
    default:
      return 1; // FAIR, FIRM_FAIR, GREEN, TEE
  }
}

const SLOPE_WEIGHT = 2.5;
const DIAG = Math.SQRT2;

function stepCost(ax: number, ay: number, bx: number, by: number, diag: boolean): number {
  const base = terrainCost(bx, by) * (diag ? DIAG : 1);
  const slope = Math.abs(elevAt(bx + 0.5, by + 0.5) - elevAt(ax + 0.5, ay + 0.5)) * SLOPE_WEIGHT;
  return base + slope;
}

function heuristic(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

/** Small binary min-heap keyed on f-score; nothing this size exists elsewhere in the codebase. */
class Heap {
  private a: { f: number; n: number }[] = [];
  push(f: number, n: number) {
    this.a.push({ f, n });
    let i = this.a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.a[p].f <= this.a[i].f) break;
      [this.a[p], this.a[i]] = [this.a[i], this.a[p]];
      i = p;
    }
  }
  pop(): { f: number; n: number } | undefined {
    if (!this.a.length) return undefined;
    const top = this.a[0];
    const last = this.a.pop()!;
    if (this.a.length) {
      this.a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < this.a.length && this.a[l].f < this.a[m].f) m = l;
        if (r < this.a.length && this.a[r].f < this.a[m].f) m = r;
        if (m === i) break;
        [this.a[m], this.a[i]] = [this.a[i], this.a[m]];
        i = m;
      }
    }
    return top;
  }
  get size() {
    return this.a.length;
  }
}

const NEIGHBORS: [number, number, boolean][] = [
  [1, 0, false],
  [-1, 0, false],
  [0, 1, false],
  [0, -1, false],
  [1, 1, true],
  [1, -1, true],
  [-1, 1, true],
  [-1, -1, true],
];
// The whole course is only 3,072 tiles. Searching all of it avoids turning a valid
// long detour into a false "unreachable" result while retaining a hard upper bound.
const MAX_NODES = W * H;

function bridgeAllowsCardinalStep(x: number, y: number, dx: number, dy: number): boolean {
  if (!isBridgeTile(tileAt(x, y))) return true;
  const connections = bridgeConnectionsAt(S.tiles, x, y);
  return dx < 0 ? connections.west : dx > 0 ? connections.east : dy < 0 ? connections.north : connections.south;
}

function golferStepWalkable(ax: number, ay: number, bx: number, by: number, diag: boolean): boolean {
  if (!golferTileWalkable(bx, by)) return false;
  const dx = bx - ax;
  const dy = by - ay;
  if (diag) {
    // Bridge decks have authored cardinal openings. Diagonal endpoints and diagonal
    // corner clips through a bridge backing tile would visibly walk through water.
    if (isBridgeTile(tileAt(ax, ay)) || isBridgeTile(tileAt(bx, by))) return false;
    const sideA = tileAt(ax + dx, ay);
    const sideB = tileAt(ax, ay + dy);
    if (isBridgeTile(sideA) || isBridgeTile(sideB)) return false;
    return golferTileWalkable(ax + dx, ay) && golferTileWalkable(ax, ay + dy);
  }
  return bridgeAllowsCardinalStep(ax, ay, dx, dy) && bridgeAllowsCardinalStep(bx, by, -dx, -dy);
}

/**
 * A* over the tile grid; returns world-space tile-center waypoints from `from` to `to`
 * (excluding `from`), or `null` if unreachable. A blocked start is tolerated so a golfer
 * caught by a terrain edit/legacy save can step back onto dry ground; a blocked goal is not.
 */
export function findPath(from: Vec, to: Vec): Vec[] | null {
  const sx = Math.max(0, Math.min(W - 1, Math.floor(from.x)));
  const sy = Math.max(0, Math.min(H - 1, Math.floor(from.y)));
  const gx = Math.max(0, Math.min(W - 1, Math.floor(to.x)));
  const gy = Math.max(0, Math.min(H - 1, Math.floor(to.y)));
  if (!golferPointWalkable(from) || !golferPointWalkable(to)) return null;
  if (sx === gx && sy === gy) return [];

  const startN = sy * W + sx;
  const goalN = gy * W + gx;
  const gScore = new Float32Array(W * H).fill(Infinity);
  const came = new Int32Array(W * H).fill(-1);
  const closed = new Uint8Array(W * H);
  gScore[startN] = 0;
  const open = new Heap();
  open.push(heuristic(sx, sy, gx, gy), startN);
  let visited = 0;

  while (open.size) {
    const cur = open.pop()!;
    const cn = cur.n;
    if (closed[cn]) continue;
    closed[cn] = 1;
    if (cn === goalN) break;
    if (++visited > MAX_NODES) return null;

    const cx = cn % W;
    const cy = (cn / W) | 0;
    for (const [dx, dy, diag] of NEIGHBORS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!golferStepWalkable(cx, cy, nx, ny, diag)) continue;
      const nn = ny * W + nx;
      if (closed[nn]) continue;
      const tentative = gScore[cn] + stepCost(cx, cy, nx, ny, diag);
      if (tentative < gScore[nn]) {
        gScore[nn] = tentative;
        came[nn] = cn;
        open.push(tentative + heuristic(nx, ny, gx, gy), nn);
      }
    }
  }
  if (gScore[goalN] === Infinity) return null;

  const path: Vec[] = [];
  let n = goalN;
  while (n !== startN) {
    path.push({ x: (n % W) + 0.5, y: ((n / W) | 0) + 0.5 });
    const prev = came[n];
    if (prev === -1) return null; // defensive — shouldn't happen once goal is reached
    n = prev;
  }
  path.reverse();
  return path;
}
