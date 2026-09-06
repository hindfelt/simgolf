import roster from "./pro-roster.json" with { type: "json" };
import { newProProfile } from "./pro-skills.js";
import { exportGolfer } from "./golfer-package.js";
export const ROSTER_OPPONENT_NAMES = Object.freeze(
  roster.golfers.map((p) => p.name),
);
// Exhibition allocation only: original cap fields are not earned skill points.
// Apportion the current ten-point budget by those weights, without exceeding caps.
export function rosterOpponent(name) {
  const record = roster.golfers.find((p) => p.name === name);
  if (!record) throw Error("Choose a professional from the roster.");
  const profile = newProProfile(),
    keys = Object.keys(profile.skills);
  const total = keys.reduce((sum, k) => sum + record.skillCaps[k], 0);
  for (let point = 0; point < profile.points; point++) {
    const candidates = keys.filter(
      (k) => profile.skills[k] < record.skillCaps[k],
    );
    candidates.sort(
      (a, b) =>
        (record.skillCaps[b] * (point + 1)) / total -
        profile.skills[b] -
        ((record.skillCaps[a] * (point + 1)) / total - profile.skills[a]),
    );
    if (!candidates.length) break;
    profile.skills[candidates[0]]++;
  }
  return {
    name: record.name,
    golfer: exportGolfer({ proProfile: profile }),
    appearance: structuredClone(record.appearance),
  };
}
