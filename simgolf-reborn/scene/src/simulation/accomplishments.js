import { evaluationReport } from "./evaluation.js";
import { classifyHole } from "./hole-classification.js";
// Archived contemporary tips identify these milestones; original task ordering
// and eligibility timing remain unverified. Each award grants three points.
export const ACCOMPLISHMENTS = [
  {
    id: "par-five",
    name: "First par-5 hole",
    qualifies: (holes) => holes.some((h) => h.par === 5),
  },
  {
    id: "nine-holes",
    name: "First nine-hole course",
    qualifies: (holes) => holes.length >= 9,
  },
  {
    id: "eighteen-holes",
    name: "First eighteen-hole course",
    qualifies: (holes) => holes.length >= 18,
  },
  ...["Challenge", "Heroic", "Strategic", "Classic"].map((name) => ({
    id: "first-" + name.toLowerCase(),
    name: "First " + name.toLowerCase() + " hole",
    qualifies: (holes) => holes.some((h) => h.classification === name),
  })),
];
export function awardCourseAccomplishments(g, par) {
  if (g.courseLocked) return [];
  const holes = g.holes
    .filter((h) => h.tee && h.green)
    .map((h) => ({
      ...h,
      par: par(g, h.id),
      classification: classifyHole(evaluationReport(h)).name,
    }));
  const earned = [];
  for (const a of ACCOMPLISHMENTS) {
    if (g.accomplishments.some((r) => r.id === a.id) || !a.qualifies(holes))
      continue;
    if (!Number.isSafeInteger(g.proProfile.points + 3)) continue;
    g.accomplishments.push({ id: a.id, at: g.time });
    g.proProfile.points += 3;
    earned.push(a.name);
    g.revision++;
  }
  return earned;
}
export function validateAccomplishments(g) {
  if (
    !Array.isArray(g.accomplishments) ||
    g.accomplishments.length > ACCOMPLISHMENTS.length
  )
    throw Error("Invalid professional accomplishments.");
  const seen = new Set();
  for (const r of g.accomplishments) {
    if (
      !r ||
      Object.keys(r).sort().join(",") !== "at,id" ||
      !ACCOMPLISHMENTS.some((a) => a.id === r.id) ||
      seen.has(r.id) ||
      !Number.isFinite(r.at) ||
      r.at < 0 ||
      r.at > g.time
    )
      throw Error("Invalid professional accomplishment record.");
    seen.add(r.id);
  }
}
