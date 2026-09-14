import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  startingAttitude,
  serialize,
  restore,
} from "../src/simulation/game.js";
import {
  exportCourse,
  coursePractice,
} from "../src/simulation/course-package.js";
import { key } from "../src/simulation/world.js";
for (const [type, name] of [
  ["stable", "Stable"],
  ["spa", "Spa"],
]) {
  test(`${name} supports connection, rotation, save and exported gameplay`, async () => {
    const g = createGame();
    build(g, "tee", 7, 20);
    build(g, "green", 36, 5);
    expect(build(g, type, 22, 15, 1, g.holes[0].id, 2).ok).toBe(true);
    expect(startingAttitude(g, 35)).toBe(35);
    for (let c = 8; c <= 22; c++) expect(build(g, "path", c, 11).ok).toBe(true);
    expect(startingAttitude(g, 35)).toBe(60);
    expect(startingAttitude(g, 80)).toBe(80);
    expect(build(g, "snack", 22, 15).ok).toBe(false);
    expect(restore(serialize(g)).facilities).toEqual(g.facilities);
    const copy = coursePractice(await exportCourse(g));
    expect(copy.facilities[0]).toMatchObject({ type, rotation: 2 });
    expect(startingAttitude(copy, 35)).toBe(60);
    delete g.tiles[key(8, 11)];
    expect(startingAttitude(g, 35)).toBe(35);
  });
  test(`${name} renders from the construction palette`, async ({ page }) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await page.locator("#loading").waitFor({ state: "hidden" });
    await page.locator("#pause").click();
    await page.locator('[data-palette="resort"]').click();
    await page.locator(`[data-tool="${type}"]`).click();
    const p = await page.evaluate(() => window.__gameTest.project(1, -3));
    await page.mouse.click(p.x, p.y);
    expect(
      await page.evaluate(
        () => window.__gameTest.getState().facilities[0]?.type,
      ),
    ).toBe(type);
    await page.screenshot({ path: `/tmp/simgolf-${type}.png` });
    await page.locator('[data-mode="reports"]').click();
    await expect(page.locator("#live-details")).toContainText(
      `${name}: needs a path`,
    );
    expect(errors).toEqual([]);
  });
}
