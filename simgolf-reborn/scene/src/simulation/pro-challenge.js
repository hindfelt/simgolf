import { createCompetition, restoreCompetition } from "./competition.js";

// Advertised invitation stakes, golf.exe 0x40fd5b–0x40fde4.
// The zero-based ladder counter increments when an invitation is accepted.
// This is the offer calculation, not proof of the original cash settlement.
export function originalChallengeOfferStakes(completedLevels = 0) {
  const level = completedLevels + 1;
  if (!Number.isSafeInteger(completedLevels) || completedLevels < 0 ||
      !Number.isSafeInteger(level * 4000))
    throw Error("Invalid challenge level.");
  return { perHole: level * 2000, match: level * 4000 };
}

// Exhibition callers can supply their own stakes.
// Original 0x426fab–0x426fe3 sums hole scores for the match comparison.
// Exhibition payouts honor the agreed terms; original cash timing remains open.
function validateTerms(terms) {
  if (
    !terms ||
    Object.keys(terms).sort().join(",") !== "match,perHole" ||
    ![terms.match, terms.perHole].every(
      (v) => Number.isSafeInteger(v) && v >= 0 && v <= 1000000,
    )
  )
    throw Error("Invalid challenge stakes.");
  return { perHole: terms.perHole, match: terms.match };
}
function wrap(host, residentId, challengerId, terms) {
  const stakes = validateTerms(terms);
  function snapshot() {
    const event = host.snapshot();
    const resident = host.roundSnapshot(residentId).pro;
    const challenger = host.roundSnapshot(challengerId).pro;
    const holes = resident.scorecard.flatMap((a) => {
      const b = challenger.scorecard.find((b) => b.holeId === a.holeId);
      if (!b) return [];
      const result = Math.sign(b.strokes - a.strokes);
      return [
        {
          holeId: a.holeId,
          number: a.number,
          residentStrokes: a.strokes,
          challengerStrokes: b.strokes,
          winner: result > 0 ? residentId : result < 0 ? challengerId : null,
          residentAmount: result * stakes.perHole,
        },
      ];
    });
    const complete = event.status === "complete";
    const result = complete
      ? Math.sign(challenger.totalStrokes - resident.totalStrokes)
      : 0;
    const matchAmount = result * stakes.match;
    const residentNet =
      holes.reduce((sum, h) => sum + h.residentAmount, 0) + matchAmount;
    return {
      ...event,
      kind: "pro-challenge",
      residentId,
      challengerId,
      stakes: { ...stakes },
      holes,
      matchAmount: complete ? matchAmount : null,
      residentNet,
      challengerNet: -residentNet,
      settled: complete,
    };
  }
  return Object.freeze({
    nextCommand: host.nextCommand,
    execute: host.execute,
    stepTicks: host.stepTicks,
    roundSnapshot: host.roundSnapshot,
    snapshot,
    save: () =>
      JSON.stringify({
        format: "simgolf-reborn-pro-challenge",
        version: 1,
        residentId,
        challengerId,
        stakes,
        event: host.save(),
      }),
  });
}
export async function createProChallenge({
  id,
  course,
  resident,
  challenger,
  stakes,
  seed = 2002,
}) {
  const terms = validateTerms(stakes);
  const residentId = resident?.id,
    challengerId = challenger?.id;
  const host = await createCompetition({
    id,
    course,
    entrants: [resident, challenger],
    rounds: 1,
    seed,
  });
  return wrap(host, residentId, challengerId, terms);
}
export async function restoreProChallenge(raw) {
  if (typeof raw !== "string" || raw.length > 64000000)
    throw Error("Invalid challenge save.");
  const d = JSON.parse(raw);
  if (
    !d ||
    Object.keys(d).sort().join(",") !==
      "challengerId,event,format,residentId,stakes,version" ||
    d.format !== "simgolf-reborn-pro-challenge" ||
    d.version !== 1
  )
    throw Error("Invalid challenge save.");
  const terms = validateTerms(d.stakes),
    host = await restoreCompetition(d.event),
    s = host.snapshot();
  if (
    s.rounds !== 1 ||
    s.standings.length !== 2 ||
    d.residentId === d.challengerId ||
    ![d.residentId, d.challengerId].every((id) =>
      s.standings.some((p) => p.id === id),
    )
  )
    throw Error("Invalid challenge participants.");
  return wrap(host, d.residentId, d.challengerId, terms);
}
