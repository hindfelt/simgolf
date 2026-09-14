import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  tile,
  route,
  restore,
  serialize,
} from "../src/simulation/game.js";
import { demolish, demolitionCheck } from "../src/simulation/course-edit.js";
import { center } from "../src/simulation/world.js";
import {
  exportCourse,
  importCourse,
  coursePractice,
} from "../src/simulation/course-package.js";
test("remove starting bridge restores water and breaks crossing until rebuilt", async () => {
  const g = createGame();
  expect(tile(g, 18, 28)).toBe("path");
  expect(route(g, center(18, 26), center(18, 32))).toBeTruthy();
  expect(demolitionCheck(g, 18, 28).kind).toBe("starting-bridge");
  expect(demolish(g, 18, 28).ok).toBe(true);
  expect(tile(g, 18, 28)).toBe("water");
  expect(tile(g, 18, 29)).toBe("water");
  expect(tile(g, 18, 26)).toBe("path");
  expect(route(g, center(18, 26), center(18, 32))).toBeNull();
  expect(restore(serialize(g)).starterBridgeRemoved).toBe(true);
  for (const r of [28, 29]) expect(build(g, "bridge", 18, r).ok).toBe(true);
  expect(route(g, center(18, 26), center(18, 32))).toBeTruthy();
  expect(build(g, "tee", 7, 20).ok).toBe(true);
  expect(build(g, "green", 36, 5).ok).toBe(true);
  const pkg = await exportCourse(g),
    shared = coursePractice(await importCourse(JSON.stringify(pkg)));
  expect(shared.starterBridgeRemoved).toBe(true);
  expect(tile(shared, 18, 28)).toBe("path");
});
test("existing crossings are protected and legacy saves keep the starting bridge", () => {
  const g = createGame();
  g.staff.push({ pos: center(18, 25), path: [center(18, 28)] });
  expect(demolish(g, 18, 28).ok).toBe(false);
  expect(g.starterBridgeRemoved).toBeUndefined();
  const legacy = createGame();
  expect(restore(serialize(legacy)).starterBridgeRemoved).toBeUndefined();
  expect(tile(legacy, 18, 28)).toBe("path");
});
test("browser removes original bridge through confirmation and shows continuous water", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.__gameTest);
  await page.locator("#pause").click();
  await page.locator('[data-palette="landscape"]').click();
  await page.locator('[data-tool="demolish"]').click();
  const p = await page.evaluate(() => window.__gameTest.project(-7, 23));
  await page.mouse.click(p.x, p.y);
  await expect(page.locator("#remove-dialog")).toBeVisible();
  await expect(page.locator("#remove-description")).toContainText(
    "starting bridge",
  );
  await page.locator("#confirm-removal").click();
  expect(
    await page.evaluate(
      () => window.__gameTest.getState().starterBridgeRemoved,
    ),
  ).toBe(true);
  await page.mouse.move(900, 200);
  await page.screenshot({
    path: "../graphics/samples/starting-bridge-removed.png",
  });
});
