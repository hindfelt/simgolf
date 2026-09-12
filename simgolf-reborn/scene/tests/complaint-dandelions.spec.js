import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  openHole,
  update,
  serialize,
  restore,
  tile,
} from "../src/simulation/game.js";
import { cellAt, key } from "../src/simulation/world.js";
function tired() {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 36, 5);
  openHole(g);
  while (!g.guests.length) update(g, 0.05);
  g.weeds = [];
  g.weedRevision++;
  g.nextWeed = 10000;
  g.weedRng = 0;
  const v = g.guests[0];
  v.energy = 29;
  v.pos = { x: 12, z: 12 };
  v.phase = "address";
  v.path = [];
  v.wait = -100;
  v.seenWeeds = [];
  return { g, v };
}
test("one distinct complaint creates local dandelions without repeating each frame or consuming shot RNG", () => {
  const { g, v } = tired(),
    rng = g.rng;
  update(g, 0.05);
  expect(g.weeds).toHaveLength(1);
  expect(g.rng).toBe(rng);
  const w = g.weeds[0],
    origin = cellAt(v.pos.x, v.pos.z);
  expect(Math.abs(w.c - origin.c)).toBeLessThanOrEqual(3);
  expect(Math.abs(w.r - origin.r)).toBeLessThanOrEqual(3);
  expect(["rough", "fairway", "firm"]).toContain(tile(g, w.c, w.r));
  expect(v.seenWeeds).toContain(w.id);
  const seed = g.weedRng;
  for (let i = 0; i < 20; i++) update(g, 0.05);
  expect(g.weeds).toHaveLength(1);
  expect(g.weedRng).toBe(seed);
  const loaded = restore(serialize(g));
  for (let i = 0; i < 1200; i++) {
    update(g, 0.05);
    update(loaded, 0.05);
  }
  expect(serialize(loaded)).toBe(serialize(g));
});
test("water around a complaining golfer cannot grow dandelions", () => {
  const { g, v } = tired(),
    origin = cellAt(v.pos.x, v.pos.z);
  for (let dc = -3; dc <= 3; dc++)
    for (let dr = -3; dr <= 3; dr++)
      g.tiles[key(origin.c + dc, origin.r + dr)] = { type: "water" };
  update(g, 0.05);
  expect(g.weeds).toEqual([]);
  expect(v.happinessReactions).toContain("tired:" + v.holeId);
});
