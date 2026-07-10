import { ApiError } from './http';
import type { SubmittedRound } from './schemas';

export interface RoundExpectation {
  source: SubmittedRound['source'];
  courseHash: string;
  holes: number;
  par: number;
}

/** Structural scorecard validation shared by scheduled events and head-to-head
 * challenges. This proves internal consistency, not authoritative shot physics. */
export function validateRoundTotals(round: SubmittedRound, expected: RoundExpectation) {
  const cardPar = round.card.reduce((sum, hole) => sum + hole.par, 0);
  const cardStrokes = round.card.reduce((sum, hole) => sum + hole.strokes, 0);
  const cardPenalties = round.card.reduce((sum, hole) => sum + hole.penalties, 0);
  const scoredHoles = round.eagles + round.birdies + round.pars + round.bogeys;
  if (
    round.source !== expected.source ||
    round.courseHash !== expected.courseHash ||
    round.holesPlayed !== expected.holes ||
    round.par !== expected.par ||
    round.card.length !== round.holesPlayed ||
    cardPar !== round.par ||
    cardStrokes !== round.strokes ||
    cardPenalties !== round.penalties ||
    round.scoreToPar !== round.strokes - round.par ||
    scoredHoles !== round.holesPlayed ||
    round.completedAt <= round.startedAt ||
    Math.abs(round.durationSeconds - Math.round((round.completedAt - round.startedAt) / 1000)) > 2 ||
    round.card.some((hole, index) => hole.hole !== index + 1 || hole.relative !== hole.strokes - hole.par)
  ) throw new ApiError(422, 'invalid_scorecard', 'The scorecard totals or course identity do not match.');
}
