import { sceneryTreeAt } from "./scenery-trees.js";
import {
  facilityExtents,
  facilityContains,
  marinaWaterCell,
} from "./facilities.js";
import { availableInEnvironment, validateEnvironment } from "./environments.js";
import { groundRoll } from "./ground-roll.js";
import { generateLandscape, LANDSCAPES } from "./generated-landscape.js";
import { ownsLand, ownedRows, validateOwnership } from "./land-purchase.js";
import { stepMarshall } from "./marshalls.js";
import {
  shouldBecomeAngry,
  beginAnger,
  stepAnger,
  validateAnger,
} from "./anger.js";
import {
  recordInterruption,
  validateInterruptions,
} from "./interrupted-rounds.js";
import { staffUpgrade } from "./staff-upgrades.js";
import { stepGreeter } from "./greeters.js";
import { ridesCart, cartSurface } from "./carts.js";
import { isMotivated, stepRanger } from "./rangers.js";
import {
  awardCourseAccomplishments,
  validateAccomplishments,
} from "./accomplishments.js";
import { stepHousing, validateHousing } from "./housing.js";
import { considerMembership, validateMemberships } from "./membership.js";
import { validateAppearance, ensureVisitorAppearances } from "./appearance.js";
import { ensurePersonalities, compatibilityHappiness } from "./personality.js";
import { nextVisitorPair, validateVisitorPairs } from "./visitor-pairing.js";
import { initializeVisitorPool, validateVisitorPool } from "./visitor-pool.js";
import {
  initialHappiness,
  happinessReaction,
  greenFee,
  airstripFeeBonus,
  validateHappiness,
  validFeeSnapshot,
  appreciateApproach,
} from "./happiness.js";
import { effectiveProSkills } from "./course-category.js";
import { planShotWith } from "./shot-planning-core.js";
import {
  hasClearedTee,
  MAX_ACTIVE_VISITORS,
  firstHoleReadyForArrivals,
  rememberGuest,
  migrateReturnProfiles,
  migrateGuestRoster,
  validateGuestRoster,
} from "./guest-roster.js";
import { stepOpeningStory, validateOpeningStory } from "../stories/live.js";
import { enjoyFlowers } from "./scenery.js";
import {
  seedEditableStream,
  LAND_TOOLS,
  landCheck,
  applyLand,
  validateLand,
  elevationAt,
  isOut,
} from "./landforming.js";
import {
  stepVendor,
  releaseRefreshment,
  isRefreshmentStaff,
} from "./vendors.js";
import { treeCollision, treeGroundBlocker } from "./trees.js";
import {
  newEvaluation,
  beginObservation,
  recordObservation,
  validateEvaluation,
} from "./evaluation.js";
import {
  FACILITIES,
  isFacility,
  facilityRadius,
  wantsTraining,
  completeTraining,
  wantsBallwash,
  completeBallwash,
} from "./facilities.js";
import {
  skilledStaffUnlocked,
  staffWage,
  growCrabgrass,
  turfJobs,
  repairTurf,
} from "./maintenance.js";
import { newProProfile, validateProProfile, proSkill } from "./pro-skills.js";
import { TERRAIN, terrainRule, EXTRA_TERRAIN } from "./terrain.js";
import { greenCells, connectedGreen } from "./green-edit.js";
import { validateProtocol, migrateProtocol } from "./protocol.js";
import {
  GRID,
  key,
  cellAt,
  center,
  inBounds,
  blocked,
  naturalWater,
  onBridge,
  entrance,
} from "./world.js";
import { RULES, TOOLS } from "./rules.js";

