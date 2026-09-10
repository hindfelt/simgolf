import { marinaWaterCell } from "./facilities.js";
import {
  createGame,
  newHole,
  restore,
  serialize,
  footprint,
  route,
} from "./game.js";
import {
  GRID,
  key,
  center,
  blocked,
  naturalWater,
  onBridge,
  entrance,
  inBounds,
} from "./world.js";
import { FACILITIES } from "./facilities.js";
import { RULESET_VERSION, canonical } from "./protocol.js";
export const PACKAGE_VERSION = 1;
const PROPERTY = "willow-brook-v1";
const exact = (v, keys) =>
  v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  Object.keys(v).length === keys.length &&
  keys.every((k) => Object.hasOwn(v, k));
const fail = () => {
  throw Error("Unsupported or invalid course package.");
};
const freeze = (o) => {
  Object.freeze(o);
  for (const v of Object.values(o)) if (v && typeof v === "object") freeze(v);
  return o;
};
export async function courseDigest(content) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonical(content)),
  );
  return [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
function designGame(content, seed = 2002) {
  if (
    !exact(content, [
      "removedTrees",
      "landscapeStyle",
      "environment",
      "landParcels",
      "version",
      "ruleset",
      "property",
      "title",
      "holes",
      "tiles",
      "facilities",
      "starterBridgeRemoved",
      "elevation",
      "bridges",
      "outOfBounds",
    ]) ||
    content.version !== PACKAGE_VERSION ||
    content.ruleset !== RULESET_VERSION ||
    content.property !== PROPERTY ||
    typeof content.title !== "string" ||
    !content.title.trim() ||
    content.title.length > 80 ||
    !Array.isArray(content.holes) ||
    !Array.isArray(content.facilities) ||
    content.facilities.length > 400 ||
    !content.tiles ||
    typeof content.tiles !== "object" ||
    Array.isArray(content.tiles) ||
    Object.keys(content.tiles).length > GRID.width * GRID.height
  )
    fail();
  const g = createGame(seed);
  g.removedTrees = structuredClone(content.removedTrees);
  g.landscapeStyle = content.landscapeStyle;
  g.environment = content.environment;
  g.landParcels = content.landParcels;
  g.tiles = structuredClone(content.tiles);
  g.starterBridgeRemoved = content.starterBridgeRemoved;
  for (const name of ["elevation", "bridges", "outOfBounds"])
    g[name] = structuredClone(content[name]);
  g.weeds = [];
  g.events = [];
  const point = (p) => {
    if (
      !(exact(p, ["c", "r"]) || exact(p, ["c", "r", "direction"])) ||
      !inBounds(p.c, p.r)
    )
      fail();
    return { ...p, ...center(p.c, p.r) };
  };
  g.holes = content.holes.map((h) => {
    if (!exact(h, ["id", "tee", "green"])) fail();
    return { ...newHole(h.id), tee: point(h.tee), green: point(h.green) };
  });
  g.nextHoleId =
    Math.max(1, ...g.holes.map((h) => Number(String(h.id).slice(5)))) + 1;
  const used = new Set();
  g.facilities = content.facilities.map((f) => {
    if (
      !(
        exact(f, ["id", "type", "c", "r"]) ||
        (exact(f, ["id", "type", "c", "r", "rotation"]) &&
          [0, 1, 2, 3].includes(f.rotation))
      ) ||
      !Object.hasOwn(FACILITIES, f.type) ||
      !Number.isSafeInteger(f.id) ||
      f.id < 1 ||
      used.has(f.id)
    )
      fail();
    used.add(f.id);
    return { ...f, served: 0 };
  });
  g.nextId = Math.max(g.nextId, ...g.facilities.map((f) => f.id + 1));
  for (const [k, t] of Object.entries(g.tiles)) {
    if (
      !exact(
        t,
        ["tee", "green"].includes(t?.type) ? ["type", "holeId"] : ["type"],
      )
    )
      fail();
    const n = Number(k),
      c = n % GRID.width,
      r = Math.floor(n / GRID.width),
      p = center(c, r);
    if (
      String(n) !== k ||
      !inBounds(c, r) ||
      blocked(c, r, g) ||
      (!g.starterBridgeRemoved && onBridge(p.x, p.z) && t.type !== "path")
    )
      fail();
  }
  restore(serialize(g));
  const occupied = new Set();
  for (const f of g.facilities)
    for (const p of footprint(f.type, f.c, f.r, 1, f.rotation || 0)) {
      const k = key(p.c, p.r),
        world = center(p.c, p.r);
      if (
        !inBounds(p.c, p.r) ||
        blocked(p.c, p.r, g) ||
        (g.tiles[k]?.type === "water") !==
          (f.type === "marina" && marinaWaterCell(f, p.c, p.r)) ||
        (!g.starterBridgeRemoved && onBridge(world.x, world.z)) ||
        occupied.has(k) ||
        ["tee", "green"].includes(g.tiles[k]?.type)
      )
        fail();
      occupied.add(k);
    }
  for (const h of g.holes) {
    const cells = footprint("tee", h.tee.c, h.tee.r);
    if (
      cells.some(
        (p) =>
          g.tiles[key(p.c, p.r)]?.type !== "tee" ||
          g.tiles[key(p.c, p.r)]?.holeId !== h.id,
      )
    )
      fail();
    if (
      Object.values(g.tiles).filter(
        (t) => t.type === "tee" && t.holeId === h.id,
      ).length !== 9
    )
      fail();
    if (
      Math.hypot(h.tee.x - h.green.x, h.tee.z - h.green.z) < 14 ||
      !route(g, entrance, h.tee) ||
      !route(g, h.tee, h.green)
    )
      throw Error(
        "Every exported hole needs a complete, reachable tee and green at least 56 yards apart.",
      );
  }
  return g;
}
export function courseContent(g, title = "Willow Brook") {
  const content = {
    removedTrees: {...g.removedTrees},
    landscapeStyle: g.landscapeStyle ?? "classic",
    environment: g.environment ?? null,
    landParcels: g.landParcels || 0,
    version: PACKAGE_VERSION,
    ruleset: RULESET_VERSION,
    property: PROPERTY,
    title: title.trim(),
    holes: g.holes.map((h) => ({
      id: h.id,
      tee: h.tee && { c: h.tee.c, r: h.tee.r, direction: h.tee.direction || 0 },
      green: h.green && { c: h.green.c, r: h.green.r },
    })),
    tiles: Object.fromEntries(
      Object.entries(g.tiles).map(([k, t]) => [
        k,
        ["tee", "green"].includes(t.type)
          ? { type: t.type, holeId: t.holeId }
          : { type: t.type },
      ]),
    ),
    starterBridgeRemoved: !!g.starterBridgeRemoved,
    elevation: structuredClone(g.elevation || {}),
    bridges: structuredClone(g.bridges || {}),
    outOfBounds: structuredClone(g.outOfBounds || {}),
    facilities: g.facilities.map(({ id, type, c, r, rotation }) => ({
      id,
      type,
      c,
      r,
      ...(rotation ? { rotation } : {}),
    })),
  };
  designGame(content);
  return freeze(content);
}
export async function exportCourse(g, title = "Willow Brook") {
  const content=courseContent(g,title);
  return freeze({ content, digest: await courseDigest(content) });
}
export async function importCourse(raw) {
  if (typeof raw !== "string" || raw.length > 2_000_000) fail();
  const pkg = JSON.parse(raw);
  if (
    !exact(pkg, ["content", "digest"]) ||
    typeof pkg.digest !== "string" ||
    !/^[a-f0-9]{64}$/.test(pkg.digest)
  )
    fail();
  designGame(pkg.content);
  if ((await courseDigest(pkg.content)) !== pkg.digest)
    throw Error("The course package does not match its content digest.");
  return freeze(pkg);
}
export function coursePractice(pkg, seed = 2002) {
  // Call only with a package returned by exportCourse/importCourse at the adapter boundary.
  const g = designGame(pkg.content, seed);
  g.courseDigest = pkg.digest;
  return g;
}
