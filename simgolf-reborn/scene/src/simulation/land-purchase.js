import { coastColumn } from "./coast.js";
import { GRID, inBounds, key, blocked } from "./world.js";

export const STARTING_ROWS = 42;
export const PARCEL_ROWS = 10;
export const LAND_PRICES = [15000, 22000, 30000];
export function ownedRows(g) {
  return STARTING_ROWS + (g.landParcels || 0) * PARCEL_ROWS;
}
export function ownsLand(g, c, r) {
  return inBounds(c, r) && r < ownedRows(g);
}

// Separate deterministic stream: buying land never changes golfer/shot randomness.
function random(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
export function buyLand(g) {
  const parcel = g.landParcels || 0,
    cost = LAND_PRICES[parcel];
  if (cost === undefined)
    return { ok: false, message: "All adjoining land is already owned." };
  if (g.cash < cost)
    return { ok: false, message: "Not enough funds to buy this parcel." };
  const start = ownedRows(g),
    rand = random((g.landSeed ?? 2002) + parcel * 7919);
  const phase = rand() * Math.PI * 2,
    pondC = 8 + Math.floor(rand() * 27);
  g.elevation ??= {};
  for (let r = start; r < start + PARCEL_ROWS; r++) {
    for (let c = 0; c < GRID.width; c++) {
      const k = key(c, r),
        local = r - start;
      // Flat seams join successive purchases; stepped half-level heights remain editable.
      const envelope = Math.sin((local / (PARCEL_ROWS - 1)) * Math.PI);
      const h = Math.round(4 * Math.sin(c / 6 + phase) * envelope) / 2;
      if (h) g.elevation[k] = h;
      const pond =
        Math.abs(c - pondC) <= 3 &&
        Math.abs(local - 5) <= 2 &&
        Math.abs(c - pondC) + Math.abs(local - 5) < 5;
      if (
        (g.landscapeStyle === "coast" &&
          !blocked(c, r) &&
          c >= coastColumn(g.landSeed ?? 2002, r)) ||
        (g.landscapeStyle !== "coast" && pond)
      ) {
        g.tiles[k] = { type: "water" };
        delete g.elevation[k];
      }
    }
  }
  g.landParcels = parcel + 1;
  g.cash -= cost;
  g.ledger.push({
    id: g.ledger.length + 1,
    time: g.time,
    amount: -cost,
    reason: `Buy land parcel ${parcel + 1}`,
  });
  g.revision++;
  return {
    ok: true,
    message: "Land purchased: 450 more tiles beyond the southern boundary.",
  };
}
export function validateOwnership(g) {
  if (
    g.landscapeStyle !== undefined &&
    !["classic", "rolling", "river", "coast"].includes(g.landscapeStyle)
  )
    throw Error("Invalid landscape style.");
  if (
    g.landParcels !== undefined &&
    (!Number.isInteger(g.landParcels) ||
      g.landParcels < 0 ||
      g.landParcels > LAND_PRICES.length)
  )
    throw Error("Invalid land ownership.");
  if (
    g.landSeed !== undefined &&
    (!Number.isInteger(g.landSeed) || g.landSeed < 0 || g.landSeed > 0xffffffff)
  )
    throw Error("Invalid landscape seed.");
  for (const name of ["tiles", "elevation", "bridges", "outOfBounds"]) {
    for (const k of Object.keys(g[name] || {}))
      if (Number(k) >= ownedRows(g) * GRID.width)
        throw Error("Landscape outside owned land.");
  }
}