export const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const equalCell = (a, b) => a && b && a.c === b.c && a.r === b.r;
export function random(g, stream = "rng") {
  g[stream] = (Math.imul(g[stream], 1664525) + 1013904223) >>> 0;
  return g[stream] / 4294967296;
}
export function event(g, text) {
  g.events.unshift({ time: g.time, text });
  g.events.length = Math.min(g.events.length, 100);
}
function money(g, amount, reason) {
  g.cash += amount;
  g.ledger.push({ id: g.ledger.length + 1, time: g.time, amount, reason });
}
export function newHole(id) {
  return {
    id,
    tee: null,
    green: null,
    open: false,
    activePair: null,
    stats: { completed: 0, strokes: 0, fees: 0, evaluation: newEvaluation() },
  };
}
export function getHole(g, id = g.holes[0]?.id) {
  return g.holes.find((h) => h.id === id);
}
export function golferHole(g, v) {
  return getHole(g, v.holeId);
}
export function addHole(g) {
  if (g.holes.length >= 18)
    return { ok: false, message: "A course can have up to 18 holes." };
  if (g.holes.some((h) => !h.tee || !h.green))
    return {
      ok: false,
      message: "Place the current hole’s tee and green before adding another.",
    };
  const hole = newHole(`hole-${g.nextHoleId++}`);
  g.holes.push(hole);
  g.revision++;
  return {
    ok: true,
    message: `Hole ${g.holes.length} added. Place its tee and green.`,
    holeId: hole.id,
  };
}
function committedTo(g, id) {
  return [...g.guests, ...(g.pro ? [g.pro] : [])].some(
    (v) =>
      !v.paid &&
      v.phase !== "finished" &&
      v.itinerary.slice(v.holeIndex).includes(id),
  );
}
export function createGame(
  seed = 2002,
  landscape = "classic",
  environment = null,
) {
  validateEnvironment(environment);
  if (!Object.hasOwn(LANDSCAPES, landscape)) throw Error("Unknown landscape.");
  const g = {
    version: 2,
    environment,
    landscapeStyle: landscape,
    landSeed: seed >>> 0,
    landParcels: 0,
    time: 0,
    rng: seed >>> 0,
    weedRng: (seed + 971) >>> 0,
    cash: RULES.startingCash,
    tiles: {},
    holes: [newHole("hole-1")],
    retiredHoles: [],
    nextHoleId: 2,
    nextRoundId: 1,
    rounds: [],
    interruptedRounds: [],
    guests: [],
    guestRoster: [],
    memberships: [],
    accomplishments: [],
    visitorPairs: [],
    staff: [],
    weeds: [],
    facilities: [],
    pro: null,
    proProfile: newProProfile(),
    nextId: 1,
    nextArrival: 4,
    nextWeed: 10,
    nextWage: 60,
    revision: 0,
    weedRevision: 0,
    stats: {
      holesCompleted: 0,
      rounds: 0,
      strokes: 0,
      fees: 0,
      removed: 0,
      services: 0,
    },
    events: [],
    ledger: [],
  };
  for (let r = 10; r <= 14; r++) g.tiles[key(7, r)] = { type: "path" };
  for (let r = 24; r <= 33; r++) g.tiles[key(18, r)] = { type: "path" };
  seedEditableStream(g);
  if (landscape !== "classic")
    Object.assign(g, generateLandscape(seed >>> 0, landscape));
  // Bare property: no tee, green or fairway is prebuilt.
  for (let i = 0; i < 24; i++) spawnWeed(g);
  initializeVisitorPool(g);
  event(
    g,
    "Welcome to Willow Brook. Place a tee and green to begin your first hole.",
  );
  return g;
}
export function tile(g, c, r) {
  if (!ownsLand(g, c, r) || blocked(c, r, g)) return "blocked";
  const p = center(c, r);
  if (g.facilities.some((f) => facilityContains(f, c, r))) return "blocked";
  if (g.bridges?.[key(c, r)]) return "path";

  if (!g.starterBridgeRemoved && onBridge(p.x, p.z)) return "path";
  return g.tiles[key(c, r)]?.type || (sceneryTreeAt(g,c,r) ? "tree" : "rough");
}
export function lie(g, p) {
  const c = cellAt(p.x, p.z);
  return tile(g, c.c, c.r);
}
export function footprint(tool, c, r, brush = 1, rotation = 0) {
  const radius =
    tool === "tee"
      ? 1
      : tool === "green"
        ? 2
        : isFacility(tool)
          ? facilityRadius(tool)
          : Math.floor(brush / 2);
  const result = [];
  const extent = isFacility(tool)
    ? facilityExtents(tool, rotation)
    : { x: radius, z: radius };
  for (let dr = -extent.z; dr <= extent.z; dr++)
    for (let dc = -extent.x; dc <= extent.x; dc++)
      result.push({ c: c + dc, r: r + dr });
  return result;
}
export function canBuild(
  g,
  tool,
  c,
  r,
  brush = 1,
  holeId = g.holes[0]?.id,
  rotation = 0,
) {
  const hole = getHole(g, holeId);
  if (!availableInEnvironment(g, tool))
    return {
      ok: false,
      message: "That recreation building belongs to a different environment.",
    };
  if (!hole) return { ok: false, message: "Choose an existing hole." };
  if (LAND_TOOLS.includes(tool)) return landCheck(g, tool, c, r, brush, hole);
  if (tool === "path" && g.tiles[key(c, r)]?.type === "water")
    return landCheck(g, "bridge", c, r, 1, hole);
  if (!TOOLS.includes(tool) || tool === "inspect")
    return { ok: false, message: "Choose a construction tool." };
  if (
    ["tee", "green", "cup", "trim-green"].includes(tool) &&
    (hole.open || committedTo(g, holeId))
  )
    return {
      ok: false,
      message:
        "Close the hole and finish practice before moving its tee or green.",
    };
  const paintType = ["cup", "trim-green"].includes(tool) ? "green" : tool;
  if (["cup", "trim-green"].includes(tool) && !hole.green)
    return { ok: false, message: "Place this hole’s green first." };
  const extending = tool === "green" && !!hole.green;
  const cells = footprint(
    extending ? "extend-green" : tool,
    c,
    r,
    tool === "cup" ? 1 : brush,
    rotation,
  );
  for (const cell of cells) {
    const p = center(cell.c, cell.r),
      kind = tile(g, cell.c, cell.r);
    if (!ownsLand(g, cell.c, cell.r) || blocked(cell.c, cell.r, g))
      return {
        ok: false,
        message:
          "Keep construction inside the property and clear of buildings and trees.",
      };
    if (sceneryTreeAt(g,cell.c,cell.r)) return {ok:false,message:"Remove the existing tree before building here."};
    if (isFacility(tool)) {
      const wetRequired =
        tool === "marina" &&
        marinaWaterCell({ c, r, rotation }, cell.c, cell.r);
      if (
        (kind === "water") !== wetRequired ||
        g.bridges?.[key(cell.c, cell.r)]
      )
        return {
          ok: false,
          message:
            tool === "marina"
              ? "Marina: place the building on dry land and the docks over water. Rotate to face the shore."
              : "Place this facility on dry land.",
        };
    }
    if (!g.starterBridgeRemoved && onBridge(p.x, p.z))
      return {
        ok: false,
        message: "Keep construction clear of the original bridge deck.",
      };
    if (
      g.facilities.some((f) =>
        footprint(f.type, f.c, f.r, 1, f.rotation || 0).some((q) =>
          equalCell(q, cell),
        ),
      )
    )
      return { ok: false, message: "A facility occupies this tile." };
    if (
      ["cup", "trim-green"].includes(tool) &&
      (kind !== "green" || g.tiles[key(cell.c, cell.r)]?.holeId !== holeId)
    )
      return {
        ok: false,
        message: "Choose the selected hole’s putting surface.",
      };
    if (
      ["tee", "green"].includes(kind) &&
      (kind !== paintType || g.tiles[key(cell.c, cell.r)]?.holeId !== holeId)
    )
      return {
        ok: false,
        message: "Keep this tool outside the tee and putting green.",
      };
    if (
      tool === "path" &&
      ["fairway", "firm", "sand", ...EXTRA_TERRAIN].includes(kind)
    )
      return {
        ok: false,
        message: "Paths belong beside playing surfaces. Restore rough first.",
      };
    if (
      [
        "tee",
        "green",
        "fairway",
        "firm",
        "sand",
        "water",
        ...EXTRA_TERRAIN,
      ].includes(tool) &&
      kind === "path"
    )
      return {
        ok: false,
        message: "Keep a grass buffer between paths and the playing surface.",
      };
    if (
      tool === "rough" &&
      g.bridges?.[key(cell.c, cell.r)] &&
      [...g.guests, ...g.staff, ...(g.pro ? [g.pro] : [])].some((v) =>
        v.path?.some(
          (q) => Math.abs(q.x - p.x) < 1.01 && Math.abs(q.z - p.z) < 1.01,
        ),
      )
    )
      return {
        ok: false,
        message: "Wait for golfers and staff to finish crossing this bridge.",
      };
    if (
      [...g.guests, ...(g.pro ? [g.pro] : [])].some(
        (v) => distance(v.pos, p) < 1.7 || distance(v.ball, p) < 1.4,
      )
    )
      return {
        ok: false,
        message: "Wait until the golfers have cleared this tile.",
      };
  }
  if (["airstrip", "helipad", "marina"].includes(tool)) {
    const heights = cells.map(({ c, r }) => {
      const p = center(c, r);
      return elevationAt(g, p.x, p.z);
    });
    if (Math.max(...heights) - Math.min(...heights) > 0.5)
      return {
        ok: false,
        message:
          "Level this transport site first using the raise/lower terrain tools.",
      };
  }
  if (extending || tool === "trim-green") {
    const proposed = greenCells(g, holeId);
    for (const p of cells) {
      if (tool === "trim-green") proposed.delete(key(p.c, p.r));
      else proposed.add(key(p.c, p.r));
    }
    if (!connectedGreen(proposed, hole.green))
      return {
        ok: false,
        message:
          tool === "trim-green"
            ? "Keep the cup and one connected putting surface."
            : "Extend from the existing green; detached patches are not allowed.",
      };
  }
  const changed = cells.filter((p) => tile(g, p.c, p.r) !== tool);
  const cost = extending
    ? changed.length * RULES.costs.greenTile
    : ["tee", "green"].includes(tool) && changed.length === 0
      ? 0
      : ["tee", "green"].includes(tool) || isFacility(tool)
        ? RULES.costs[tool]
        : changed.length * RULES.costs[tool];
  if (g.cash < cost)
    return { ok: false, message: "Not enough funds for this construction." };
  return { ok: true, cells, changed, cost, extending };
}
export function placeStoryReward(g, c, r) {
  const story = g.openingStory;
  if (story?.status !== "happy-ending" || story.rewardFacilityId !== undefined)
    return { ok: false, message: "No unplaced story reward is available." };
  const check = canBuild(
    { ...g, cash: Number.MAX_SAFE_INTEGER },
    "flowerbed",
    c,
    r,
    1,
  );
  if (!check.ok) return check;
  const id = g.nextId++;
  g.facilities.push({ id, type: "flowerbed", c, r, served: 0, rotation: 0 });
  story.rewardFacilityId = id;
  g.revision++;
  event(g, "Opening Day commemorative garden placed.");
  return {
    ok: true,
    message: "Commemorative garden placed — a gift for the happy ending.",
  };
}
export function build(
  g,
  tool,
  c,
  r,
  brush = 1,
  holeId = g.holes[0]?.id,
  rotation = 0,
) {
  if (![0, 1, 2, 3].includes(rotation))
    return { ok: false, message: "Invalid building rotation." };
  const check = canBuild(g, tool, c, r, brush, holeId, rotation);
  if (!check.ok) return check;
  if (
    LAND_TOOLS.includes(tool) ||
    (tool === "path" && g.tiles[key(c, r)]?.type === "water")
  ) {
    const action = tool === "path" ? "bridge" : tool;
    applyLand(g, action, check.cells, getHole(g, holeId));
    if (check.cost) money(g, -check.cost, `Build ${action}`);
    g.revision++;
    return {
      ok: true,
      message:
        action === "rotate-tee"
          ? "Tee direction rotated 45°."
          : "Landscape updated.",
    };
  }
  if (tool === "cup") {
    getHole(g, holeId).green = { c, r, ...center(c, r) };
    g.revision++;
    return {
      ok: true,
      message: "Cup moved. The putting surface is unchanged.",
    };
  }
  if (isFacility(tool)) {
    g.facilities.push({
      id: g.nextId++,
      type: tool,
      c,
      r,
      served: 0,
      rotation,
    });
  } else {
    if (["tee", "green"].includes(tool) && !check.extending) {
      for (const [k, v] of Object.entries(g.tiles))
        if (v.type === tool && v.holeId === holeId) delete g.tiles[k];
      getHole(g, holeId)[tool] = { c, r, ...center(c, r) };
      if (g.pro?.phase === "finished") g.pro = null;
    }
    for (const cell of check.cells) {
      const k = key(cell.c, cell.r);
      if (tool === "rough" || tool === "trim-green") {
        delete g.tiles[k];
        delete g.bridges?.[k];
      } else if (g.bridges?.[k]) continue;
      else
        g.tiles[k] = ["tee", "green"].includes(tool)
          ? { type: tool, holeId }
          : { type: tool };
    }
  }
  if (check.cost) money(g, -check.cost, `Build ${tool}`);
  g.revision++;
  const before = g.weeds.length;
  g.weeds = g.weeds.filter((w) => !check.cells.some((p) => equalCell(p, w)));
  if (before !== g.weeds.length) g.weedRevision++;
  return {
    ok: true,
    message: check.extending
      ? "Green extended."
      : tool === "trim-green"
        ? "Green edge trimmed."
        : ["tee", "green"].includes(tool) || isFacility(tool)
          ? `${FACILITIES[tool]?.name || tool[0].toUpperCase() + tool.slice(1)} placed.`
          : "Terrain updated.",
  };
}

