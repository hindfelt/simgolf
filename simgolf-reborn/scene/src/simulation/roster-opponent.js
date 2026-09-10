import roster from "./pro-roster.json" with { type: "json" };
import { newProProfile } from "./pro-skills.js";
import { exportGolfer } from "./golfer-package.js";
export const ROSTER_OPPONENT_NAMES = Object.freeze(
  roster.golfers.map((p) => p.name),
);
function professional(name) {
  const record = roster.golfers.find((p) => p.name === name);
  if (!record) throw Error("Choose a professional from the roster.");
  return record;
}
// golf.exe 0x40f133–0x40f15d copies roster skills into the challenger.
// These are host-selected NPC abilities, not earned player allocation points.
export function originalProfessionalSkills(name) {
  return structuredClone(professional(name).skillCaps);
}
export function rosterOpponent(name) {
  const record = professional(name);
  return {
    name: record.name,
    professional: record.name,
    golfer: exportGolfer({ proProfile: newProProfile() }),
    appearance: structuredClone(record.appearance),
  };
}
