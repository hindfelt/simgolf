import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  openHole,
  update,
  serialize,
  restore,
  takeShot,
  addHole,
} from "../src/simulation/game.js";
import { completeBallwash } from "../src/simulation/facilities.js";
import { key } from "../src/simulation/world.js";
const advance = (g, s) => {
  for (let i = 0; i < s / 0.05; i++) update(g, 0.05);
};
function course() {
  const g = createGame(22);
  for (const [t, c, r] of [
    ["tee", 7, 20],
    ["green", 36, 5],
    ["ballwasher", 11, 12],
  ])
    expect(build(g, t, c, r).ok).toBe(true);
  for (let c = 8; c <= 11; c++) expect(build(g, "path", c, 11).ok).toBe(true);
  expect(openHole(g).ok).toBe(true);
  return g;
}
function reachService(g) {
  for (let i = 0; i < 1400; i++) {
    update(g, 0.05);
    if (g.guests.some((v) => v.phase === "service"))
      return g.guests.find((v) => v.phase === "service");
  }
  throw Error("No ballwasher visit");
}
test("cleaning takes time, survives reload, and reduces seeded shot error", () => {
  const g = course(),
    v = reachService(g);
  expect(v.cleanedHoleId).toBeUndefined();
  const copy = restore(serialize(g));
  advance(g, 3.2);
  advance(copy, 3.2);
  expect(serialize(copy)).toBe(serialize(g));
  expect(v.cleanedHoleId).toBe(v.holeId);
  expect(completeBallwash(v)).toBe(false);
  v.phase = "address";
  v.pos = { ...v.ball };
  const dirty = restore(serialize(g)),
    other = dirty.guests.find((x) => x.id === v.id);
  delete other.cleanedHoleId;
  const target = { x: v.ball.x + 8, z: v.ball.z };
  takeShot(g, v, target);
  takeShot(dirty, other, target);
  const error = (x) =>
    Math.hypot(x.shot.landing.x - target.x, x.shot.landing.z - target.z);
  expect(error(v)).toBeCloseTo(error(other) * 0.75, 8);
});
test("disconnect during cleaning gives no benefit or sale", () => {
  const g = course(),
    v = reachService(g);
  delete g.tiles[key(8, 11)];
  advance(g, 5);
  expect(v.cleanedHoleId).toBeUndefined();
  expect(g.facilities[0].served).toBe(0);
  expect(g.ledger.some((x) => x.reason === "Snack bar sale")).toBe(false);
});
test("benefit expires at next hole and invalid saved hole is rejected", () => {
  const g = course();
  expect(addHole(g).ok).toBe(true);
  const h = g.holes[1];
  expect(build(g, "tee", 32, 12, 1, h.id).ok).toBe(true);
  expect(build(g, "green", 27, 24, 1, h.id).ok).toBe(true);
  expect(openHole(g, h.id).ok).toBe(true);
  const v = reachService(g);
  advance(g, 4);
  expect(v.cleanedHoleId).toBe(v.holeId);
  const bad = JSON.parse(serialize(g));
  bad.guests[0].cleanedHoleId = "hole-missing";
  expect(() => restore(JSON.stringify(bad))).toThrow();
  delete g.tiles[key(8, 11)];
  for (let i = 0; i < 18000 && v.holeIndex === 0; i++) update(g, 0.05);
  expect(v.holeIndex).toBe(1);
  expect(v.cleanedHoleId).toBeUndefined();
});
test("browser places and renders a ballwasher", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.__gameTest);
  await page.locator("#pause").click();
  await page.locator('[data-tool="ballwasher"]').click();
  const p = await page.evaluate(() => window.__gameTest.project(-21, -9));
  await page.mouse.click(p.x, p.y);
  expect(
    await page.evaluate(() => window.__gameTest.getState().facilities[0]?.type),
  ).toBe("ballwasher");
  await page.screenshot({ path: "../graphics/samples/ballwasher.png" });
});
