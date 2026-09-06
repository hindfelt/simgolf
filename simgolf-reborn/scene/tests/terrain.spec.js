import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  startPractice,
  takeShot,
  shotLimit,
  update,
  serialize,
  restore,
  route,
} from "../src/simulation/game.js";
import { TERRAIN, EXTRA_TERRAIN } from "../src/simulation/terrain.js";
import { cellAt, key } from "../src/simulation/world.js";
function course() {
  const g = createGame(22);
  build(g, "tee", 7, 20);
  build(g, "green", 36, 5);
  startPractice(g);
  return g;
}
function surface(g, type, x, z) {
  const p = cellAt(x, z);
  g.tiles[key(p.c, p.r)] = { type };
}
function shot(type) {
  const g = course();
  for (let c = 15; c <= 20; c++)
    for (let r = 15; r <= 20; r++) g.tiles[key(c, r)] = { type };
  takeShot(g, g.pro, { x: -9, z: 1 });
  return g;
}
const release = (g) =>
  Math.hypot(
    g.pro.shot.end.x - g.pro.shot.landing.x,
    g.pro.shot.end.z - g.pro.shot.landing.z,
  );

test("poor lies shorten recovery distinctly, with pot bunkers harder than sand", () => {
  const g = course(),
    ranges = {};
  for (const type of ["fairway", "rough", ...EXTRA_TERRAIN, "sand"]) {
    surface(g, type, g.pro.ball.x, g.pro.ball.z);
    ranges[type] = shotLimit(g, g.pro);
  }
  expect(ranges["deep-rough"]).toBeLessThan(ranges.rough);
  expect(ranges.brush).toBeLessThan(ranges["deep-rough"]);
  expect(ranges["pot-bunker"]).toBeLessThan(ranges.sand);
  expect(ranges["waste-bunker"]).toBeLessThan(ranges.sand);
  expect(ranges.rough).toBeLessThan(ranges.fairway);
});
test("firm fairway releases farther and higher; sand and pot bunkers absorb impact", () => {
  const fairway = shot("fairway"),
    firm = shot("firm"),
    sand = shot("sand"),
    pot = shot("pot-bunker");
  expect(release(firm)).toBeGreaterThan(release(fairway));
  expect(firm.pro.shot.bounce).toBeGreaterThan(fairway.pro.shot.bounce);
  expect(release(pot)).toBeLessThan(release(sand));
  expect(sand.pro.shot.bounce).toBeLessThan(fairway.pro.shot.bounce);
});
test("rock deflections are seeded and survive an in-flight reload", () => {
  const a = shot("rocks"),
    b = shot("rocks");
  expect(a.pro.shot).toEqual(b.pro.shot);
  const s = a.pro.shot;
  const flight = { x: s.landing.x - s.from.x, z: s.landing.z - s.from.z },
    roll = { x: s.end.x - s.landing.x, z: s.end.z - s.landing.z };
  expect(Math.abs(flight.x * roll.z - flight.z * roll.x)).toBeGreaterThan(
    0.001,
  );
  const resumed = restore(serialize(a));
  for (let i = 0; i < 150; i++) {
    update(a, 0.05);
    update(resumed, 0.05);
  }
  expect(serialize(resumed)).toBe(serialize(a));
});
test("all added terrain can be constructed, saved and restored and cannot replace a tee", () => {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 36, 5);
  for (const [i, type] of EXTRA_TERRAIN.entries())
    expect(build(g, type, 17 + i, 17).ok).toBe(true);
  const saved = restore(serialize(g));
  for (const [i, type] of EXTRA_TERRAIN.entries())
    expect(saved.tiles[key(17 + i, 17)].type).toBe(type);
  const before = serialize(g);
  for (const type of EXTRA_TERRAIN)
    expect(build(g, type, 7, 20).ok).toBe(false);
  expect(serialize(g)).toBe(before);
});
test("ground roll catches a narrow water strip rather than skipping across it", () => {
  const g = shot("firm"),
    s = g.pro.shot;
  // Install water on a cell crossed by the predicted ground release, then repeat
  // the same seeded shot with that landscape present from the start.
  const crossing = cellAt(s.landing.x + 1.6, s.landing.z + 0.5);
  const h = course();
  for (let c = 15; c <= 20; c++)
    for (let r = 15; r <= 20; r++) h.tiles[key(c, r)] = { type: "firm" };
  h.tiles[key(crossing.c, crossing.r)] = { type: "water" };
  takeShot(h, h.pro, { x: -9, z: 1 });
  expect(h.pro.shot.waterLanding).toBe(true);
  for (let i = 0; i < 130; i++) update(h, 0.05);
  expect(h.pro.strokes).toBe(2);
});

test('a putt cannot pass through a water gap inside a connected green',()=>{
 const g=course();g.pro.pos={x:23,z:-23};g.pro.ball={x:23,z:-23};g.tiles[key(33,5)]={type:'green',holeId:'hole-1'};g.tiles[key(35,5)]={type:'water'};
 takeShot(g,g.pro,g.holes[0].green);expect(g.pro.shot.putt).toBe(true);expect(g.pro.shot.waterLanding).toBe(true);for(let i=0;i<28;i++)update(g,.05);expect(g.pro.strokes).toBe(2);expect(g.pro.scorecard).toHaveLength(0);
});
