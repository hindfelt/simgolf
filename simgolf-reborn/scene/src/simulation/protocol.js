export const PROTOCOL_VERSION = 81;
export const RULESET_VERSION = "aircraft-visits-2026-09-12";
export const PRE_AIRCRAFT_RULESET = "club-day-cycle-2026-09-12";
export const PRE_DAY_CYCLE_RULESET = "original-signed-happiness-2026-09-12";
export const PRE_SIGNED_HAPPINESS_RULESET = "original-airstrip-fee-2026-09-12";
// Golf-only packages/replays from before post-round tennis use identical shot rules.
export const PRE_TENNIS_RULESET = "prototype-boundary-regions-2026-09-10";
export const PRE_AIRSTRIP_RULESET = "prototype-marina-activity-2026-09-11";
export const PRE_MARINA_RULESET = "prototype-tennis-visits-2026-09-11";
export const compatibleGolfRuleset = value => value===RULESET_VERSION || value===PRE_AIRCRAFT_RULESET || value===PRE_DAY_CYCLE_RULESET || value===PRE_SIGNED_HAPPINESS_RULESET || value===PRE_TENNIS_RULESET || value===PRE_MARINA_RULESET || value===PRE_AIRSTRIP_RULESET;
export const TICK_SECONDS = 0.05;
export const MAX_CLIENTS = 64;

export function createProtocol() {
  return {
    version: PROTOCOL_VERSION,
    ruleset: RULESET_VERSION,
    tick: 0,
    revision: 0,
    clients: [],
  };
}

// Canonical JSON is also used to distinguish a retry from a reused sequence number.
export function canonical(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string")
    return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value))
    return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`)
      .join(",")}}`;
  throw Error("Commands must contain only finite JSON values.");
}
export function validateProtocol(p) {
  if (
    !p ||
    p.version !== PROTOCOL_VERSION ||
    p.ruleset !== RULESET_VERSION ||
    !Number.isSafeInteger(p.tick) ||
    p.tick < 0 ||
    !Number.isSafeInteger(p.revision) ||
    p.revision < 0 ||
    !Array.isArray(p.clients) ||
    p.clients.length > MAX_CLIENTS
  )
    throw Error("Unsupported command state in save.");
  const ids = new Set();
  for (const c of p.clients) {
    if (
      !c ||
      typeof c.id !== "string" ||
      !/^[a-zA-Z0-9_-]{1,64}$/.test(c.id) ||
      ids.has(c.id) ||
      !Number.isSafeInteger(c.sequence) ||
      c.sequence < 1 ||
      typeof c.fingerprint !== "string" ||
      c.fingerprint.length > 4096 ||
      !c.result ||
      typeof c.result.ok !== "boolean" ||
      typeof c.result.message !== "string" ||
      !Number.isSafeInteger(c.result.revision) ||
      c.result.revision < 0 ||
      c.result.revision > p.revision
    )
      throw Error("Invalid command receipt in save.");
    ids.add(c.id);
  }
}

