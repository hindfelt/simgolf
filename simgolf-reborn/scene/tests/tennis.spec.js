import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  openHole,
  update,
  startingAttitude,
  connected,
  restore,
  serialize,
} from "../src/simulation/game.js";
import { key } from "../src/simulation/world.js";
import {
  exportCourse,
  coursePractice,
} from "../src/simulation/course-package.js";
function course(link) {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 36, 5);
  expect(build(g, "tennis-court", 22, 15).ok).toBe(true);
  if (link)
    for (let c = 8; c <= 22; c++) expect(build(g, "path", c, 11).ok).toBe(true);
  return g;
}
test("connected court floors starting attitude, does not lower positive mood or stack", () => {
  const g = course(true);
  expect(connected(g, g.facilities[0])).toBe(true);
  expect(startingAttitude(g, 35)).toBe(60);
  expect(startingAttitude(g, 90)).toBe(90);
  delete g.tiles[key(8, 11)];
  expect(startingAttitude(g, 35)).toBe(35);
});
test("actual arrivals benefit once; existing golfers are not changed by losing the connection", () => {
  const a = course(false),
    b = course(true);
  openHole(a);
  openHole(b);
  const seenA = new Map(),
    seenB = new Map();
  let improved = false;
  for (let i = 0; i < 3000 && !improved; i++) {
    update(a, 0.05);
    update(b, 0.05);
    for (const [game, seen] of [
      [a, seenA],
      [b, seenB],
    ])
      for (const v of game.guests) if (!seen.has(v.id)) seen.set(v.id, v.mood);
    for (const [id, mood] of seenA)
      if (seenB.has(id)) {
        expect(seenB.get(id)).toBe(Math.max(60, mood));
        if (seenB.get(id) > mood) improved = true;
      }
  }
  expect(improved).toBe(true);
  const old = b.guests[0].mood;
  delete b.tiles[key(8, 11)];
  expect(b.guests[0].mood).toBe(old);
  expect(restore(serialize(b)).guests[0].mood).toBe(old);
});
test("court footprint blocks overlaps and survives layout sharing", async () => {
  const g = course(true);
  expect(build(g, "snack", 22, 15).ok).toBe(false);
  expect(coursePractice(await exportCourse(g)).facilities[0].type).toBe(
    "tennis-court",
  );
});
test("browser constructs the tennis court and shows its connected status", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.__gameTest);
  await page.locator("#pause").click();
  await page.locator('[data-tool="tennis-court"]').click();
  const p = await page.evaluate(() => window.__gameTest.project(1, -3));
  await page.mouse.click(p.x, p.y);
  expect(
    await page.evaluate(() => window.__gameTest.getState().facilities[0]?.type),
  ).toBe("tennis-court");
  await page.screenshot({ path: "../graphics/samples/tennis-court.png" });
  await page.locator('[data-mode="reports"]').click();
  await expect(page.locator("#live-details")).toContainText(
    "Tennis Court: needs a path",
  );
});