// Grid routing prefers paths and cannot cut diagonally through a water corner.
export function route(g, from, to) {
  const start = cellAt(from.x, from.z),
    end = cellAt(to.x, to.z);
  if (
    !inBounds(start.c, start.r) ||
    !inBounds(end.c, end.r) ||
    ["water", "blocked"].includes(tile(g, end.c, end.r))
  )
    return null;
  if (tile(g, end.c, end.r) === "tree") {
    const blocked = treeGroundBlocker(g, from, to);
    if (start.c === end.c && start.r === end.r && !blocked(from, to))
      return [{ ...to }];
    // A ball beside a trunk is reachable from a neighboring tile. Do not route
    // via this tile's center, which is the trunk of a planted tree.
    let best = null, bestDistance = Infinity;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = end.c + dc, r = end.r + dr;
      if (!inBounds(c, r) || tile(g, c, r) === "tree") continue;
      const approach = center(c, r);
      if (treeGroundBlocker(g, approach, to)(approach, to)) continue;
      const path = route(g, from, approach);
      if (!path) continue;
      path.push({ ...to });
      let previous = from, length = 0;
      for (const point of path) {
        length += distance(previous, point);
        previous = point;
      }
      if (length < bestDistance) { bestDistance = length; best = path; }
    }
    return best;
  }
  const total = GRID.width * GRID.height,
    dist = new Float64Array(total).fill(Infinity),
    parent = new Int32Array(total).fill(-1),
    closed = new Uint8Array(total);
  const sk = key(start.c, start.r),
    ek = key(end.c, end.r),
    open = [sk];
  dist[sk] = 0;
  for (let loops = 0; open.length && loops < total; loops++) {
    let at = 0,
      best = Infinity;
    for (let j = 0; j < open.length; j++) {
      const k = open[j],
        h =
          Math.abs((k % GRID.width) - end.c) +
          Math.abs(Math.floor(k / GRID.width) - end.r),
        f = dist[k] + h * 0.45;
      if (f < best) {
        best = f;
        at = j;
      }
    }
    const k = open.splice(at, 1)[0];
    if (closed[k]) continue;
    closed[k] = 1;
    if (k === ek) {
      const result = [{ ...to }];
      let n = k;
      while (n !== sk) {
        const p = center(n % GRID.width, Math.floor(n / GRID.width));
        result.unshift(p);
        n = parent[n];
        if (n < 0) return null;
      }
      return result;
    }
    const c = k % GRID.width,
      r = Math.floor(k / GRID.width);
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nc = c + dc,
        nr = r + dr,
        t = tile(g, nc, nr);
      if (t === "water" || t === "blocked") continue;
      if (k === sk && tile(g, start.c, start.r) === "tree") {
        const next = center(nc, nr);
        if (treeGroundBlocker(g, from, next)(from, next)) continue;
      }
      const nk = key(nc, nr),
        nd =
          dist[k] +
          terrainRule(t).walk +
          Math.abs(
            elevationAt(g, center(nc, nr).x, center(nc, nr).z) -
              elevationAt(g, center(c, r).x, center(c, r).z),
          ) *
            0.4;
      if (nd < dist[nk]) {
        dist[nk] = nd;
        parent[nk] = k;
        open.push(nk);
      }
    }
  }
  return null;
}
function setRoute(g, actor, target, next) {
  let p = route(g, actor.pos, target);
  if (!p) return false;
  if (
    actor.hasCart &&
    actor.cartPosition &&
    distance(actor.pos, actor.cartPosition) > 0.3 &&
    p.some((point) => cartSurface(lie(g, point)))
  ) {
    const pickup = route(g, actor.pos, actor.cartPosition),
      onward = route(g, actor.cartPosition, target);
    if (pickup && onward) p = [...pickup, ...onward];
  }
  actor.path = p;
  actor.afterWalk = next;
  actor.phase = "walking";
  return true;
}
function walk(actor, dt, pace = 1) {
  let travel = RULES.walkSpeed * dt * pace;
  while (actor.path?.length && travel > 0) {
    const target = actor.path[0],
      d = distance(actor.pos, target);
    actor.heading = Math.atan2(target.x - actor.pos.x, target.z - actor.pos.z);
    if (d <= travel) {
      actor.pos = { ...target };
      actor.path.shift();
      travel -= d;
    } else {
      actor.pos.x += ((target.x - actor.pos.x) / d) * travel;
      actor.pos.z += ((target.z - actor.pos.z) / d) * travel;
      travel = 0;
    }
  }
  if (!actor.path?.length) {
    actor.phase = actor.afterWalk;
    actor.wait = 0;
  }
}
export function openHole(g, holeId = g.holes[0]?.id) {
  const hole = getHole(g, holeId);
  if (!hole) return { ok: false, message: "Unknown hole." };
  if (!hole.tee || !hole.green)
    return { ok: false, message: "Place a tee and green first." };
  if (distance(hole.tee, hole.green) < 14)
    return {
      ok: false,
      message: "Give this hole at least 56 yards from tee to cup.",
    };
  if (!route(g, entrance, hole.tee) || !route(g, hole.tee, hole.green))
    return {
      ok: false,
      message:
        "Golfers need a walkable route from the clubhouse to the tee and green.",
    };
  hole.open = true;
  g.nextArrival = Math.min(g.nextArrival, g.time + 1);
  event(g, `Hole ${g.holes.indexOf(hole) + 1} is open.`);
  return {
    ok: true,
    message: `Hole ${g.holes.indexOf(hole) + 1} is open for business.`,
  };
}
export function closeHole(g, holeId = g.holes[0]?.id) {
  const hole = getHole(g, holeId);
  if (!hole) return { ok: false, message: "Unknown hole." };
  hole.open = false;
  event(g, "Hole closed to new arrivals. Golfers already booked will finish.");
  return {
    ok: true,
    message: "Closed to new arrivals. Booked rounds will finish.",
  };
}
export function connected(g, facility) {
  return !!connectedEntrance(g, facility);
}
export function connectedPathCells(g) {
  const start = cellAt(entrance.x, entrance.z),
    seen = new Set(),
    queue = [start];
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i],
      k = key(p.c, p.r);
    if (seen.has(k) || tile(g, p.c, p.r) !== "path") continue;
    seen.add(k);
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const c = p.c + dc,
        r = p.r + dr;
      if (inBounds(c, r) && !seen.has(key(c, r)) && tile(g, c, r) === "path")
        queue.push({ c, r });
    }
  }
  return seen;
}
function connectedEntrance(g, facility) {
  const paths = connectedPathCells(g),
    extent = facilityExtents(facility.type, facility.rotation || 0);
  for (const [dc, dr] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    const c = facility.c + dc * (extent.x + 1),
      r = facility.r + dr * (extent.z + 1);
    if (inBounds(c, r) && paths.has(key(c, r))) return center(c, r);
  }
  return null;
}
export function startingAttitude(g, base) {
  const tennis = g.facilities.some(
    (f) => FACILITIES[f.type]?.recreation && connected(g, f),
  );
  return tennis ? Math.max(base, RULES.tennisStartingMood) : base;
}
function golfer(
  g,
  name,
  pair,
  pro = false,
  itinerary = g.holes.filter((h) => h.open).map((h) => h.id),
) {
  const wellRested =
    !pro && g.facilities.some((f) => f.type === "hotel" && connected(g, f));
  return {
    id: g.nextId++,
    name,
    pair,
    pro,
    wellRested,
    cartPosition: { ...entrance, heading: 0 },
    hasCart:
      !pro &&
      g.facilities.some((f) => f.type === "cart-garage" && connected(g, f)),
    pos: { ...entrance },
    ball: { ...getHole(g, itinerary[0]).tee },
    roundId: `round-${g.nextRoundId++}`,
    itinerary: [...itinerary],
    holeNumbers: itinerary.map((id) => g.holes.indexOf(getHole(g, id)) + 1),
    holeIndex: 0,
    holeId: itinerary[0],
    scorecard: [],
    totalStrokes: 0,
    phase: "queue",
    path: [],
    wait: 0,
    strokes: 0,
    paid: false,
    mood: pro ? 80 : startingAttitude(g, 35 + ((g.nextId * 19) % 51)),
    happiness: initialHappiness(
      pro ? 80 : startingAttitude(g, 35 + ((g.nextId * 19) % 51)),
    ),
    happinessReactions: [],
    holeReactions: { holeId: itinerary[0], positive: 0, negative: 0, shots: 0 },
    energy: wellRested ? 100 : 90,
    hunger: 15,
    thirst: 20,
    skills: {
      length: random(g) > 0.5,
      accuracy: random(g) > 0.5,
      imagination: random(g) > 0.5,
    },
    trained: {},
    seenWeeds: [],
    comment: "Looking forward to a round.",
    shot: null,
    heading: 0,
  };
}
function queueForHole(g, v, offset = 0) {
  const tee = golferHole(g, v).tee;
  const queueSpot = {
    x: tee.x - 3 - ((v.pair || 0) % 3) * 1.2,
    z: tee.z + 2 + offset * 1.1,
  };
  return setRoute(g, v, queueSpot, "queue") || setRoute(g, v, tee, "queue");
}
function arrivals(g) {
  const candidates = nextVisitorPair(g);
  if (candidates.length < 2) return;
  const pair = g.nextId;
  for (const [i, candidate] of candidates.entries()) {
    const v = golfer(g, candidate.name, pair);
    v.id = candidate.id;
    v.appearance = structuredClone(candidate.appearance);
    v.skills = { ...candidate.profile.skills };
    v.trained = { ...candidate.profile.trained };
    v.happiness = Math.max(
      2,
      Math.min(
        5,
        v.happiness +
          compatibilityHappiness(
            candidate.personality,
            candidates[1 - i].personality,
          ),
      ),
    );
    if (candidate.record) v.comment = "Good to be back for another round!";
    if (queueForHole(g, v, i)) {
      g.guests.push(v);
      rememberGuest(g, v);
      chooseService(g, v, "start");
    }
  }
  event(
    g,
    candidates.map((p) => p.name).join(" and ") + " have arrived for a round.",
  );
}
export function shotLimit(g, v) {
  const surface = lie(g, v.ball);
  const recovery = terrainRule(surface).carry;
  return (
    RULES.carry *
    (v.proSkills
      ? 1 +
        0.3 * proSkill(v, "power") +
        (surface === "tee" ? 0.3 * proSkill(v, "longDrive") : 0)
      : v.skills.length
        ? v.trained?.length
          ? 1.45
          : 1.3
        : 1) *
    (recovery + (1 - recovery) * 0.5 * proSkill(v, "recovery")) *
    (v.energy < 30 ? 0.8 : 1)
  );
}
export function chooseTarget(g, v) {
  const cup = golferHole(g, v).green,
    d = distance(v.ball, cup),
    range = shotLimit(g, v);
  let ratio = Math.min(1, d < 11 ? 1 : range / d),
    x = v.ball.x + (cup.x - v.ball.x) * ratio,
    z = v.ball.z + (cup.z - v.ball.z) * ratio;
  if (v.skills.imagination) {
    const planned = planShotWith(
      g,
      v,
      { golferHole, lie, shotLimit, takeShot },
      {
        samples: [17],
        fractions: [1, 0.6],
        degrees: [0, -30, 30],
        shortlistSize: 2,
      },
    );
    if (planned) return planned;
  }
  return { x, z, technique: "straight" };
}
export function takeShot(g, v, target, technique = "straight") {
  if (v.shot || v.phase !== "address")
    return { ok: false, message: "Wait until the golfer is ready." };
  const cup = golferHole(g, v).green,
    putt =
      lie(g, v.ball) === "green" &&
      g.tiles[key(cellAt(v.ball.x, v.ball.z).c, cellAt(v.ball.x, v.ball.z).r)]
        ?.holeId === v.holeId &&
      distance(v.ball, cup) < 12;
  const from = { ...v.ball },
    aim = putt ? { x: cup.x, z: cup.z } : target,
    d = distance(from, aim);
  if (d < 0.2) return { ok: false, message: "Aim farther from the ball." };
  const carry = Math.min(
    d,
    shotLimit(g, v) * (technique === "punch" ? 0.8 : 1),
  );
  const ratio = putt ? 1 : carry / d,
    spread = v.proSkills
      ? (putt
          ? d * 0.25 * (1 - 0.8 * proSkill(v, "putter"))
          : 0.035 *
            carry *
            (1 -
              0.7 * proSkill(v, lie(g, from) === "tee" ? "driver" : "irons"))) *
        (1 - 0.2 * proSkill(v, "luck"))
      : putt
        ? 0
        : (v.skills.accuracy ? (v.trained?.accuracy ? 0.008 : 0.012) : 0.035) *
          carry;
  const accuracyFactor = v.cleanedHoleId === v.holeId ? 0.75 : 1;
  const landing = {
    x:
      from.x +
      (aim.x - from.x) * ratio +
      (random(g) - 0.5) * spread * accuracyFactor,
    z:
      from.z +
      (aim.z - from.z) * ratio +
      (random(g) - 0.5) * spread * accuracyFactor,
  };
  const rise =
    elevationAt(g, landing.x, landing.z) - elevationAt(g, from.x, from.z);
  if (!putt && rise) {
    const f = Math.max(0.6, Math.min(1.15, 1 - rise / Math.max(10, carry)));
    landing.x = from.x + (landing.x - from.x) * f;
    landing.z = from.z + (landing.z - from.z) * f;
  }
  const surface = lie(g, landing),
    behavior = terrainRule(surface);
  const roll = putt
    ? 0
    : behavior.roll *
      (technique === "backspin"
        ? -0.6 * (v.proSkills ? proSkill(v, "backspin") : 1)
        : 1);
  let direction = Math.atan2(aim.z - from.z, aim.x - from.x);
  if (surface === "rocks" && !putt)
    direction += (random(g) - 0.5) * Math.PI * 1.4;
  const endpoint = {
    x: landing.x + Math.cos(direction) * roll,
    z: landing.z + Math.sin(direction) * roll,
  };
  // Gravity biases ground release downhill on edited terrain.
  const sx =
    elevationAt(g, landing.x + 0.5, landing.z) -
    elevationAt(g, landing.x - 0.5, landing.z);
  const sz =
    elevationAt(g, landing.x, landing.z + 0.5) -
    elevationAt(g, landing.x, landing.z - 0.5);
  endpoint.x -= sx * (putt ? 2 : behavior.roll);
  endpoint.z -= sz * (putt ? 2 : behavior.roll);
  const rollFrom = putt ? from : landing;
  const ground = groundRoll(rollFrom, endpoint, (p) => lie(g, p),
    treeGroundBlocker(g, rollFrom, endpoint));
  endpoint.x = ground.end.x;
  endpoint.z = ground.end.z;
  const waterLanding = ground.water;
  beginObservation(g, v);
  v.strokes++;
  if (v.holeReactions?.holeId === v.holeId) v.holeReactions.shots++;
  v.shot = {
    from,
    landing,
    bounce: behavior.bounce,
    landingSurface: surface,
    waterLanding,
    end: endpoint,
    time: 0,
    duration: putt ? 1.3 : 1.2 + carry * 0.028,
    apex: putt
      ? 0
      : carry *
        (technique === "punch" ? 0.05 : technique === "backspin" ? 0.3 : 0.18),
    curve: putt
      ? 0
      : (technique === "draw" ? -1 : technique === "fade" ? 1 : 0) *
        carry *
        0.1 *
        (v.proSkills ? 0.3 + 0.7 * proSkill(v, technique) : 1),
    putt,
  };
  const obstruction = treeCollision(g, v.shot);
  if (obstruction) {
    v.shot.obstruction = obstruction;
    v.shot.end = { ...obstruction.point };
    v.shot.waterLanding = false;
  }
  v.phase = "shot";
  v.ballHeight = 0;
  v.comment = putt
    ? "Lining up the putt."
    : `Stroke ${v.strokes}: ${technique}.`;
  const c = cellAt(from.x, from.z),
    t = g.tiles[key(c.c, c.r)];
  if (t && ["fairway", "firm"].includes(t.type)) {
    t.wear = (t.wear || 0) + 1;
    g.revision++;
  }
  return { ok: true, message: putt ? "Putting…" : "Ball away." };
}
function finishHole(g, v) {
  const hole = golferHole(g, v),
    number = v.holeNumbers[v.holeIndex];
  if (!v.scorecard.some((s) => s.holeId === hole.id)) {
    const airstripBonus = airstripFeeBonus(
      v,
      g.facilities.some((f) => f.type === "airstrip" && connected(g, f)),
    );
    const score = {
      holeId: hole.id,
      number,
      strokes: v.strokes,
      par: par(g, hole.id),
      fee: greenFee(v) + airstripBonus,
      airstripBonus,
      happiness: v.pro ? 0 : v.happiness,
      completedAt: g.time,
    };
    v.scorecard.push(score);
    v.totalStrokes += v.strokes;
    if (!v.pro) {
      if (score.fee) money(g, score.fee, `${v.name}: hole ${number} green fee`);
      g.stats.holesCompleted++;
      g.stats.strokes += v.strokes;
      g.stats.fees += score.fee;
      hole.stats.completed++;
      hole.stats.strokes += v.strokes;
      hole.stats.fees += score.fee;
      recordObservation(g, v, hole);
    }
    event(
      g,
      `${v.name}: hole ${number} in ${v.strokes} strokes${v.pro ? "" : `, paid $${score.fee}`}.`,
    );
  }
  v.comment =
    v.strokes >= 12 && distance(v.ball, hole.green) >= 0.75
      ? "Picked up after 12 strokes."
      : `Hole ${number} complete in ${v.strokes}.`;
  if (!setRoute(g, v, hole.green, "hole-complete")) {
    v.phase = "hole-complete";
    v.wait = 0;
  }
}
function advanceRound(g, v) {
  delete v.serviceContinuation;
  if (v.holeIndex + 1 < v.itinerary.length) {
    const next = getHole(g, v.itinerary[v.holeIndex + 1]);
    if (!route(g, v.pos, next.tee)) {
      v.comment =
        "The next tee is unreachable. Please restore a walking route.";
      v.phase = "hole-complete";
      v.wait = 0;
      return;
    }
    v.holeIndex++;
    v.holeId = next.id;
    v.holeReactions = { holeId: next.id, positive: 0, negative: 0, shots: 0 };
    v.strokes = 0;
    delete v.holeObservation;
    delete v.cleanedHoleId;
    delete v.flowerHoleId;
    v.ball = { ...next.tee };
    v.ballHeight = 0;
    v.wait = 0;
    if (v.pro) setRoute(g, v, next.tee, "address");
    else chooseService(g, v, "start");
    return;
  }
  if (!v.roundFinished) {
    v.roundFinished = true;
    v.paid = !v.pro;
    if (!v.pro) {
      g.stats.rounds++;
      rememberGuest(g, v);
    }
    g.rounds.unshift({
      id: v.roundId,
      golferId: v.id,
      name: v.name,
      pro: v.pro,
      scorecard: structuredClone(v.scorecard),
      totalStrokes: v.totalStrokes,
      completedAt: g.time,
    });
    g.rounds.length = Math.min(100, g.rounds.length);
    event(
      g,
      `${v.name} finished ${v.scorecard.length} hole${v.scorecard.length === 1 ? "" : "s"} in ${v.totalStrokes} strokes.`,
    );
    const application = considerMembership(g, v);
    if (application) event(g, application);
  }
  v.phase = "finished";
  v.wait = 0;
}
function stepShot(g, v, dt) {
  const s = v.shot;
  s.time += dt;
  let lift = 0,
    point;
  if (s.obstruction && s.time >= s.duration * s.obstruction.t) {
    const u = clamp((s.time - s.duration * s.obstruction.t) / 0.8, 0, 1);
    point = { ...s.obstruction.point };
    lift = s.obstruction.height * (1 - u * u);
    v.comment = "Clipped a tree. The ball is dropping.";
  } else if (s.putt) {
    const u = clamp(s.time / s.duration, 0, 1),
      t = 1 - (1 - u) ** 2;
    point = {
      x: s.from.x + (s.end.x - s.from.x) * t,
      z: s.from.z + (s.end.z - s.from.z) * t,
    };
  } else if (s.time < s.duration) {
    const t = s.time / s.duration,
      bend = Math.sin(t * Math.PI) * s.curve,
      dx = s.landing.x - s.from.x,
      dz = s.landing.z - s.from.z,
      len = Math.hypot(dx, dz) || 1;
    point = {
      x: s.from.x + dx * t - (dz / len) * bend,
      z: s.from.z + dz * t + (dx / len) * bend,
    };
    lift = 4 * s.apex * t * (1 - t);
  } else {
    const t = clamp((s.time - s.duration) / 1.8, 0, 1),
      u = 1 - (1 - t) ** 2;
    point = {
      x: s.landing.x + (s.end.x - s.landing.x) * u,
      z: s.landing.z + (s.end.z - s.landing.z) * u,
    };
    if (t < 0.2) lift = Math.sin((t / 0.2) * Math.PI) * (s.bounce ?? 0.35);
    else if (t < 0.33)
      lift = Math.sin(((t - 0.2) / 0.13) * Math.PI) * (s.bounce ?? 0.35) * 0.28;
  }
  v.ball = point;
  v.ballHeight = lift;
  if (
    s.time <
    (s.obstruction
      ? s.duration * s.obstruction.t + 0.8
      : s.putt
        ? s.duration
        : s.duration + 1.8)
  )
    return;
  v.shot = null;
  v.ballHeight = 0;
  if (
    isOut(g, v.ball) ||
    s.waterLanding ||
    ["water", "blocked"].includes(lie(g, v.ball)) ||
    !route(g, v.pos, v.ball)
  ) {
    v.strokes++;
    const out = isOut(g, v.ball);
    v.ball = { ...s.from };
    complain(g, v, `penalty:${v.holeId}:${v.strokes}`);
    v.mood = Math.max(0, v.mood - 10);
    v.comment = out
      ? "Out of bounds. One penalty stroke; replay from the previous spot."
      : "Into trouble. Taking a penalty drop.";
    event(g, `${v.name}: penalty after an unplayable landing.`);
  } else {
    const cell = cellAt(v.ball.x, v.ball.z),
      turf = g.tiles[key(cell.c, cell.r)];
    appreciateApproach(
      v,
      s,
      turf?.type === "green" && turf.holeId === v.holeId,
    );
  }
  if (distance(v.ball, golferHole(g, v).green) < 0.75 || v.strokes >= 12) {
    finishHole(g, v);
    return;
  }
  if (!setRoute(g, v, v.ball, "address")) {
    v.phase = "address";
    v.wait = 0;
  }
}
export function par(g, holeId = g.holes[0]?.id) {
  const hole = getHole(g, holeId);
  if (!hole?.tee || !hole.green) return 0;
  const yards = distance(hole.tee, hole.green) * RULES.yardsPerUnit;
  return yards < 180 ? 3 : yards < 400 ? 4 : 5;
}
export function useBallwasher(g) {
  const v = g.pro;
  if (!v || v.phase !== "address" || v.shot)
    return { ok: false, message: "Wait until your golfer is ready to play." };
  if (!wantsBallwash(v))
    return { ok: false, message: "Your ball is already clean for this hole." };
  const choices = g.facilities
    .filter((f) => f.type === "ballwasher" && connected(g, f))
    .sort(
      (a, b) =>
        distance(v.pos, center(a.c, a.r)) - distance(v.pos, center(b.c, b.r)) ||
        a.id - b.id,
    );
  for (const f of choices) {
    const dest = facilityEntrance(g, f);
    if (dest && setRoute(g, v, dest, "service")) {
      v.serviceId = f.id;
      v.serviceContinuation = "return-ball";
      v.comment = "Walking to the Ballwasher. The ball stays where it lies.";
      return {
        ok: true,
        message: "Walking to the nearest reachable Ballwasher.",
      };
    }
  }
  return {
    ok: false,
    message: "Build a reachable Ballwasher connected to the clubhouse path.",
  };
}
function chooseService(g, v, continuation = v.serviceContinuation || "exit") {
  v.serviceContinuation = continuation;
  delete v.serviceId;
  if (continuation === "return-ball") {
    if (setRoute(g, v, v.ball, "address")) delete v.serviceContinuation;
    else {
      v.phase = "service";
      v.comment = "Restore a walking route back to my ball.";
    }
    return;
  }
  const facility = g.facilities.find(
    (f) =>
      connected(g, f) &&
      ((f.type === "bench" && v.energy < 80) ||
        (f.type === "snack" && (v.thirst > 25 || v.hunger > 25)) ||
        (f.type === "ballwasher" &&
          continuation === "start" &&
          wantsBallwash(v)) ||
        wantsTraining(v, f.type)),
  );
  if (facility) {
    const dest = facilityEntrance(g, facility);
    if (dest && setRoute(g, v, dest, "service")) {
      v.serviceId = facility.id;
      return;
    }
  }
  if (continuation === "start") {
    if (!queueForHole(g, v, v.id - (v.pair || v.id))) {
      v.phase = "queue";
      v.wait = 0;
    }
    return;
  }
  if (continuation === "round") {
    advanceRound(g, v);
    return;
  }
  if (!setRoute(g, v, entrance, "departed")) v.phase = "departed";
}
function facilityEntrance(g, f) {
  return connectedEntrance(g, f);
}
function complain(g, v, incident) {
  if (!happinessReaction(v, incident, -1) || g.weeds.length >= 180) return;
  if (random(g, "weedRng") >= RULES.complaintWeedChance) return;
  const patch = spawnWeed(g, v.pos);
  // The same complaint cannot immediately become another complaint about
  // its own new patch. Other golfers can still notice it normally.
  if (patch && !v.seenWeeds.includes(patch.id)) v.seenWeeds.push(patch.id);
}
function spawnWeed(g, near) {
  if (g.weeds.length >= 180) return;
  for (let attempt = 0; attempt < 40; attempt++) {
    const origin = near && cellAt(near.x, near.z);
    const c = origin
        ? origin.c + Math.floor(random(g, "weedRng") * 7) - 3
        : Math.floor(random(g, "weedRng") * GRID.width),
      r = origin
        ? origin.r + Math.floor(random(g, "weedRng") * 7) - 3
        : Math.floor(random(g, "weedRng") * ownedRows(g)),
      kind = tile(g, c, r);
    if (
      !["rough", "fairway", "firm"].includes(kind) ||
      g.weeds.some((w) => w.c === c && w.r === r) ||
      g.facilities.some((f) => Math.abs(f.c - c) < 2 && Math.abs(f.r - r) < 2)
    )
      continue;
    const patch = { id: g.nextId++, c, r, ...center(c, r) };
    g.weeds.push(patch);
    g.weedRevision++;
    return patch;
  }
}
export function hire(g, role = "groundskeeper") {
  if (
    ![
      "groundskeeper",
      "technician",
      "vendor",
      "consultant",
      "ranger",
      "marshall",
      "club-pro",
      "celebrity",
    ].includes(role)
  )
    return { ok: false, message: "Unknown staff role." };
  if (
    ["technician", "celebrity", "consultant", "marshall"].includes(role) &&
    !skilledStaffUnlocked(g)
  )
    return {
      ok: false,
      message: "Skilled employees require a six-hole daily-fee course.",
    };
  const title =
    role === "marshall"
      ? "Marshall"
      : role === "consultant"
        ? "Refreshment Consultant"
        : role === "celebrity"
          ? "Celebrity"
          : role === "club-pro"
            ? "Club Pro"
            : role === "technician"
              ? "Turf Technician"
              : role === "vendor"
                ? "Soda Vendor"
                : role === "ranger"
                  ? "Ranger"
                  : "Groundskeeper";
  const cost =
    role === "marshall"
      ? RULES.marshallHireCost
      : role === "consultant"
        ? RULES.consultantHireCost
        : role === "celebrity"
          ? RULES.celebrityHireCost
          : role === "club-pro"
            ? RULES.clubProHireCost
            : role === "technician"
              ? RULES.technicianHireCost
              : role === "vendor"
                ? RULES.vendorHireCost
                : role === "ranger"
                  ? RULES.rangerHireCost
                  : RULES.hireCost;
  if (g.staff.length >= RULES.staffLimit)
    return {
      ok: false,
      message: `Your course supports ${RULES.staffLimit} employees. Dismiss someone before hiring a replacement.`,
    };
  if (g.cash < cost) return { ok: false, message: "Not enough funds to hire." };
  money(g, -cost, `Hire ${title}`);
  g.staff.push({
    id: g.nextId++,
    name: `${title} ${g.staff.length + 1}`,
    role,
    served: 0,
    repaired: 0,
    crabgrassRemoved: 0,
    targetKind: "weed",
    pos: { ...entrance },
    phase: "idle",
    path: [],
    target: null,
    wait: 0,
    removed: 0,
  });
  event(g, `${title} has joined the course.`);
  return {
    ok: true,
    message: ["club-pro", "celebrity"].includes(role)
      ? `${title} hired. Use Send to area to welcome nearby golfers.`
      : role === "ranger"
        ? "Ranger hired. Use Send to area to cover a busy tee."
        : `${title} hired. They will walk to their work.`,
  };
}
export function upgradeStaff(g, staffId) {
  const employee = g.staff.find((s) => s.id === staffId);
  const upgrade = staffUpgrade(employee);
  if (!upgrade)
    return { ok: false, message: "This employee has no available upgrade." };
  if (!skilledStaffUnlocked(g))
    return {
      ok: false,
      message: "Skilled employees require a six-hole daily-fee course.",
    };
  if (g.cash < upgrade.cost)
    return { ok: false, message: "Not enough funds to upgrade." };
  money(g, -upgrade.cost, `Upgrade ${employee.name} to ${upgrade.title}`);
  employee.role = upgrade.role;
  event(g, `${employee.name} is now a ${upgrade.title}.`);
  return {
    ok: true,
    message: `${employee.name} upgraded to ${upgrade.title}.`,
  };
}
export function renameStaff(g, staffId, name) {
  const s = g.staff.find((s) => s.id === staffId);
  if (!s)
    return { ok: false, message: "This employee is no longer on the course." };
  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > 40 ||
    /[\u0000-\u001f\u007f]/u.test(name)
  )
    return { ok: false, message: "Use an employee name of 1–40 characters." };
  s.name = name.trim();
  return { ok: true, message: `Employee renamed to ${s.name}.` };
}
export function dismissStaff(g, staffId) {
  const s = g.staff.find((s) => s.id === staffId);
  if (!s)
    return { ok: false, message: "This employee is no longer on the course." };
  if (isRefreshmentStaff(s)) releaseRefreshment(g, s);
  g.staff = g.staff.filter((p) => p.id !== staffId);
  event(
    g,
    `${s.name} left the staff. Their unfinished job is available to other employees.`,
  );
  return {
    ok: true,
    message: `${s.name} dismissed. Future wages have stopped.`,
  };
}
export function repositionStaff(g, staffId, c, r) {
  const s = g.staff.find((s) => s.id === staffId);
  if (!s)
    return { ok: false, message: "This employee is no longer on the course." };
  if (!inBounds(c, r) || ["water", "blocked"].includes(tile(g, c, r)))
    return {
      ok: false,
      message: "Choose reachable dry ground for the employee.",
    };
  if (!setRoute(g, s, center(c, r), "idle"))
    return {
      ok: false,
      message: "This employee cannot walk to that location.",
    };
  if (isRefreshmentStaff(s))
    for (const v of g.guests)
      if (v.refreshmentStaffId === s.id) delete v.refreshmentStaffId;
  s.target = null;
  s.targetKind = "weed";
  delete s.marshallTarget;
  s.wait = 0;
  return {
    ok: true,
    message: `${s.name} is walking to the selected area, then will resume work.`,
  };
}
function stepStaff(g, s, dt) {
  if (s.role === "marshall") {
    stepMarshall(g, s, dt, { setRoute, walk, interruptVisitor });
    return;
  }
  if (["club-pro", "celebrity"].includes(s.role)) {
    stepGreeter(g, s, dt, walk);
    return;
  }
  if (s.role === "ranger") {
    stepRanger(g, s, dt, walk);
    return;
  }
  if (isRefreshmentStaff(s)) {
    stepVendor(g, s, dt, setRoute, walk);
    return;
  }
  if (s.phase === "walking") {
    walk(s, dt);
    return;
  }
  if (s.phase === "repairing") {
    const turf = g.tiles[s.target];
    if (s.role !== "technician" || !turf?.wear) {
      s.phase = "idle";
      s.target = null;
      s.wait = 0;
      return;
    }
    s.wait += dt;
    if (s.wait >= RULES.turfRepairSeconds) {
      repairTurf(g, s);
      s.phase = "idle";
      s.target = null;
      s.wait = 0;
    }
    return;
  }
  if (s.phase === "cleaning") {
    const weed = g.weeds.find((w) => w.id === s.target);
    if (!weed) {
      s.phase = "idle";
      return;
    }
    s.wait += dt;
    if (s.wait >= 1.6) {
      g.weeds = g.weeds.filter((w) => w.id !== s.target);
      g.weedRevision++;
      g.stats.removed++;
      s.removed++;
      s.target = null;
      s.phase = "idle";
      s.wait = 0;
    }
    return;
  }
  s.wait -= dt;
  if (s.wait > 0) return;
  s.wait = 2;
  const available = [
    ...g.weeds.map((w) => ({ ...w, kind: "weed" })),
    ...(s.role === "technician" ? turfJobs(g) : []),
  ]
    .filter(
      (w) =>
        !g.staff.some(
          (other) =>
            other !== s &&
            (other.targetKind || "weed") === w.kind &&
            other.target === w.id,
        ),
    )
    .sort((a, b) => distance(s.pos, a) - distance(s.pos, b));
  for (const w of available) {
    if (setRoute(g, s, w, w.kind === "turf" ? "repairing" : "cleaning")) {
      s.target = w.id;
      s.targetKind = w.kind;
      s.wait = 0;
      return;
    }
  }
}
export function interruptVisitor(g, visitorId, reason = "angry") {
  const v = g.guests.find((p) => p.id === visitorId);
  if (
    g.courseLocked ||
    !v ||
    v.pro ||
    v.paid ||
    v.roundFinished ||
    v.scorecard.length === v.itinerary.length ||
    v.interrupted ||
    !["angry", "ejected"].includes(reason)
  )
    return { ok: false, message: "This visitor round cannot be interrupted." };
  for (const s of g.staff)
    if (isRefreshmentStaff(s) && s.target === v.id) releaseRefreshment(g, s);
  delete v.refreshmentStaffId;
  delete v.serviceId;
  delete v.serviceContinuation;
  v.shot = null;
  v.ballHeight = 0;
  delete v.anger;
  recordInterruption(g, v, reason);
  v.interrupted = true;
  v.paid = true;
  v.phase = "departing";
  v.path = [];
  v.wait = 0;
  v.comment =
    reason === "ejected"
      ? "The Marshall has asked me to leave."
      : "I've had enough. I'm leaving.";
  event(g, `${v.name}'s round was interrupted.`);
  return { ok: true, message: "Visitor round interrupted." };
}
export function startPractice(g, holeId = g.holes[0]?.id) {
  const hole = getHole(g, holeId);
  if (!hole?.tee || !hole.green)
    return { ok: false, message: "Place a tee and green before practising." };
  if (g.pro && g.pro.phase !== "finished")
    return { ok: false, message: "Finish the current practice hole first." };
  g.pro = golfer(
    g,
    "Gary Golf",
    null,
    true,
    g.holes
      .slice(g.holes.indexOf(hole))
      .filter((h) => h.tee && h.green)
      .map((h) => h.id),
  );
  g.pro.skills = { length: false, accuracy: false, imagination: true };
  g.pro.proSkills = effectiveProSkills(g, g.proProfile);
  g.pro.pos = { ...hole.tee };
  g.pro.phase = "address";
  return {
    ok: true,
    message: "Gary Golf is ready. Choose a shot and click your landing target.",
  };
}
export function update(g, dt, runResort = true) {
  g.time += dt;
  if (runResort) {
    for (const name of awardCourseAccomplishments(g, par))
      event(g, name + ": earned 3 professional skill points.");
    growCrabgrass(g);
    if (g.time >= g.nextWeed) {
      spawnWeed(g);
      g.nextWeed += RULES.weedInterval;
    }
    if (g.time >= g.nextWage) {
      if (g.staff.length)
        money(
          g,
          -g.staff.reduce((sum, s) => sum + staffWage(s), 0),
          "Maintenance wages",
        );
      g.nextWage += RULES.wageInterval;
    }
    if (g.time >= g.nextArrival && firstHoleReadyForArrivals(g)) {
      arrivals(g);
      g.nextArrival = g.time + RULES.arrivalRetryDelay;
    }
  }
  for (const hole of g.holes) {
    if (
      hole.activePair !== null &&
      g.guests
        .filter((v) => v.pair === hole.activePair)
        .every((v) => hasClearedTee(v, hole.id))
    )
      hole.activePair = null;
    if (hole.activePair === null) {
      const v = g.guests.find(
        (v) => v.holeId === hole.id && v.phase === "queue",
      );
      if (v) hole.activePair = v.pair;
    }
  }
  for (const v of [...g.guests, ...(g.pro ? [g.pro] : [])]) {
    if (runResort && !g.courseLocked && shouldBecomeAngry(v)) {
      for (const s of g.staff)
        if (isRefreshmentStaff(s) && s.target === v.id)
          releaseRefreshment(g, s);
      delete v.refreshmentStaffId;
      beginAnger(g, v);
    }
    if (v.phase === "angry") {
      stepAnger(g, v, dt, { route, walk, complain, interruptVisitor });
      continue;
    }
    if (v.phase === "departing") {
      if (!v.path.length) {
        v.wait -= dt;
        if (v.wait > 0) continue;
        const exitPath = route(g, v.pos, entrance);
        if (!exitPath) {
          v.wait = 1;
          v.comment = "I cannot reach the exit. Please reconnect the path.";
          continue;
        }
        v.path = exitPath;
        v.afterWalk = "departed";
      }
      walk(v, dt);
      continue;
    }
    if (v.phase === "hole-complete") {
      v.wait += dt;
      const pairReady =
        v.pro ||
        g.guests
          .filter((p) => p.pair === v.pair)
          .every(
            (p) =>
              p.interrupted ||
              p.phase === "angry" ||
              p.scorecard.some((s) => s.holeId === v.holeId),
          );
      if (v.wait > 1 && pairReady) {
        if (!v.pro && v.holeIndex + 1 < v.itinerary.length)
          chooseService(g, v, "round");
        else advanceRound(g, v);
      }
      continue;
    }
    if (["departed", "finished"].includes(v.phase)) {
      if (v.phase === "finished" && !v.pro) {
        v.wait += dt;
        if (v.wait > 1) chooseService(g, v);
      }
      continue;
    }
    enjoyFlowers(g, v);
    const walkingOnPath =
      v.phase === "walking" && v.path?.length > 0 && lie(g, v.pos) === "path";
    v.energy = clamp(
      v.energy -
        dt *
          (v.wellRested ? 0.12 : 0.18) *
          (walkingOnPath ? RULES.pathEnergyFactor : 1),
      0,
      100,
    );
    if (v.energy < 30) {
      v.mood = clamp(v.mood - dt * 0.025, 0, 100);
      complain(g, v, `tired:${v.holeId}`);
      v.comment = "A long round. I could use a rest.";
    }
    v.hunger = clamp(v.hunger + dt * 0.16, 0, 100);
    v.thirst = clamp(v.thirst + dt * 0.24, 0, 100);
    const underfoot = cellAt(v.pos.x, v.pos.z);
    if (g.tiles[key(underfoot.c, underfoot.r)]?.crabgrass) {
      v.mood = clamp(v.mood - dt * 0.15, 0, 100);
      complain(g, v, `crabgrass:${v.holeId}`);
      v.comment = "Crabgrass in the fairway. The turf needs attention.";
    }
    for (const w of g.weeds) {
      if (distance(v.pos, w) < 3.8 && !v.seenWeeds.includes(w.id)) {
        v.seenWeeds.push(w.id);
        complain(g, v, `weed:${w.id}`);
        v.mood = clamp(v.mood - 2, 0, 100);
        v.comment =
          "Dandelions everywhere. This course could use a groundskeeper.";
        break;
      }
    }
    if (v.refreshmentStaffId !== undefined) {
      const vendor = g.staff.find(
        (s) =>
          s.id === v.refreshmentStaffId &&
          isRefreshmentStaff(s) &&
          s.phase === "refreshing" &&
          s.target === v.id,
      );
      if (vendor) {
        v.comment = "Stopping for a drink.";
        continue;
      }
      delete v.refreshmentStaffId;
    }
    if (v.phase === "walking") {
      const next = v.path?.[0];
      if (
        !v.pro &&
        !v.paid &&
        dt > 0 &&
        next &&
        lie(g, v.pos) === "path" &&
        lie(g, next) === "path" &&
        elevationAt(g, next.x, next.z) - elevationAt(g, v.pos.x, v.pos.z) >
          distance(v.pos, next) * RULES.steepPathGradient + 1e-8
      ) {
        complain(g, v, `steep-path:${v.holeId}`);
        v.comment = "This path is too steep. What a climb!";
      }
      const driving = ridesCart(v, lie(g, v.pos));
      walk(
        v,
        dt,
        (isMotivated(g, v) ? RULES.rangerPaceFactor : 1) *
          (driving ? RULES.cartPaceFactor : 1),
      );
      if (driving && cartSurface(lie(g, v.pos)))
        v.cartPosition = { x: v.pos.x, z: v.pos.z, heading: v.heading || 0 };
      continue;
    }
    if (v.phase === "shot") {
      stepShot(g, v, dt);
      continue;
    }
    if (v.phase === "queue") {
      v.wait += dt;
      if (v.pair === golferHole(g, v).activePair) {
        setRoute(g, v, golferHole(g, v).tee, "address");
        v.wait = 0;
      } else if (v.wait > 15) {
        v.mood = clamp(v.mood - dt * 0.08, 0, 100);
        complain(g, v, `wait:${v.holeId}`);
        v.comment = "A bit of a wait at this tee.";
      }
      continue;
    }
    if (v.phase === "service") {
      v.wait += dt;
      const f = g.facilities.find((f) => f.id === v.serviceId);
      if (!f || !connected(g, f)) {
        chooseService(g, v);
        continue;
      }
      if (v.wait > 3) {
        if (f.type === "bench") {
          v.energy = 100;
          v.comment = "That bench was just what I needed.";
        } else if (f.type === "snack") {
          v.hunger = 0;
          v.thirst = 0;
          v.comment = "Refreshed and ready for more golf.";
          money(g, 3, "Snack bar sale");
        } else if (f.type === "ballwasher") {
          completeBallwash(v);
        } else {
          completeTraining(v, f.type);
        }
        if (f.type !== "ballwasher") {
          happinessReaction(v, `service:${f.type}:${v.holeId}`, 1);
          v.mood = clamp(v.mood + 8, 0, 100);
        }
        f.served++;
        g.stats.services++;
        chooseService(g, v);
      }
      continue;
    }
    if (v.phase === "address") {
      v.wait += dt;
      const autoPutt =
        lie(g, v.ball) === "green" &&
        g.tiles[key(cellAt(v.ball.x, v.ball.z).c, cellAt(v.ball.x, v.ball.z).r)]
          ?.holeId === v.holeId &&
        distance(v.ball, golferHole(g, v).green) < 12;
      if (v.pro && !autoPutt) continue;
      if (
        v.wait < 1.1 / (isMotivated(g, v) ? RULES.rangerPaceFactor : 1) ||
        g.guests.some(
          (other) => other !== v && other.pair === v.pair && other.shot,
        )
      )
        continue;
      const target = chooseTarget(g, v);
      takeShot(g, v, target, target.technique);
      v.wait = 0;
    }
  }
  if (runResort) {
    stepOpeningStory(g);
    stepHousing(g, connected, tile, money, event);
  }
  g.guests = g.guests.filter((v) => v.phase !== "departed");
  for (const staff of g.staff) stepStaff(g, staff, dt);
}

