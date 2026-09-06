import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  openHole,
  update,
  serialize,
  restore,
} from "../src/simulation/game.js";
import {
  beginObservation,
  recordObservation,
  evaluationReport,
  validateEvaluation,
  newEvaluation,
} from "../src/simulation/evaluation.js";
import { happinessReaction } from "../src/simulation/happiness.js";
test("two positive comments and one negative over four shots contribute 25 percent fun", () => {
  const g = { time: 0 },
    hole = {
      id: "hole-1",
      stats: { completed: 1, strokes: 5, evaluation: newEvaluation() },
    };
  const v = {
    pro: false,
    holeId: hole.id,
    strokes: 0,
    skills: {},
    happiness: 3,
    mood: 70,
    happinessReactions: [],
    holeReactions: { holeId: hole.id, positive: 0, negative: 0, shots: 0 },
  };
  beginObservation(g, v);
  happinessReaction(v, "flowers", 1);
  happinessReaction(v, "approach", 1);
  happinessReaction(v, "wait", -1);
  happinessReaction(v, "wait", -1);
  v.strokes = 5;
  v.holeReactions.shots = 4;
  g.time = 12;
  recordObservation(g, v, hole);
  expect(evaluationReport(hole).fun).toBe(0.25);
  expect(evaluationReport(hole).funCount).toBe(1);
  validateEvaluation(hole.stats);
  hole.stats.evaluation.cohorts[0].fun.count = 2;
  expect(() => validateEvaluation(hole.stats)).toThrow();
});
test("legacy observations have no fabricated fun and new real rounds persist their samples", () => {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 22, 10);
  openHole(g);
  for (let i = 0; i < 2400; i++) update(g, 0.05);
  const report = evaluationReport(g.holes[0]);
  expect(report.funCount).toBe(g.holes[0].stats.completed);
  expect(report.fun).not.toBeNull();
  const copy = restore(serialize(g));
  for (let i = 0; i < 400; i++) {
    update(g, 0.05);
    update(copy, 0.05);
  }
  expect(serialize(copy)).toBe(serialize(g));
  for (const group of Object.values(copy.holes[0].stats.evaluation.cohorts))
    delete group.fun;
  expect(evaluationReport(copy.holes[0]).fun).toBeNull();
});
