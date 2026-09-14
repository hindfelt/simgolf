import { validateProProfile } from "./pro-skills.js";
const exact = (v, keys) =>
  v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  Object.keys(v).length === keys.length &&
  keys.every((k) => Object.hasOwn(v, k));
export function validateGolferPackage(pkg) {
  if (
    !exact(pkg, ["format", "version", "profile"]) ||
    pkg.format !== "simgolf-reborn-golfer" ||
    pkg.version !== 1 ||
    !exact(pkg.profile, ["points", "skills"])
  )
    throw Error("Unsupported golfer file.");
  validateProProfile(pkg.profile);
  return pkg;
}
export function exportGolfer(g) {
  return validateGolferPackage({
    format: "simgolf-reborn-golfer",
    version: 1,
    profile: structuredClone(g.proProfile),
  });
}
export function importGolfer(raw) {
  if (typeof raw !== "string" || raw.length > 8192)
    throw Error("Golfer file is too large.");
  return validateGolferPackage(JSON.parse(raw));
}
export function loadGolfer(g, pkg) {
  try {
    validateGolferPackage(pkg);
  } catch (error) {
    return { ok: false, message: error.message };
  }
  if (g.pro && g.pro.phase !== "finished")
    return {
      ok: false,
      message: "Finish the current round before loading a golfer.",
    };
  g.proProfile = structuredClone(pkg.profile);
  return {
    ok: true,
    message: "Saved golfer loaded. These skills apply to the next round.",
  };
}
