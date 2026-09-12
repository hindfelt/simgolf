import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  openHole,
  update,
  restore,
  serialize,
  connected,
  startPractice,
} from "../src/simulation/game.js";
import {
  exportCourse,
  coursePractice,
} from "../src/simulation/course-package.js";
import { key } from "../src/simulation/world.js";
const advance = (g, n) => {
  for (let i = 0; i < n / 0.05; i++) update(g, 0.05);
};
function course(link = true) {
  const g = createGame();
  for (const [t, c, r] of [
    ["tee", 7, 20],
    ["green", 36, 5],
    ["hotel", 22, 14],
  ])
    expect(build(g, t, c, r).ok).toBe(true);
  if (link)
    for (let c = 8; c <= 22; c++) expect(build(g, "path", c, 11).ok).toBe(true);
  return g;
}
test("connected hotel supplies rested arrivals and disconnected hotel does not", () => {
  const a = course(),
    b = course(false);
  expect(connected(a, a.facilities[0])).toBe(true);
  openHole(a);
  openHole(b);
  advance(a, 1.1);
  advance(b, 1.1);
  expect(a.guests[0].wellRested).toBe(true);
  expect(b.guests[0].wellRested).toBe(false);
  expect(a.guests[0].energy).toBeGreaterThan(b.guests[0].energy);
  const av = a.guests[0],
    bv = b.guests[0],
    ae = av.energy,
    be = bv.energy;
  advance(a, 30);
  advance(b, 30);
  expect(ae - av.energy).toBeLessThan(be - bv.energy);
  startPractice(a);
  expect(a.pro.wellRested).toBe(false);
});
test("rest survives disconnect and reload but later arrivals lose the benefit", () => {
  const g = course();
  openHole(g);
  advance(g, 1.1);
  const first = g.guests[0];
  delete g.tiles[key(8, 11)];
  const copy = restore(serialize(g));
  advance(g, 27);
  advance(copy, 27);
  expect(serialize(copy)).toBe(serialize(g));
  expect(first.wellRested).toBe(true);
  expect(
    g.guests.filter((v) => v.id !== first.id).some((v) => !v.wellRested),
  ).toBe(true);
  const bad = JSON.parse(serialize(g));
  bad.guests[0].wellRested = "yes";
  expect(() => restore(JSON.stringify(bad))).toThrow("hotel rest");
});
test("hotel footprint and course export preserve the resort building", async () => {
  const g = course();
  expect(build(g, "path", 22, 14).ok).toBe(false);
  const pkg = await exportCourse(g);
  expect(coursePractice(pkg).facilities[0].type).toBe("hotel");
});
test("browser builds the Resort Hotel", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.__gameTest);
  await page.locator("#pause").click();
  await page.locator('[data-tool="hotel"]').click();
  const p = await page.evaluate(() => window.__gameTest.project(1, -5));
  await page.mouse.click(p.x, p.y);
  expect(
    await page.evaluate(() => window.__gameTest.getState().facilities[0]?.type),
  ).toBe("hotel");
  await page.screenshot({ path: "../graphics/samples/resort-hotel.png" });
});