export function serialize(g) {
  return JSON.stringify(g);
}
export function restore(raw) {
  if (typeof raw !== "string" || raw.length > 2_000_000)
    throw Error("Save is too large or unreadable.");
  const g = JSON.parse(raw);
  if (g?.version === 1) migrateSingleHole(g);
  if (g?.version === 2) {
    g.retiredHoles ??= [];
    for (const h of [...(g.holes || []), ...g.retiredHoles])
      if (h.stats) h.stats.evaluation ??= newEvaluation();
    for (const s of g.staff || []) {
      s.role ??= "groundskeeper";
      s.repaired ??= 0;
      s.served ??= 0;
      s.crabgrassRemoved ??= 0;
      s.targetKind ??= "weed";
    }
    g.proProfile ??= newProProfile();
    validateProProfile(g.proProfile);
    if (g.pro?.proSkills)
      validateProProfile({ points: 10, skills: g.pro.proSkills });
    for (const v of [...(g.guests || []), ...(g.pro ? [g.pro] : [])])
      v.holeNumbers ??= v.itinerary.map(
        (id, i) =>
          v.scorecard[i]?.number ?? g.holes.findIndex((h) => h.id === id) + 1,
      );
  }
  if (g?.tiles) seedEditableStream(g);
  if (
    g &&
    g.guestRoster === undefined &&
    (!g.protocol || g.protocol.version < 21)
  )
    migrateGuestRoster(g);
  if (
    g?.guestRoster &&
    (!g.protocol || g.protocol.version < 22) &&
    g.guestRoster.some((p) => p.profile === undefined)
  )
    migrateReturnProfiles(g);
  if (g && (!g.protocol || g.protocol.version < 26))
    for (const v of g.guests || []) {
      if (v.happiness === undefined) {
        v.happiness = initialHappiness(v.mood);
        v.happinessReactions = [];
      }
    }
  if (
    g?.guestRoster &&
    g.visitorPool === undefined &&
    (!g.protocol || g.protocol.version < 31)
  ) {
    initializeVisitorPool(g);
    for (const p of g.guestRoster)
      if (
        p.profile &&
        p.rounds > 0 &&
        p.nextVisitAt === null &&
        !g.guests.some((v) => v.id === p.id)
      )
        p.nextVisitAt = g.time + 240;
  }
  if (
    g &&
    g.visitorPairs === undefined &&
    (!g.protocol || g.protocol.version < 32)
  )
    g.visitorPairs = [];
  if (g?.visitorPool && (!g.protocol || g.protocol.version < 33))
    ensurePersonalities(g);
  if (g?.visitorPool && (!g.protocol || g.protocol.version < 34))
    ensureVisitorAppearances(g);
  if (
    g &&
    g.memberships === undefined &&
    (!g.protocol || g.protocol.version < 36)
  )
    g.memberships = [];
  if (
    g &&
    g.accomplishments === undefined &&
    (!g.protocol || g.protocol.version < 38)
  )
    g.accomplishments = [];
  if (g && (!g.protocol || g.protocol.version < 45))
    for (const v of g.guests || [])
      if (v.hasCart && !v.cartPosition)
        v.cartPosition = { ...v.pos, heading: v.heading || 0 };
  if (g && (!g.protocol || g.protocol.version < 51)) g.interruptedRounds ??= [];
  if (g?.protocol !== undefined) {
    migrateProtocol(g.protocol);
    validateProtocol(g.protocol);
  }
  if (
    !g ||
    g.version !== 2 ||
    !Number.isFinite(g.cash) ||
    !Number.isFinite(g.time) ||
    g.time < 0 ||
    !Array.isArray(g.holes) ||
    !g.tiles ||
    !Array.isArray(g.guests) ||
    !Array.isArray(g.staff) ||
    !Array.isArray(g.weeds) ||
    !Array.isArray(g.facilities) ||
    !Array.isArray(g.ledger) ||
    !g.stats
  )
    throw Error("This is not a supported Willow Brook save.");
  const numberFields = [
    "rng",
    "weedRng",
    "nextId",
    "nextArrival",
    "nextWeed",
    "nextWage",
    "revision",
    "weedRevision",
  ];
  if (
    numberFields.some((k) => !Number.isFinite(g[k]) || g[k] < 0) ||
    !Array.isArray(g.events) ||
    !Number.isSafeInteger(g.nextHoleId) ||
    !Number.isSafeInteger(g.nextRoundId) ||
    !Array.isArray(g.rounds) ||
    !("pro" in g) ||
    ["holesCompleted", "rounds", "strokes", "fees", "removed", "services"].some(
      (k) => !Number.isFinite(g.stats[k]) || g.stats[k] < 0,
    )
  )
    throw Error("Incomplete simulation state.");
  const point = (p) =>
    p &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.z) &&
    Math.abs(p.x) < 200 &&
    Math.abs(p.z) < 200;
  for (const p of g.holes.flatMap((h) => [h.tee, h.green]).filter(Boolean))
    if (!point(p) || p.x !== center(p.c, p.r).x || p.z !== center(p.c, p.r).z)
      throw Error("Invalid tee or green position in save.");
  for (const t of Object.values(g.tiles)) {
    if (
      (t.wear !== undefined && (!Number.isSafeInteger(t.wear) || t.wear < 0)) ||
      (t.crabgrass !== undefined && typeof t.crabgrass !== "boolean") ||
      (t.neglectedSince !== undefined &&
        (!Number.isFinite(t.neglectedSince) ||
          t.neglectedSince < 0 ||
          t.neglectedSince > g.time))
    )
      throw Error("Invalid turf maintenance state.");
  }
  for (const row of g.ledger)
    if (!row || !Number.isFinite(row.amount) || typeof row.reason !== "string")
      throw Error("Invalid transaction in save.");
  for (const v of [...g.guests, ...(g.pro ? [g.pro] : [])]) {
    if (
      (v.motivatedUntil !== undefined &&
        (!Number.isFinite(v.motivatedUntil) ||
          v.motivatedUntil < 0 ||
          v.motivatedUntil > g.time + RULES.rangerMotivationSeconds)) ||
      (v.hasCart !== undefined && typeof v.hasCart !== "boolean") ||
      (v.hasCart &&
        (!point(v.cartPosition) || !Number.isFinite(v.cartPosition.heading))) ||
      !point(v.ball) ||
      !v.skills ||
      ["length", "accuracy", "imagination"].some(
        (k) => typeof v.skills[k] !== "boolean",
      ) ||
      !Array.isArray(v.seenWeeds) ||
      ["strokes", "wait", "mood", "energy", "hunger", "thirst"].some(
        (k) => !Number.isFinite(v[k]),
      ) ||
      typeof v.paid !== "boolean" ||
      ![
        "queue",
        "hole-complete",
        "walking",
        "shot",
        "address",
        "finished",
        "service",
        "departed",
        "departing",
        "angry",
      ].includes(v.phase)
    )
      throw Error("Invalid golfer in save.");
    if (v.phase === "shot" && !v.shot) throw Error("Missing shot in save.");
    if (
      v.shot &&
      (!point(v.shot.from) ||
        !point(v.shot.landing) ||
        !point(v.shot.end) ||
        ["time", "duration", "apex", "curve"].some(
          (k) => !Number.isFinite(v.shot[k]),
        ) ||
        v.shot.duration <= 0)
    )
      throw Error("Invalid shot in save.");
  }
  for (const v of [...g.guests, ...(g.pro ? [g.pro] : [])]) {
    if (
      v.wellRested !== undefined &&
      (typeof v.wellRested !== "boolean" || (v.pro && v.wellRested))
    )
      throw Error("Invalid hotel rest state.");
    if (v.flowerHoleId !== undefined && v.flowerHoleId !== v.holeId)
      throw Error("Invalid flower appreciation state.");
    if (v.cleanedHoleId !== undefined && v.cleanedHoleId !== v.holeId)
      throw Error("Invalid cleaned-ball hole in save.");
    if (
      v.trained !== undefined &&
      (!v.trained ||
        typeof v.trained !== "object" ||
        Array.isArray(v.trained) ||
        Object.entries(v.trained).some(
          ([k, value]) =>
            !["length", "accuracy", "imagination"].includes(k) ||
            typeof value !== "boolean" ||
            (value && !v.skills[k]),
        ))
    )
      throw Error("Invalid golfer training state.");
  }
  for (const v of [...g.guests, ...(g.pro ? [g.pro] : [])]) {
    const o = v.holeObservation;
    if (
      o !== undefined &&
      (!o ||
        v.pro ||
        !Number.isInteger(o.mask) ||
        o.mask < 0 ||
        o.mask > 63 ||
        ((o.mask >> 3) & ~(o.mask & 7)) !== 0 ||
        !Number.isFinite(o.startedAt) ||
        o.startedAt < 0 ||
        o.startedAt > g.time ||
        !Number.isFinite(o.mood) ||
        o.mood < 0 ||
        o.mood > 100)
    )
      throw Error("Invalid pending hole observation.");
  }
  for (const v of [...g.guests, ...(g.pro ? [g.pro] : [])]) {
    const o = v.shot?.obstruction;
    if (
      o !== undefined &&
      (!o ||
        !point(o.point) ||
        !Number.isFinite(o.t) ||
        o.t <= 0 ||
        o.t > 1 ||
        !Number.isFinite(o.height) ||
        o.height < 0 ||
        o.height > 7)
    )
      throw Error("Invalid tree collision.");
  }
  validateRounds(g);
  validateInterruptions(g);
  validateAnger(g);
  validateOpeningStory(g);
  for (const f of g.facilities)
    if (
      !isFacility(f.type) ||
      !Number.isFinite(f.served) ||
      (f.rotation !== undefined && ![0, 1, 2, 3].includes(f.rotation))
    )
      throw Error("Invalid facility in save.");
  for (const w of g.weeds) if (!point(w)) throw Error("Invalid weed in save.");
  for (const s of g.staff)
    if (
      ![
        "groundskeeper",
        "technician",
        "vendor",
        "consultant",
        "ranger",
        "marshall",
        "club-pro",
        "celebrity",
      ].includes(s.role) ||
      !["weed", "turf", "guest"].includes(s.targetKind) ||
      (s.ejected !== undefined &&
        (!Number.isSafeInteger(s.ejected) || s.ejected < 0)) ||
      (s.marshallTarget !== undefined &&
        (s.role !== "marshall" ||
          !Number.isSafeInteger(s.marshallTarget) ||
          s.marshallTarget < 1 ||
          s.marshallTarget >= g.nextId)) ||
      !Number.isSafeInteger(s.served) ||
      s.served < 0 ||
      (!isRefreshmentStaff(s) &&
        (s.phase === "refreshing" || s.targetKind === "guest")) ||
      !Number.isSafeInteger(s.repaired) ||
      s.repaired < 0 ||
      !Number.isSafeInteger(s.crabgrassRemoved) ||
      s.crabgrassRemoved < 0 ||
      (s.role !== "technician" &&
        (s.phase === "repairing" || s.targetKind === "turf")) ||
      !["idle", "walking", "cleaning", "repairing", "refreshing"].includes(
        s.phase,
      ) ||
      (["ranger", "marshall", "club-pro", "celebrity"].includes(s.role) &&
        (!["idle", "walking"].includes(s.phase) || s.target !== null)) ||
      !Number.isFinite(s.wait) ||
      !Number.isFinite(s.removed)
    )
      throw Error("Invalid groundskeeper in save.");
  for (const v of g.guests)
    if (
      v.refreshmentStaffId !== undefined &&
      (!Number.isSafeInteger(v.refreshmentStaffId) ||
        !g.staff.some(
          (s) =>
            s.id === v.refreshmentStaffId &&
            isRefreshmentStaff(s) &&
            s.phase === "refreshing" &&
            s.target === v.id,
        ))
    )
      throw Error("Invalid refreshment reservation.");
  for (const s of g.staff)
    if (
      s.phase === "refreshing" &&
      !g.guests.some((v) => v.id === s.target && v.refreshmentStaffId === s.id)
    )
      throw Error("Missing refreshment customer.");
  const finite = (v, depth = 0) => {
    if (depth > 15) throw Error("Invalid save structure.");
    if (typeof v === "number" && !Number.isFinite(v))
      throw Error("Invalid number in save.");
    if (v && typeof v === "object")
      Object.values(v).forEach((x) => finite(x, depth + 1));
  };
  finite(g);
  for (const v of g.guests) validateHappiness(v);
  validateGuestRoster(g);
  if (g.pro?.appearance !== undefined) validateAppearance(g.pro.appearance);
  validateVisitorPool(g);
  validateVisitorPairs(g);
  validateMemberships(g);
  validateHousing(g);
  validateAccomplishments(g);
  validateLand(g);
  validateOwnership(g);
  validateEnvironment(g.environment);
  if (g.facilities.some((f) => !availableInEnvironment(g, f.type)))
    throw Error("Facility does not belong to the saved environment.");
  for (const k of Object.keys(g.tiles)) {
    const n = Number(k);
    if (
      !Number.isInteger(n) ||
      n < 0 ||
      n >= GRID.width * GRID.height ||
      !Object.keys(TERRAIN)
        .filter((t) => t !== "rough")
        .includes(g.tiles[k].type)
    )
      throw Error("Invalid terrain in save.");
  }
  if (
    g.cash !==
    RULES.startingCash + g.ledger.reduce((sum, row) => sum + row.amount, 0)
  )
    throw Error("Save finances do not reconcile.");
  if (
    g.guests.length > MAX_ACTIVE_VISITORS ||
    g.staff.length > RULES.staffLimit ||
    g.weeds.length > 180
  )
    throw Error("Invalid population in save.");
  for (const p of [
    ...g.holes.flatMap((h) => [h.tee, h.green]),
    ...g.facilities,
    ...g.weeds,
  ].filter(Boolean))
    if (!inBounds(p.c, p.r))
      throw Error("An object lies outside the saved property.");
  for (const v of [...g.guests, ...g.staff, ...(g.pro ? [g.pro] : [])])
    if (
      !point(v.pos) ||
      !Array.isArray(v.path) ||
      !v.path.every(point) ||
      typeof v.name !== "string" ||
      !Number.isInteger(v.id)
    )
      throw Error("Invalid person in save.");
  return g;
}

