import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  startPractice,
  takeShot,
  shotLimit,
  serialize,
} from "../src/simulation/game.js";
import { planShot } from "../src/simulation/shot-planner.js";
import { cellAt, key } from "../src/simulation/world.js";

function setup() {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 36, 5);
  startPractice(g);
  return g;
}
function projected(g) {
  const cup = g.holes[0].green,
    ball = g.pro.ball;
  const d = Math.hypot(cup.x - ball.x, cup.z - ball.z),
    r = shotLimit(g, g.pro);
  return {
    x: ball.x + ((cup.x - ball.x) * r) / d,
    z: ball.z + ((cup.z - ball.z) * r) / d,
  };
}
test("avoids a water landing without knowing or consuming the live random stream", () => {
  const g = setup(),
    p = cellAt(projected(g).x, projected(g).z);
  for (let c = p.c - 2; c <= p.c + 2; c++)
    for (let r = p.r - 2; r <= p.r + 2; r++)
      g.tiles[key(c, r)] = { type: "water" };
  const direct = structuredClone(g);
  takeShot(direct, direct.pro, direct.holes[0].green);
  expect(direct.pro.shot.waterLanding).toBe(true);
  const before = serialize(g),
    target = planShot(g, g.pro);
  expect(serialize(g)).toBe(before);
  const other = structuredClone(g);
  other.rng = 987654;
  expect(planShot(other, other.pro)).toEqual(target);
  takeShot(g, g.pro, target, target.technique);
  expect(g.pro.shot.waterLanding).toBe(false);
  expect(g.pro.shot.obstruction).toBeUndefined();
});
test("avoids marked out of bounds and aims at the cup for a putt", () => {
  const g = setup(),
    p = cellAt(projected(g).x, projected(g).z);
  g.outOfBounds = {};
  for (let c = p.c - 3; c <= p.c + 3; c++)
    for (let r = p.r - 3; r <= p.r + 3; r++) g.outOfBounds[key(c, r)] = true;
  const target = planShot(g, g.pro);
  takeShot(g, g.pro, target, target.technique);
  const end = cellAt(g.pro.shot.end.x, g.pro.shot.end.z);
  expect(g.outOfBounds[key(end.c, end.r)]).not.toBe(true);
  expect(planShot(g, g.pro)).toBeNull();
  const putt = setup();
  putt.pro.ball = { ...putt.holes[0].green, x: putt.holes[0].green.x - 0.5 };
  expect(planShot(putt, putt.pro)).toEqual({
    x: putt.holes[0].green.x,
    z: putt.holes[0].green.z,
    technique: "straight",
  });
});

test("chooses a clear flight when a tree blocks the direct approach", () => {
  const g = setup(),
    end = projected(g);
  const c = cellAt(
    g.pro.ball.x + (end.x - g.pro.ball.x) * 0.35,
    g.pro.ball.z + (end.z - g.pro.ball.z) * 0.35,
  );
  g.tiles[key(c.c, c.r)] = { type: "tree" };
  const direct = structuredClone(g);
  takeShot(direct, direct.pro, direct.holes[0].green);
  expect(direct.pro.shot.obstruction).toBeTruthy();
  const target = planShot(g, g.pro);
  takeShot(g, g.pro, target, target.technique);
  expect(g.pro.shot.obstruction).toBeUndefined();
  expect(g.pro.shot.waterLanding).toBe(false);
});

for (const [fraction, technique] of [
  [0.25, "punch"],
  [0.45, "fade"],
  [0.55, "draw"],
])
  test(`uses ${technique} to negotiate an obstructed approach`, () => {
    const g = setup();
    g.pro.proSkills.draw = 5;
    g.pro.proSkills.fade = 5;
    const end = projected(g),
      ball = g.pro.ball;
    const c = cellAt(
      ball.x + (end.x - ball.x) * fraction,
      ball.z + (end.z - ball.z) * fraction,
    );
    g.tiles[key(c.c, c.r)] = { type: "tree" };
    const direct = structuredClone(g);
    takeShot(direct, direct.pro, direct.holes[0].green);
    expect(direct.pro.shot.obstruction).toBeTruthy();
    const before = serialize(g),
      target = planShot(g, g.pro);
    expect(serialize(g)).toBe(before);
    expect(target.technique).toBe(technique);
    const other = structuredClone(g);
    other.rng = 7654;
    expect(planShot(other, other.pro)).toEqual(target);
    takeShot(g, g.pro, target, target.technique);
    expect(g.pro.shot.obstruction).toBeUndefined();
    expect(g.pro.shot.waterLanding).toBe(false);
  });

test("uses backspin to finish closer on a short approach", () => {
  const g = setup();
  g.pro.proSkills.backspin = 5;
  const cup = g.holes[0].green;
  g.pro.ball = { x: cup.x - 16, z: cup.z };
  const direct = structuredClone(g);
  takeShot(direct, direct.pro, cup);
  const target = planShot(g, g.pro);
  expect(target.technique).toBe("backspin");
  takeShot(g, g.pro, target, target.technique);
  const remaining = (s) => Math.hypot(s.end.x - cup.x, s.end.z - cup.z);
  expect(remaining(g.pro.shot)).toBeLessThan(remaining(direct.pro.shot));
});
