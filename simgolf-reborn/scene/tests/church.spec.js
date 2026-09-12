import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  connected,
  tile,
  serialize,
  restore,
} from "../src/simulation/game.js";
import { lotValue } from "../src/simulation/housing.js";
import {
  exportCourse,
  coursePractice,
} from "../src/simulation/course-package.js";
test("Links Church connects, improves all lot values and shares its geometry", async () => {
  const g = createGame(2002, "classic", "links");
  build(g, "tee", 7, 20);
  build(g, "green", 36, 5);
  expect(build(g, "church", 22, 15, 1, g.holes[0].id, 1).ok).toBe(true);
  const lot = { c: 15, r: 20 };
  expect(lotValue(g, lot, connected, tile).bonus).toBe(0);
  for (let c = 7; c <= 22; c++) build(g, "path", c, 12);
  const value = lotValue(g, lot, connected, tile);
  expect(value.bonus).toBe(Math.round(value.base * 0.25));
  expect(restore(serialize(g)).facilities[0].type).toBe("church");
  expect(coursePractice(await exportCourse(g)).facilities[0]).toMatchObject({
    type: "church",
    rotation: 1,
  });
  for (const environment of ["parklands", "desert", "tropical"])
    expect(
      build(createGame(2002, "classic", environment), "church", 22, 15).ok,
    ).toBe(false);
});
test("Church renders in Links Resort palette", async ({ page }) => {
  await page.addInitScript(
    (s) => localStorage.setItem("simgolf-reborn.course.v1", s),
    serialize(createGame(2002, "classic", "links")),
  );
  await page.goto("/");
  await page.locator("#loading").waitFor({ state: "hidden" });
  await page.locator("#pause").click();
  await page.locator('[data-palette="resort"]').click();
  await page.locator('[data-tool="church"]').click();
  const p = await page.evaluate(() => window.__gameTest.project(1, -3));
  await page.mouse.click(p.x, p.y);
  expect(
    await page.evaluate(() => window.__gameTest.getState().facilities[0]?.type),
  ).toBe("church");
  await page.mouse.move(10, 10);
  await page.screenshot({ path: "/tmp/simgolf-church.png" });
});
