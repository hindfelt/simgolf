import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  canBuild,
  openHole,
  closeHole,
  update,
  hire,
  startPractice,
  takeShot,
  restore,
  serialize,
  connected,
  route,
} from "../src/simulation/game.js";
import { cellAt, center } from "../src/simulation/world.js";
function place(g, type, x, z, brush = 1) {
  const p = cellAt(x, z);
  return build(g, type, p.c, p.r, brush);
}
function course() {
  const g = createGame();
  expect(place(g, "tee", -29, 7).ok).toBe(true);
  expect(place(g, "green", 29, -23).ok).toBe(true);
  return g;
}
function advance(g, seconds) {
  for (let i = 0; i < Math.round(seconds / 0.05); i++) update(g, 0.05);
}

test("construction is transactional, protects occupied land and permits stream edits", () => {
  const g = course();
  const cash = g.cash;
  expect(place(g, "tee", -29, 7).ok).toBe(true);
  expect(g.cash).toBe(cash);
  const before = serialize(g);
  expect(place(g, "path", -29, 7).ok).toBe(false);
  expect(place(g, "fairway", -29, -24).ok).toBe(false);
  expect(serialize(g)).toBe(before);
  expect(place(g, "fairway", 15, 24).ok).toBe(true);
  expect(openHole(g).ok).toBe(true);
  expect(place(g, "tee", -15, 7).ok).toBe(false);
  advance(g, 4);
  closeHole(g);
  expect(place(g, "green", 25, -13).ok).toBe(false);
});
test("a built hole welcomes pairs, charges only on completion, and resumes deterministically", () => {
  const g = course();
  expect(openHole(g).ok).toBe(true);
  advance(g, 3);
  expect(g.guests).toHaveLength(2);
  expect(g.stats.fees).toBe(0);
  advance(g, 12);
  const resumed = restore(serialize(g));
  advance(g, 100);
  advance(resumed, 100);
  expect(serialize(resumed)).toBe(serialize(g));
  expect(g.stats.rounds).toBeGreaterThan(0);
  expect(g.stats.fees).toBe(
    g.ledger
      .filter((r) => r.reason.includes("green fee"))
      .reduce((sum, r) => sum + r.amount, 0),
  );
  expect(
    g.rounds
      .flatMap((r) => r.scorecard)
      .every((s) => s.fee === s.happiness * 100),
  ).toBe(true);
});
test("groundskeepers must travel and work before removing real weed patches", () => {
  const g = createGame();
  expect(hire(g).ok).toBe(true);
  const initial = g.weeds.length;
  advance(g, 0.1);
  expect(g.stats.removed).toBe(0);
  expect(g.weeds).toHaveLength(initial);
  expect(g.staff[0].phase).toBe("walking");
  advance(g, 40);
  expect(g.stats.removed).toBeGreaterThan(0);
  expect(g.staff[0].removed).toBe(g.stats.removed);
  expect(g.weeds.length).toBe(initial + 4 - g.stats.removed);
});
test("a connected snack bar serves golfers; a detached one is unavailable", () => {
  const g = course();
  expect(place(g, "snack", -23, -9).ok).toBe(true);
  expect(connected(g, g.facilities[0])).toBe(false);
  expect(place(g, "path", -27, -9).ok).toBe(true);
  expect(connected(g, g.facilities[0])).toBe(true);
  openHole(g);
  advance(g, 180);
  expect(g.stats.services).toBeGreaterThan(0);
  expect(g.facilities[0].served).toBeGreaterThan(0);
  expect(g.ledger.some((r) => r.reason === "Snack bar sale")).toBe(true);
});
test("Gary flight lands, bounces, rolls to rest and can be restored mid-shot", () => {
  const g = course();
  startPractice(g);
  expect(takeShot(g, g.pro, { x: -9, z: 1 }).ok).toBe(true);
  advance(g, 1);
  expect(g.pro.ballHeight).toBeGreaterThan(1);
  const saved = restore(serialize(g));
  const s = g.pro.shot;
  advance(g, s.duration - 1 + 0.65);
  const atLanding = { ...g.pro.ball };
  advance(g, 0.6);
  expect(
    Math.hypot(g.pro.ball.x - atLanding.x, g.pro.ball.z - atLanding.z),
  ).toBeGreaterThan(0.01);
  advance(g, 10);
  advance(saved, s.duration - 1 + 0.65 + 0.6 + 10);
  expect(g.pro.shot).toBeNull();
  expect(g.pro.ballHeight).toBe(0);
  expect(g.pro.ball.x).toBeCloseTo(saved.pro.ball.x, 8);
  expect(g.stats.fees).toBe(0);
});
test("water landings take a penalty; river crossings use the bridge", () => {
  const g = course();
  startPractice(g);
  g.pro.pos = { x: 9, z: 17 };
  g.pro.ball = { x: 9, z: 17 };
  takeShot(g, g.pro, { x: 9, z: 24 });
  advance(g, 8);
  expect(g.pro.strokes).toBe(2);
  expect(g.pro.ball).toEqual({ x: 9, z: 17 });
  const path = route(g, { x: 9, z: 17 }, { x: 9, z: 35 });
  expect(path).not.toBeNull();
  expect(path.some((p) => p.x === -7 && p.z > 21 && p.z < 27)).toBe(true);
});
test("damaged saves reject missing state and unreconciled finances", () => {
  const g = course();
  expect(() => restore(serialize(g))).not.toThrow();
  for (const k of ["rng", "nextWeed", "stats", "events"]) {
    const broken = JSON.parse(serialize(g));
    delete broken[k];
    expect(() => restore(JSON.stringify(broken))).toThrow();
  }
  const brokenPosition = JSON.parse(serialize(g));
  delete brokenPosition.holes[0].green.x;
  expect(() => restore(JSON.stringify(brokenPosition))).toThrow();
  g.cash++;
  expect(() => restore(serialize(g))).toThrow();
});
