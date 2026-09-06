import { test, expect } from "@playwright/test";
import { classifyHole } from "../src/simulation/hole-classification.js";
import { evaluationReport } from "../src/simulation/evaluation.js";
function report(advantages) {
  const cohorts = {};
  for (let mask = 0; mask < 8; mask++) {
    const score =
      6 - advantages.reduce((n, a, i) => n + (mask & (1 << i) ? a : 0), 0);
    cohorts[mask] = {
      count: 100,
      strokes: score * 100,
      seconds: 1000,
      mood: 5000,
    };
  }
  return evaluationReport({ stats: { evaluation: { cohorts } } });
}
for (const [name, ratings] of [
  ["Breather", [0, 0, 0]],
  ["Freeway", [0.75, 0, 0]],
  ["Precise", [0, 0.75, 0]],
  ["Creative", [0, 0, 0.75]],
  ["Challenge", [0.75, 0.75, 0]],
  ["Heroic", [0.75, 0, 0.75]],
  ["Strategic", [0, 0.75, 0.75]],
  ["Classic", [1, 1, 1]],
])
  test(`${name} follows the observed scoring differences`, () => {
    const r = report(ratings);
    expect(classifyHole(r).name).toBe(name);
    expect(r.skills.map((s) => s.advantage)).toEqual(ratings);
  });
test("missing comparisons and ambiguous three-skill thresholds do not fabricate a classification", () => {
  expect(
    classifyHole(
      evaluationReport({
        stats: {
          evaluation: {
            cohorts: { 0: { count: 1, strokes: 4, seconds: 20, mood: 70 } },
          },
        },
      }),
    ).name,
  ).toBeNull();
  expect(classifyHole(report([0.75, 0.75, 0.75])).name).toBeNull();
  expect(classifyHole(report([0.5, 0.5, 0.5])).name).toBe("Breather");
});
