import { test, expect } from "@playwright/test";
import { groundRoll } from "../src/simulation/ground-roll.js";
const from = { x: 0, z: 0 },
  target = { x: 4, z: 0 };
test("uniform turf retains release while crossed rough and bunkers absorb it", () => {
  expect(groundRoll(from, target, () => "firm").end.x).toBeCloseTo(4, 8);
  const cross = (type) =>
    groundRoll(from, target, (p) => (p.x < 1 ? "firm" : type)).end.x;
  expect(cross("rough")).toBeLessThan(1.5);
  expect(cross("sand")).toBeLessThan(cross("rough"));
  expect(cross("pot-bunker")).toBeLessThan(cross("sand"));
  expect(cross("firm")).toBeGreaterThan(cross("fairway"));
});
test("a bunker stops release before water farther along; open turf reaches water", () => {
  const wet = groundRoll(from, target, (p) => (p.x >= 2 ? "water" : "firm"));
  expect(wet.water).toBe(true);
  const sand = groundRoll(from, target, (p) =>
    p.x >= 2 ? "water" : p.x >= 1 ? "sand" : "firm",
  );
  expect(sand.water).toBe(false);
  expect(sand.end.x).toBeLessThan(2);
});
test("putts and backwards release check crossed lies in their travel direction", () => {
  const result = groundRoll({ x: 4, z: 0 }, from, (p) =>
    p.x < 3 ? "sand" : "green",
  );
  expect(result.end.x).toBeGreaterThan(2);
  expect(result.end.x).toBeLessThan(3);
  expect(groundRoll(from, from, () => "green").end).toEqual(from);
});

test("a very short roll cannot detect water beyond its endpoint", () => {
  const result = groundRoll(from, { x: 0.001, z: 0 }, (p) =>
    p.x >= 0.01 ? "water" : "firm",
  );
  expect(result.water).toBe(false);
  expect(result.end.x).toBeCloseTo(0.001, 9);
});