export function migrateProtocol(p) {
  if (
    (p?.version === 80 && p.ruleset === PRE_AIRCRAFT_RULESET) ||
    (p?.version === 79 && p.ruleset === PRE_DAY_CYCLE_RULESET) ||
    (p?.version === 78 && p.ruleset === PRE_SIGNED_HAPPINESS_RULESET) ||
    (p?.version === 77 && p.ruleset === PRE_AIRSTRIP_RULESET) ||
    (p?.version === 76 && p.ruleset === PRE_MARINA_RULESET) ||
    (p?.version === 75 && p.ruleset === "prototype-boundary-regions-2026-09-10") ||
    (p?.version === 74 && p.ruleset === "prototype-dogleg-routing-2026-09-10") ||
    (p?.version === 73 && p.ruleset === "prototype-boundary-entry-2026-09-09") ||
    (p?.version === 72 && p.ruleset === "prototype-helicopter-visits-2026-09-09") ||
    (p?.version === 71 && p.ruleset === "prototype-boundary-drop-2026-09-09") ||
    (p?.version === 70 && p.ruleset === "prototype-trunk-ground-roll-2026-09-09") ||
    (p?.version === 69 && p.ruleset === "prototype-scenery-collisions-2026-09-09") ||
    (p?.version === 68 && p.ruleset === "prototype-lighthouse-2026-09-09") ||
    (p?.version === 67 &&
      p.ruleset === "prototype-coastal-islands-2026-09-09") ||
    (p?.version === 66 &&
      p.ruleset === "prototype-editable-scenery-trees-2026-09-06") ||
    (p?.version === 65 && p.ruleset === "prototype-links-church-2026-09-06") ||
    (p?.version === 64 &&
      p.ruleset === "prototype-coastal-presentation-2026-09-06") ||
    (p?.version === 63 &&
      p.ruleset === "prototype-coastal-terrain-2026-09-06") ||
    (p?.version === 62 && p.ruleset === "prototype-home-sales-2026-09-06") ||
    (p?.version === 61 && p.ruleset === "prototype-airstrip-fees-2026-09-06") ||
    (p?.version === 60 &&
      p.ruleset === "prototype-transport-buildings-2026-09-06") ||
    (p?.version === 59 &&
      p.ruleset === "prototype-course-environments-2026-09-06") ||
    (p?.version === 58 &&
      p.ruleset === "prototype-regional-recreation-2026-09-06") ||
    (p?.version === 57 && p.ruleset === "prototype-swim-club-2026-09-06") ||
    (p?.version === 56 &&
      p.ruleset === "prototype-returning-stories-2026-09-06") ||
    (p?.version === 55 &&
      p.ruleset === "prototype-crossed-surface-roll-2026-09-06") ||
    (p?.version === 54 &&
      p.ruleset === "prototype-land-purchases-2026-09-06") ||
    (p?.version === 53 && p.ruleset === "prototype-marshalls-2026-09-06") ||
    (p?.version === 52 && p.ruleset === "prototype-angry-golfers-2026-09-06") ||
    (p?.version === 51 &&
      p.ruleset === "prototype-interrupted-rounds-2026-09-06") ||
    (p?.version === 50 &&
      p.ruleset === "prototype-staff-upgrades-2026-09-06") ||
    (p?.version === 49 &&
      p.ruleset === "prototype-refreshment-consultant-2026-09-06") ||
    (p?.version === 48 && p.ruleset === "prototype-celebrity-2026-09-06") ||
    (p?.version === 47 && p.ruleset === "prototype-club-pro-2026-09-06") ||
    (p?.version === 46 &&
      p.ruleset === "prototype-cart-pickup-routing-2026-09-06") ||
    (p?.version === 45 && p.ruleset === "prototype-cart-parking-2026-09-06") ||
    (p?.version === 44 && p.ruleset === "prototype-golf-carts-2026-09-06") ||
    (p?.version === 43 &&
      p.ruleset === "prototype-staff-capacity-2026-09-06") ||
    (p?.version === 42 && p.ruleset === "prototype-rangers-2026-09-06") ||
    (p?.version === 41 && p.ruleset === "prototype-steep-paths-2026-09-06") ||
    (p?.version === 40 && p.ruleset === "prototype-path-stamina-2026-09-06") ||
    (p?.version === 39 &&
      p.ruleset === "prototype-design-accomplishments-2026-09-06") ||
    (p?.version === 38 &&
      p.ruleset === "prototype-course-accomplishments-2026-09-06") ||
    (p?.version === 37 &&
      p.ruleset === "prototype-complaint-dandelions-2026-09-06") ||
    (p?.version === 36 &&
      p.ruleset === "prototype-membership-applications-2026-09-06") ||
    (p?.version === 35 &&
      p.ruleset === "prototype-appearance-editing-2026-09-06") ||
    (p?.version === 34 &&
      p.ruleset === "prototype-visitor-appearance-2026-09-06") ||
    (p?.version === 33 && p.ruleset === "prototype-personalities-2026-09-06") ||
    (p?.version === 32 &&
      p.ruleset === "prototype-visitor-pairing-2026-09-06") ||
    (p?.version === 31 && p.ruleset === "prototype-visitor-pool-2026-09-06") ||
    (p?.version === 30 && p.ruleset === "prototype-tee-spacing-2026-09-06") ||
    (p?.version === 29 &&
      p.ruleset === "prototype-first-hole-arrivals-2026-09-06") ||
    (p?.version === 28 && p.ruleset === "prototype-comment-fun-2026-09-06") ||
    (p?.version === 27 &&
      p.ruleset === "prototype-approach-reactions-2026-09-06") ||
    (p?.version === 26 &&
      p.ruleset === "prototype-happiness-fees-2026-09-06") ||
    (p?.version === 25 &&
      p.ruleset === "prototype-course-skill-caps-2026-09-06") ||
    (p?.version === 24 &&
      p.ruleset === "prototype-free-elevation-2026-09-06") ||
    (p?.version === 23 &&
      p.ruleset === "prototype-visitor-shot-shapes-2026-09-06") ||
    (p?.version === 22 &&
      p.ruleset === "prototype-returning-guests-2026-09-06") ||
    (p?.version === 21 && p.ruleset === "prototype-guest-roster-2026-09-06") ||
    (p?.version === 20 && p.ruleset === "prototype-story-reward-2026-09-05") ||
    (p?.version === 1 && p.ruleset === "prototype-2026-09-05") ||
    (p?.version === 2 && p.ruleset === "prototype-multihole-2026-09-05") ||
    (p?.version === 3 && p.ruleset === "prototype-green-edit-2026-09-05") ||
    (p?.version === 4 && p.ruleset === "prototype-terrain-2026-09-05") ||
    (p?.version === 5 && p.ruleset === "prototype-pro-skills-2026-09-05") ||
    (p?.version === 6 && p.ruleset === "prototype-maintenance-2026-09-05") ||
    (p?.version === 7 && p.ruleset === "prototype-training-2026-09-05") ||
    (p?.version === 8 && p.ruleset === "prototype-trees-2026-09-05") ||
    (p?.version === 9 && p.ruleset === "prototype-vendors-2026-09-05") ||
    (p?.version === 10 && p.ruleset === "prototype-tennis-2026-09-05") ||
    (p?.version === 11 && p.ruleset === "prototype-paths-2026-09-05") ||
    (p?.version === 12 && p.ruleset === "prototype-ballwasher-2026-09-05") ||
    (p?.version === 13 && p.ruleset === "prototype-landforming-2026-09-05") ||
    (p?.version === 14 &&
      p.ruleset === "prototype-bridge-removal-2026-09-05") ||
    (p?.version === 15 &&
      p.ruleset === "prototype-starting-bridge-2026-09-05") ||
    (p?.version === 16 &&
      p.ruleset === "prototype-pro-ballwasher-2026-09-05") ||
    (p?.version === 17 && p.ruleset === "prototype-flowers-2026-09-05") ||
    (p?.version === 18 && p.ruleset === "prototype-hotel-2026-09-05") ||
    (p?.version === 19 && p.ruleset === "prototype-stories-2026-09-05")
  ) {
    validateProtocol({
      ...p,
      version: PROTOCOL_VERSION,
      ruleset: RULESET_VERSION,
    });
    p.version = PROTOCOL_VERSION;
    p.ruleset = RULESET_VERSION;
    p.clients = [];
  }
}
