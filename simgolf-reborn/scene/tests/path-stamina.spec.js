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
import { center, key } from "../src/simulation/world.js";
function course(surface = "rough", rested = false) {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 36, 5);
  openHole(g);
  while (!g.guests.length) update(g, 0.05);
  for (let c = 25; c <= 32; c++) {
    if (surface === "bridge") expect(build(g, "water", c, 20).ok).toBe(true);
    expect(build(g, surface, c, 20).ok).toBe(true);
  }
  const v = g.guests[0];
  v.pos = center(25, 20);
  v.path = [center(32, 20)];
  v.phase = "walking";
  v.afterWalk = "address";
  v.energy = 60;
  v.wellRested = rested;
  return { g, v };
}
test("real walking on constructed paths preserves more energy over the same distance, including rested visitors", () => {
  for (const rested of [false, true]) {
    const a = course("rough", rested),
      b = course("path", rested);
    for (let i = 0; i < 40; i++) {
      update(a.g, 0.05);
      update(b.g, 0.05);
    }
    expect(a.v.pos).toEqual(b.v.pos);
    expect(b.v.energy).toBeGreaterThan(a.v.energy);
    expect(b.v.energy).toBeLessThan(60);
    const copy = restore(serialize(b.g));
    for (let i = 0; i < 80; i++) {
      update(b.g, 0.05);
      update(copy, 0.05);
    }
    expect(serialize(copy)).toBe(serialize(b.g));
  }
});
test("a player-built bridge receives the path benefit even though the underlying tile is water", () => {
  const a = course("rough"), b = course("bridge");
  expect(b.g.tiles[key(25, 20)].type).toBe("water");
  expect(tile(b.g, 25, 20)).toBe("path");
  update(a.g, 0.05);
  update(b.g, 0.05);
  expect(b.v.pos).toEqual(a.v.pos);
  expect(b.v.energy).toBeGreaterThan(a.v.energy);
  expect(restore(serialize(b.g)).guests[0].energy).toBe(b.v.energy);
});
test("standing or waiting on a path does not gain a walking discount", () => {
  const a = course("rough"),
    b = course("path");
  for (const state of [a, b]) {
    state.v.phase = "address";
    state.v.path = [];
    state.v.wait = -100;
  }
  for (let i = 0; i < 20; i++) {
    update(a.g, 0.05);
    update(b.g, 0.05);
  }
  expect(a.v.energy).toBe(b.v.energy);
});
