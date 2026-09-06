import { GRID, center } from "./world.js";
import { RULES } from "./rules.js";
export const skilledStaffUnlocked = (g) =>
  g.holes.filter((h) => h.tee && h.green).length >= 6;
export const staffWage = (s) =>
  s.role === "marshall"
    ? RULES.marshallWage
    : s.role === "consultant"
      ? RULES.consultantWage
      : s.role === "celebrity"
        ? RULES.celebrityWage
        : s.role === "club-pro"
          ? RULES.clubProWage
          : s.role === "ranger"
            ? RULES.rangerWage
            : s.role === "technician"
              ? RULES.technicianWage
              : s.role === "vendor"
                ? RULES.vendorWage
                : RULES.wage;
export function growCrabgrass(g) {
  for (const t of Object.values(g.tiles)) {
    if (
      !["fairway", "firm"].includes(t.type) ||
      (t.wear || 0) < RULES.crabgrassWear ||
      t.crabgrass
    )
      continue;
    t.neglectedSince ??= g.time;
    if (g.time - t.neglectedSince >= RULES.crabgrassDelay) {
      t.crabgrass = true;
      g.revision++;
    }
  }
}
export function turfJobs(g) {
  return Object.entries(g.tiles)
    .filter(([, t]) => ["fairway", "firm"].includes(t.type) && t.wear > 0)
    .map(([id, t]) => ({
      id: Number(id),
      kind: "turf",
      ...center(Number(id) % GRID.width, Math.floor(Number(id) / GRID.width)),
      crabgrass: !!t.crabgrass,
    }));
}
export function repairTurf(g, s) {
  const t = g.tiles[s.target];
  if (!t || !["fairway", "firm"].includes(t.type) || !t.wear) return false;
  s.repaired += t.wear;
  if (t.crabgrass) s.crabgrassRemoved++;
  delete t.wear;
  delete t.crabgrass;
  delete t.neglectedSince;
  g.revision++;
  return true;
}
