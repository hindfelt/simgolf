import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  openHole,
  update,
  serialize,
  restore,
} from "../src/simulation/game.js";
import { hasClearedTee } from "../src/simulation/guest-roster.js";
function course() {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 40, 2);
  openHole(g);
  return g;
}
test("a following pair starts while the first pair is still playing the same hole", () => {
  const g = course();
  let overlap = false;
  for (let i = 0; i < 8000; i++) {
    update(g, 0.05);
    const playing = g.guests.filter(
      (v) => !v.scorecard.length && v.holeReactions.shots > 0,
    );
    const pairs = [...new Set(playing.map((v) => v.pair))];
    if (pairs.length < 2) continue;
    const previous = g.guests.filter((v) => v.pair === pairs[0]);
    expect(previous.every((v) => hasClearedTee(v, g.holes[0].id))).toBe(true);
    overlap = true;
    break;
  }
  expect(overlap).toBe(true);
  const loaded = restore(serialize(g));
  for (let i = 0; i < 1200; i++) {
    update(g, 0.05);
    update(loaded, 0.05);
  }
  expect(serialize(loaded)).toBe(serialize(g));
  expect(g.stats.holesCompleted).toBeGreaterThan(0);
});
test("completion releases a tee even after a hole in one; penalties and old missing counters do not", () => {
  const v = {
    strokes: 3,
    scorecard: [],
    holeReactions: { holeId: "hole-1", shots: 1 },
  };
  expect(hasClearedTee(v, "hole-1")).toBe(false);
  v.holeReactions.shots = 2;
  expect(hasClearedTee(v, "hole-1")).toBe(true);
  expect(hasClearedTee(v, "hole-2")).toBe(false);
  delete v.holeReactions;
  expect(hasClearedTee(v, "hole-1")).toBe(false);
  v.scorecard.push({ holeId: "hole-1", strokes: 1 });
  expect(hasClearedTee(v, "hole-1")).toBe(true);
});
