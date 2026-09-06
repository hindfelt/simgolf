import { test, expect } from "@playwright/test";
import { generateLandscape } from "../src/simulation/generated-landscape.js";
import {
  createGame,
  serialize,
  restore,
  build,
  openHole,
  update,
} from "../src/simulation/game.js";
import { key } from "../src/simulation/world.js";
import {
  exportCourse,
  coursePractice,
} from "../src/simulation/course-package.js";

test("seeded landscapes vary, retain a dry entrance and save exactly", () => {
  for (const style of ["rolling", "river"]) {
    for (const seed of [0, 1, 2002, 4294967295]) {
      const map = generateLandscape(seed, style),
        g = createGame(seed, style);
      expect(g.tiles).toEqual(map.tiles);
      expect(g.elevation).toEqual(map.elevation);
      expect(generateLandscape(seed, style)).toEqual(map);
      expect(generateLandscape((seed + 1) >>> 0, style)).not.toEqual(map);
      expect(g.starterBridgeRemoved).toBe(true);
      expect(Object.values(g.tiles).some((t) => t.type === "water")).toBe(true);
      expect(Object.values(g.elevation).some((h) => h > 0)).toBe(true);
      expect(Object.values(g.elevation).some((h) => h < 0)).toBe(true);
      for (let r = 10; r <= 14; r++)
        expect(g.tiles[key(7, r)].type).toBe("path");
      expect(restore(serialize(g)).tiles).toEqual(g.tiles);
      expect(restore(serialize(g)).elevation).toEqual(g.elevation);
    }
  }
});

test("generated property supports a playable hole and portable terrain", async () => {
  const g = createGame(31415, "river");
  expect(build(g, "tee", 7, 20).ok).toBe(true);
  expect(build(g, "green", 36, 5).ok).toBe(true);
  expect(openHole(g).ok).toBe(true);
  const copy = coursePractice(await exportCourse(g));
  expect(copy.tiles).toEqual(g.tiles);
  expect(copy.elevation).toEqual(g.elevation);
  expect(copy.starterBridgeRemoved).toBe(true);
});

test("phone previews a seed without changing the course, then starts that exact terrain", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("/");
  await page.locator("#loading").waitFor({ state: "hidden" });
  await page.locator("#menu-button").click();
  await page.locator("#new").click();
  await page.locator("#new-seed").fill("1234");
  await page.locator("#new-landscape").selectOption("river");
  await expect(page.locator("#landscape-summary")).toContainText("water tiles");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.locator("#cancel-new").click();
  expect(
    await page.evaluate(() =>
      localStorage.getItem("simgolf-reborn.course.v1.previous"),
    ),
  ).toBeNull();
  await page.locator("#new").click();
  await page.locator("#new-seed").fill("1234");
  await page.locator("#confirm-new").click();
  await page.waitForLoadState("load");
  await page.locator("#loading").waitFor({ state: "hidden" });
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("simgolf-reborn.course.v1")),
  );
  expect(saved.tiles).toEqual(generateLandscape(1234, "river").tiles);
  expect(saved.elevation).toEqual(generateLandscape(1234, "river").elevation);
  expect(
    await page.evaluate(() =>
      localStorage.getItem("simgolf-reborn.course.v1.previous"),
    ),
  ).toBeTruthy();
  await context.close();
});

test("a hole across a generated river needs a bridge and then completes a paid round", () => {
  const g = createGame(1234, "river");
  expect(build(g, "tee", 7, 20).ok).toBe(true);
  expect(build(g, "green", 30, 37).ok).toBe(true);
  expect(openHole(g).ok).toBe(false);
  for (let r = 15; r <= 38; r++) expect(build(g, "path", 20, r).ok).toBe(true);
  expect(Object.keys(g.bridges).length).toBeGreaterThan(0);
  expect(openHole(g).ok).toBe(true);
  for (let i = 0; i < 16000 && !g.rounds.length; i++) update(g, 0.05);
  expect(g.rounds.length).toBeGreaterThan(0);
  expect(g.stats.fees).toBeGreaterThan(0);
  expect(restore(serialize(g)).rounds).toEqual(g.rounds);
});
