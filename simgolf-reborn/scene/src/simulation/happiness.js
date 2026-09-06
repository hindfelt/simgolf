// Original fee unit and +/-1 comments: Sid Meier's archived fun-rating notes.
// Mapping the prototype mood to starting points and incident deduplication are provisional.
export const FEE_PER_HAPPINESS = 100;
// Manual p.20 establishes the bonus, but not its amount. Provisional calibration.
export const AIRSTRIP_FEE_RATE = 0.25;
export function initialHappiness(mood) {
  return Math.max(2, Math.min(5, Math.round(mood / 20)));
}
export function happinessReaction(v, incident, delta) {
  if (v.pro || v.paid) return false;
  v.happiness ??= initialHappiness(v.mood);
  v.happinessReactions ??= [];
  if (v.happinessReactions.includes(incident)) return false;
  v.happinessReactions.push(incident);
  if (v.holeReactions?.holeId === v.holeId)
    v.holeReactions[delta > 0 ? "positive" : "negative"]++;

  v.happiness = Math.max(0, v.happiness + delta);
  return true;
}
export function greenFee(v) {
  return v.pro ? 0 : v.happiness * FEE_PER_HAPPINESS;
}
export function airstripFeeBonus(v, connectedAirstrip) {
  return connectedAirstrip ? Math.round(greenFee(v) * AIRSTRIP_FEE_RATE) : 0;
}
export function validateHappiness(v) {
  if (v.pro) return;
  if (
    (v.holeReactions !== undefined &&
      (!v.holeReactions ||
        v.holeReactions.holeId !== v.holeId ||
        ![
          v.holeReactions.positive,
          v.holeReactions.negative,
          v.holeReactions.shots,
        ].every((n) => Number.isSafeInteger(n) && n >= 0 && n <= 1024))) ||
    !Number.isSafeInteger(v.happiness) ||
    v.happiness < 0 ||
    v.happiness > 10000 ||
    !Array.isArray(v.happinessReactions) ||
    v.happinessReactions.length > 1024 ||
    v.happinessReactions.some((k) => typeof k !== "string" || k.length > 80) ||
    new Set(v.happinessReactions).size !== v.happinessReactions.length
  )
    throw Error("Invalid golfer happiness.");
}

export function validFeeSnapshot(s) {
  const bonus = s.airstripBonus ?? 0;
  if (!Number.isSafeInteger(bonus) || bonus < 0) return false;
  if (s.happiness === undefined) return bonus === 0;
  const base = s.happiness * FEE_PER_HAPPINESS;
  return (
    Number.isSafeInteger(s.happiness) &&
    s.happiness >= 0 &&
    s.happiness <= 10000 &&
    (bonus === 0 || bonus === Math.round(base * AIRSTRIP_FEE_RATE)) &&
    s.fee === base + bonus
  );
}

// Provisional great-shot recognition: a clean approach of at least 40 yards
// that holds the golfer's own green. Exact original snap-shot criteria are unknown.
export function appreciateApproach(v, shot, ownGreen) {
  if (
    !ownGreen ||
    shot.putt ||
    shot.obstruction ||
    shot.waterLanding ||
    Math.hypot(v.ball.x - shot.from.x, v.ball.z - shot.from.z) < 10
  )
    return false;
  if (!happinessReaction(v, `great-shot:${v.holeId}`, 1)) return false;
  v.comment = "What a lovely approach! Right onto the green.";
  return true;
}
