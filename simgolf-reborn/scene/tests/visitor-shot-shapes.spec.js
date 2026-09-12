import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  openHole,
  update,
  shotLimit,
  serialize,
  restore,
} from "../src/simulation/game.js";
import { cellAt, key } from "../src/simulation/world.js";
function setup(imagination) {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 36, 5);
  openHole(g);
  while (!g.guests.length) update(g, 0.05);
  const v = g.guests[0];
  v.skills = { length: false, accuracy: false, imagination };
  v.phase = "address";
  v.wait = 2;
  v.path = [];
  v.pos = { ...v.ball };
  const cup = g.holes[0].green,
    d = Math.hypot(cup.x - v.ball.x, cup.z - v.ball.z),
    range = shotLimit(g, v);
  const c = cellAt(
    v.ball.x + ((cup.x - v.ball.x) / d) * range * 0.45,
    v.ball.z + ((cup.z - v.ball.z) / d) * range * 0.45,
  );
  g.tiles[key(c.c, c.r)] = { type: "tree" };
  return g;
}
test("Imagination changes a real visitor shot to a clear curved flight, without extra live RNG draws", () => {
  const ordinary = setup(false),
    imaginative = setup(true);
  update(ordinary, 0.05);
  update(imaginative, 0.05);
  expect(ordinary.guests[0].shot.curve).toBe(0);
  expect(ordinary.guests[0].shot.obstruction).toBeTruthy();
  expect(Math.abs(imaginative.guests[0].shot.curve)).toBeGreaterThan(0);
  expect(imaginative.guests[0].shot.obstruction).toBeUndefined();
  expect(imaginative.guests[0].shot.waterLanding).toBe(false);
  expect(imaginative.rng).toBe(ordinary.rng);
  expect(imaginative.guests[0].strokes).toBe(1);
});
test("visitor shot decisions and their later round resume identically", () => {
  const g = setup(true),
    loaded = restore(serialize(g));
  for (let i = 0; i < 1800; i++) {
    update(g, 0.05);
    update(loaded, 0.05);
  }
  expect(serialize(loaded)).toBe(serialize(g));
  expect(g.stats.holesCompleted).toBeGreaterThan(0);
});
