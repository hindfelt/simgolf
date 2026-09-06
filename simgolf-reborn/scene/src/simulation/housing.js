import { center } from "./world.js";
import { evaluationReport } from "./evaluation.js";

// Manual confirms scenery/fun and Marina-family benefits; amounts and eligibility
// are provisional until measured in the original executable.
export const HOUSING_POLICY = Object.freeze({
  base: 3000,
  water: 500,
  tree: 100,
  maxTrees: 10,
  fun: 500,
  transportRate: 0.25,
});
export function lotValue(g, lot, connected, tile) {
  let water = false,
    trees = 0;
  for (let r = lot.r - 5; r <= lot.r + 5; r++)
    for (let c = lot.c - 5; c <= lot.c + 5; c++) {
      const type = tile(g, c, r);
      water ||= type === "water";
      if (type === "tree") trees++;
    }
  const p = center(lot.c, lot.r);
  const fun = g.holes.some(
    (h) =>
      h.green &&
      Math.hypot(h.green.x - p.x, h.green.z - p.z) < 30 &&
      evaluationReport(h).fun > 0,
  );
  const base =
    HOUSING_POLICY.base +
    (water ? HOUSING_POLICY.water : 0) +
    Math.min(trees, HOUSING_POLICY.maxTrees) * HOUSING_POLICY.tree +
    (fun ? HOUSING_POLICY.fun : 0);
  const bonus = g.facilities.some(
    (f) => ["marina", "helipad", "church"].includes(f.type) && connected(g, f),
  )
    ? Math.round(base * HOUSING_POLICY.transportRate)
    : 0;
  return { base, bonus, amount: base + bonus };
}
export function stepHousing(g, connected, tile, money, event) {
  for (const lot of g.facilities) {
    if (lot.type !== "building-lot" || !connected(g, lot)) continue;
    const buyer = g.guestRoster.find(
      (p) =>
        p.rounds > 0 && !(g.housingSales || []).some((s) => s.buyerId === p.id),
    );
    if (!buyer) continue;
    const price = lotValue(g, lot, connected, tile);
    money(g, price.amount, `Home sale ${lot.id} to ${buyer.name}`);
    (g.housingSales ??= []).push({
      facilityId: lot.id,
      buyerId: buyer.id,
      ...price,
      time: g.time,
      ledgerId: g.ledger.at(-1).id,
    });
    lot.type = "home";
    g.revision++;
    event(
      g,
      `${buyer.name} bought a home for $${price.amount.toLocaleString("en-US")}.`,
    );
  }
}
export function validateHousing(g) {
  if (g.housingSales === undefined) return;
  if (!Array.isArray(g.housingSales)) throw Error("Invalid home sales.");
  const buyers = new Set(),
    lots = new Set(),
    ledgers = new Set();
  for (const s of g.housingSales) {
    const entry = g.ledger.find((e) => e.id === s.ledgerId);
    if (
      !Number.isSafeInteger(s.facilityId) ||
      s.facilityId < 1 ||
      buyers.has(s.buyerId) ||
      lots.has(s.facilityId) ||
      ledgers.has(s.ledgerId) ||
      !g.guestRoster.some((p) => p.id === s.buyerId && p.rounds > 0) ||
      !Number.isSafeInteger(s.base) ||
      s.base < 3000 ||
      s.base > 5000 ||
      ![0, Math.round(s.base * HOUSING_POLICY.transportRate)].includes(
        s.bonus,
      ) ||
      s.amount !== s.base + s.bonus ||
      !Number.isFinite(s.time) ||
      s.time < 0 ||
      s.time > g.time ||
      !entry ||
      entry.amount !== s.amount ||
      entry.time !== s.time ||
      !entry.reason.startsWith(`Home sale ${s.facilityId} to `)
    )
      throw Error("Invalid home sale payment.");
    buyers.add(s.buyerId);
    lots.add(s.facilityId);
    ledgers.add(s.ledgerId);
  }
}