function migrateSingleHole(g) {
  if (!g.hole || !Array.isArray(g.guests) || !g.stats)
    throw Error("Invalid legacy course.");
  const hole = {
    ...newHole("hole-1"),
    ...g.hole,
    activePair: g.activePair ?? null,
  };
  hole.stats = {
    completed: g.stats.rounds,
    strokes: g.stats.strokes,
    fees: g.stats.fees,
  };
  g.holes = [hole];
  g.nextHoleId = 2;
  g.nextRoundId = 1;
  g.rounds = [];
  g.stats.holesCompleted = g.stats.rounds;
  for (const tile of Object.values(g.tiles || {}))
    if (["tee", "green"].includes(tile.type)) tile.holeId = hole.id;
  for (const v of [...g.guests, ...(g.pro ? [g.pro] : [])]) {
    const done = v.paid || (v.pro && v.phase === "finished");
    Object.assign(v, {
      roundId: `round-${g.nextRoundId++}`,
      itinerary: [hole.id],
      holeId: hole.id,
      holeIndex: 0,
      totalStrokes: done ? v.strokes : 0,
      roundFinished: !!done,
      scorecard: done
        ? [
            {
              holeId: hole.id,
              number: 1,
              strokes: v.strokes,
              par: par(g),
              fee: v.pro ? 0 : RULES.fee,
              completedAt: g.time,
            },
          ]
        : [],
    });
  }
  delete g.hole;
  delete g.activePair;
  g.version = 2;
}
function validateRounds(g) {
  if (
    g.holes.length < 1 ||
    g.holes.length > 18 ||
    g.nextHoleId < 2 ||
    g.nextRoundId < 1 ||
    g.rounds.length > 100 ||
    !Array.isArray(g.retiredHoles)
  )
    throw Error("Invalid course size.");
  const ids = new Set();
  for (const h of g.holes) {
    if (
      !h ||
      !/^hole-[1-9][0-9]*$/.test(h.id) ||
      ids.has(h.id) ||
      Number(h.id.slice(5)) >= g.nextHoleId ||
      typeof h.open !== "boolean" ||
      !(h.activePair === null || Number.isInteger(h.activePair)) ||
      !h.stats ||
      ["completed", "strokes", "fees"].some(
        (k) => !Number.isFinite(h.stats[k]) || h.stats[k] < 0,
      ) ||
      (h.open && (!h.tee || !h.green))
    )
      throw Error("Invalid hole in save.");
    ids.add(h.id);
  }
  for (const hole of g.holes)
    if (hole.green && !connectedGreen(greenCells(g, hole.id), hole.green))
      throw Error("The cup must lie on one connected putting surface.");
  for (const t of Object.values(g.tiles))
    if (["tee", "green"].includes(t.type) && !ids.has(t.holeId))
      throw Error("Terrain refers to an unknown hole.");
  for (const h of g.retiredHoles) {
    if (
      !h ||
      !/^hole-[1-9][0-9]*$/.test(h.id) ||
      ids.has(h.id) ||
      Number(h.id.slice(5)) >= g.nextHoleId ||
      !h.stats ||
      ["completed", "strokes", "fees"].some(
        (k) => !Number.isFinite(h.stats[k]) || h.stats[k] < 0,
      )
    )
      throw Error("Invalid retired hole.");
    ids.add(h.id);
  }
  const allHoles = [...g.holes, ...g.retiredHoles];
  for (const h of allHoles) validateEvaluation(h.stats);
  if (
    allHoles.reduce((n, h) => n + h.stats.completed, 0) !==
      g.stats.holesCompleted ||
    allHoles.reduce((n, h) => n + h.stats.fees, 0) !== g.stats.fees ||
    allHoles.reduce((n, h) => n + h.stats.strokes, 0) !== g.stats.strokes
  )
    throw Error("Hole totals do not reconcile.");
  const roundIds = new Set();
  for (const r of g.rounds) {
    if (
      !r ||
      typeof r.id !== "string" ||
      roundIds.has(r.id) ||
      typeof r.name !== "string" ||
      typeof r.pro !== "boolean" ||
      !Array.isArray(r.scorecard) ||
      r.scorecard.length < 1 ||
      r.scorecard.length > 18 ||
      r.scorecard.some(
        (s) =>
          !s ||
          !ids.has(s.holeId) ||
          !Number.isInteger(s.strokes) ||
          s.strokes < 1 ||
          !Number.isFinite(s.par) ||
          !Number.isFinite(s.fee) ||
          !validFeeSnapshot(s),
      ) ||
      new Set(r.scorecard.map((s) => s.holeId)).size !== r.scorecard.length ||
      r.totalStrokes !== r.scorecard.reduce((n, s) => n + s.strokes, 0)
    )
      throw Error("Invalid completed scorecard.");
    roundIds.add(r.id);
  }
  for (const v of [...g.guests, ...(g.pro ? [g.pro] : [])]) {
    if (
      !Array.isArray(v.itinerary) ||
      !Array.isArray(v.holeNumbers) ||
      v.holeNumbers.length !== v.itinerary.length ||
      v.holeNumbers.some((n) => !Number.isInteger(n) || n < 1 || n > 18) ||
      v.itinerary.length < 1 ||
      v.itinerary.length > 18 ||
      new Set(v.itinerary).size !== v.itinerary.length ||
      !v.itinerary.every(
        (id) => getHole(g, id)?.tee && getHole(g, id)?.green,
      ) ||
      !Number.isInteger(v.holeIndex) ||
      v.holeIndex < 0 ||
      v.holeIndex >= v.itinerary.length ||
      v.holeId !== v.itinerary[v.holeIndex] ||
      !Array.isArray(v.scorecard) ||
      !Number.isFinite(v.totalStrokes) ||
      typeof v.roundId !== "string"
    )
      throw Error("Invalid round in save.");
    if (
      v.scorecard.length > v.itinerary.length ||
      v.scorecard.some(
        (s, i) =>
          s.holeId !== v.itinerary[i] ||
          !Number.isInteger(s.strokes) ||
          s.strokes < 1 ||
          !Number.isFinite(s.fee) ||
          !validFeeSnapshot(s) ||
          !Number.isFinite(s.par),
      ) ||
      v.totalStrokes !== v.scorecard.reduce((n, s) => n + s.strokes, 0)
    )
      throw Error("Invalid scorecard in save.");
  }
}
