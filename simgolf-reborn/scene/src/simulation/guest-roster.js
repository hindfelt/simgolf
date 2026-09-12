// Temporary live-actor ceiling, separate from the future membership/invitation pool.
export const MAX_ACTIVE_VISITORS = 12;
// Shared admission/tee gate. Count swings, never penalty strokes. Old saves
// without physical-shot observations release conservatively on completion.
export function hasClearedTee(v, holeId) {
  return (
    v.interrupted ||
    v.phase === "angry" ||
    v.scorecard.some((s) => s.holeId === holeId) ||
    (v.holeReactions?.holeId === holeId && v.holeReactions.shots >= 2)
  );
}
export function firstHoleReadyForArrivals(g) {
  const first = g.holes.find((h) => h.open);
  if (!first || g.guests.length + 2 > MAX_ACTIVE_VISITORS) return false;
  return g.guests.every(
    (v) => v.itinerary[0] !== first.id || hasClearedTee(v, first.id),
  );
}
// Return cadence and mood cutoff are provisional; original values need measurement.
export const RETURN_POLICY = Object.freeze({
  delay: 120,
  unhappyDelay: 240,
  minimumMood: 60,
});
export function returningGuest(g) {
  return (
    g.guestRoster
      .filter(
        (p) =>
          p.profile &&
          p.nextVisitAt !== null &&
          p.nextVisitAt <= g.time &&
          !g.guests.some((v) => v.id === p.id),
      )
      .sort((a, b) => a.nextVisitAt - b.nextVisitAt || a.id - b.id)[0] || null
  );
}
export function migrateReturnProfiles(g) {
  for (const p of g.guestRoster) {
    const v = g.guests.find((v) => v.id === p.id);
    p.profile = v
      ? { skills: { ...v.skills }, trained: { ...v.trained } }
      : null;
    p.nextVisitAt = null;
    if (v?.roundFinished && v.mood >= RETURN_POLICY.minimumMood)
      p.nextVisitAt = g.time + RETURN_POLICY.delay;
  }
}
export function rememberGuest(g, v) {
  if (v.pro) return;
  let record = g.guestRoster.find((p) => p.id === v.id);
  if (!record) {
    record = {
      id: v.id,
      name: v.name,
      rounds: 0,
      lastRoundId: null,
      best: null,
      profile: null,
      nextVisitAt: null,
    };
    g.guestRoster.push(record);
  }
  if (v.skills)
    record.profile = { skills: { ...v.skills }, trained: { ...v.trained } };
  if (!v.roundFinished) record.nextVisitAt = null;
  if (v.roundFinished && record.lastRoundId !== v.roundId) {
    record.nextVisitAt = record.profile
      ? g.time +
        (v.mood >= RETURN_POLICY.minimumMood
          ? RETURN_POLICY.delay
          : RETURN_POLICY.unhappyDelay)
      : null;
    record.rounds++;
    record.lastRoundId = v.roundId;
    const score = {
      strokes: v.totalStrokes,
      par: v.scorecard.reduce((sum, h) => sum + h.par, 0),
      holes: v.scorecard.length,
    };
    if (
      !record.best ||
      score.strokes - score.par < record.best.strokes - record.best.par
    )
      record.best = score;
  }
}
export function migrateGuestRoster(g) {
  g.guestRoster = [];
  // Older saves retain only their latest 100 rounds. Preserve that evidence;
  // do not invent visitors or results already discarded by the old build.
  for (const round of [...(g.rounds || [])].reverse()) {
    if (round.pro) continue;
    rememberGuest(g, {
      ...round,
      id: round.golferId,
      roundId: round.id,
      roundFinished: true,
    });
  }
  for (const v of g.guests || []) rememberGuest(g, v);
}
export function validateGuestRoster(g) {
  if (!Array.isArray(g.guestRoster) || g.guestRoster.length > 100000)
    throw Error("Invalid golfer roster.");
  const ids = new Set();
  for (const p of g.guestRoster) {
    if (
      !p ||
      !Number.isSafeInteger(p.id) ||
      p.id < 1 ||
      p.id >= g.nextId ||
      ids.has(p.id) ||
      typeof p.name !== "string" ||
      !p.name.length ||
      p.name.length > 80 ||
      (p.nextVisitAt !== null &&
        (!Number.isFinite(p.nextVisitAt) ||
          p.nextVisitAt < 0 ||
          !p.profile ||
          (p.rounds < 1 && !(p.interruptedVisits > 0)))) ||
      (p.profile !== null &&
        (!p.profile ||
          !p.profile.skills ||
          !p.profile.trained ||
          Object.keys(p.profile.skills).sort().join(",") !==
            "accuracy,imagination,length" ||
          Object.values(p.profile.skills).some((v) => typeof v !== "boolean") ||
          Object.entries(p.profile.trained).some(
            ([k, v]) =>
              !["length", "accuracy", "imagination"].includes(k) ||
              v !== true ||
              !p.profile.skills[k],
          ))) ||
      (p.interruptedVisits !== undefined &&
        (!Number.isSafeInteger(p.interruptedVisits) ||
          p.interruptedVisits < 0)) ||
      !Number.isSafeInteger(p.rounds) ||
      p.rounds < 0 ||
      (p.rounds === 0
        ? p.lastRoundId !== null || p.best !== null
        : typeof p.lastRoundId !== "string" ||
          !/^round-\d+$/.test(p.lastRoundId) ||
          !p.best ||
          !Number.isSafeInteger(p.best.holes) ||
          p.best.holes < 1 ||
          p.best.holes > 18 ||
          !Number.isSafeInteger(p.best.strokes) ||
          p.best.strokes < p.best.holes ||
          p.best.strokes > p.best.holes * 12 ||
          !Number.isSafeInteger(p.best.par) ||
          p.best.par < p.best.holes ||
          p.best.par > p.best.holes * 6)
    )
      throw Error("Invalid golfer roster record.");
    ids.add(p.id);
  }
  for (const v of g.guests) {
    const p = g.guestRoster.find((p) => p.id === v.id);
    if (
      !p ||
      p.name !== v.name ||
      (v.roundFinished && p.lastRoundId !== v.roundId)
    )
      throw Error("Golfer roster does not match visiting golfers.");
  }
}
