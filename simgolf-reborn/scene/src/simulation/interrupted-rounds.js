import { RETURN_POLICY } from "./guest-roster.js";
import { validFeeSnapshot } from "./happiness.js";
export function recordInterruption(g, v, reason) {
  g.interruptedRounds.unshift({
    id: v.roundId,
    golferId: v.id,
    name: v.name,
    reason,
    at: g.time,
    itinerary: [...v.itinerary],
    holeIndex: v.holeIndex,
    holeId: v.holeId,
    strokes: v.strokes,
    scorecard: structuredClone(v.scorecard),
    totalStrokes: v.totalStrokes,
  });
  while (g.interruptedRounds.length > 100) {
    const index = g.interruptedRounds.findLastIndex(
      (r) => !g.guests.some((p) => p.roundId === r.id),
    );
    g.interruptedRounds.splice(index, 1);
  }
  const record = g.guestRoster.find((p) => p.id === v.id);
  record.interruptedVisits = (record.interruptedVisits || 0) + 1;
  record.profile = { skills: { ...v.skills }, trained: { ...v.trained } };
  // Provisional return delay; interruption never increments completed rounds.
  record.nextVisitAt = g.time + RETURN_POLICY.unhappyDelay;
}
export function validateInterruptions(g) {
  if (!Array.isArray(g.interruptedRounds) || g.interruptedRounds.length > 100)
    throw Error("Invalid interrupted rounds.");
  const ids = new Set(),
    holes = new Set([...g.holes, ...g.retiredHoles].map((h) => h.id));
  for (const r of g.interruptedRounds) {
    const visitor = g.guestRoster.find((p) => p.id === r?.golferId);
    if (
      !r ||
      !/^round-[1-9][0-9]*$/.test(r.id) ||
      ids.has(r.id) ||
      g.rounds.some((c) => c.id === r.id) ||
      !visitor ||
      !(visitor.interruptedVisits > 0) ||
      typeof r.name !== "string" ||
      !r.name.length ||
      r.name.length > 80 ||
      !["angry", "ejected"].includes(r.reason) ||
      !Number.isFinite(r.at) ||
      r.at < 0 ||
      r.at > g.time ||
      !Array.isArray(r.itinerary) ||
      r.itinerary.length < 1 ||
      r.itinerary.length > 18 ||
      new Set(r.itinerary).size !== r.itinerary.length ||
      !r.itinerary.every((id) => holes.has(id)) ||
      !Number.isInteger(r.holeIndex) ||
      r.holeIndex < 0 ||
      r.holeIndex >= r.itinerary.length ||
      r.itinerary[r.holeIndex] !== r.holeId ||
      !holes.has(r.holeId) ||
      !Number.isInteger(r.strokes) ||
      r.strokes < 0 ||
      r.strokes > 13 ||
      !Array.isArray(r.scorecard) ||
      r.scorecard.length > r.holeIndex + 1 ||
      r.scorecard.length >= r.itinerary.length ||
      r.scorecard.some((s, i) => s?.holeId !== r.itinerary[i]) ||
      r.scorecard.some(
        (s) =>
          !s ||
          !holes.has(s.holeId) ||
          !Number.isInteger(s.strokes) ||
          s.strokes < 1 ||
          s.strokes > 13 ||
          !Number.isFinite(s.par) ||
          !Number.isFinite(s.fee) ||
          s.fee < 0 ||
          !validFeeSnapshot(s),
      ) ||
      new Set(r.scorecard.map((s) => s.holeId)).size !== r.scorecard.length ||
      r.totalStrokes !== r.scorecard.reduce((n, s) => n + s.strokes, 0)
    )
      throw Error("Invalid interrupted scorecard.");
    ids.add(r.id);
  }
  for (const v of g.guests) {
    if (v.interrupted !== undefined && typeof v.interrupted !== "boolean")
      throw Error("Invalid interruption state.");
    if (
      v.interrupted &&
      (!v.paid ||
        v.roundFinished ||
        v.shot ||
        !["departing", "departed"].includes(v.phase) ||
        !g.interruptedRounds.some(
          (r) =>
            r.id === v.roundId &&
            r.golferId === v.id &&
            JSON.stringify(r.scorecard) === JSON.stringify(v.scorecard),
        ))
    )
      throw Error("Invalid interrupted visitor.");
    if (v.phase === "departing" && !v.interrupted)
      throw Error("Missing interruption state.");
  }
}
