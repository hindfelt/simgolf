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
test("missing comparisons remain unclassified; three qualifying skills drop the weakest below one", () => {
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
  expect(classifyHole(report([0.75, 0.75, 0.75])).name).toBe("Strategic");
  expect(classifyHole(report([0.5, 0.5, 0.5])).name).toBe("Strategic");
});

test("weakest skill removal, stable ties and inclusive difficulty thresholds follow executable", () => {
  const direct = values => ({skills: ["length", "accuracy", "imagination"].map((skill,i) => ({skill, advantage: values[i]}))});
  expect(classifyHole(direct([0.8,0.6,0.9])).name).toBe("Heroic");
  expect(classifyHole(direct([0.8,0.9,0.6])).name).toBe("Challenge");
  expect(classifyHole(direct([0.5,0.5,0])).name).toBe("Challenge");
  expect(classifyHole(direct([0.25,0.25,0]), {difficulty:0}).name).toBe("Challenge");
  expect(classifyHole(direct([0.25,0.25,0]), {difficulty:1}).name).toBe("Breather");
  expect(classifyHole(direct([1,1,0.999])).name).toBe("Challenge");
  expect(classifyHole(direct([1,1,1])).name).toBe("Classic");
});
