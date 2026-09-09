import { test, expect } from "@playwright/test";
import {
  createGame,
  restore,
  serialize,
  build,
  openHole,
  update,
} from "../src/simulation/game.js";
import { coastalWater } from "../src/simulation/coast.js";
import { buyLand } from "../src/simulation/land-purchase.js";
import { key, GRID, blocked } from "../src/simulation/world.js";
import {
  exportCourse,
  coursePractice,
} from "../src/simulation/course-package.js";
test("seeded coastline reaches the property edge and continues through purchased land", () => {
  for (const seed of [0, 1234, 4294967295]) {
    const g = createGame(seed, "coast");
    expect(restore(serialize(g)).landscapeStyle).toBe("coast");
    expect(buyLand(g).ok).toBe(true);
    for (let r = 0; r < 52; r++)
      for (let c = 27; c < GRID.width; c++)
        if (!blocked(c, r))
          expect(g.tiles[key(c, r)]?.type === "water").toBe(
            coastalWater(seed, c, r),
          );
    expect(restore(serialize(g)).tiles).toEqual(g.tiles);
  }
});
test("coastal hole plays and shared course preserves shoreline geometry", async () => {
  const g = createGame(1234, "coast", "links");
  expect(build(g, "tee", 7, 20).ok).toBe(true);
  expect(build(g, "green", 24, 20).ok).toBe(true);
  for (let c = 11; c <= 20; c++) build(g, "fairway", c, 20, 3);
  expect(openHole(g).ok).toBe(true);
  for (let i = 0; i < 18000 && !g.rounds.length; i++) update(g, 0.05);
  expect(g.rounds.length).toBeGreaterThan(0);
  const copy = coursePractice(await exportCourse(g));
  // Course sharing intentionally omits live turf wear from played shots.
  expect(copy.tiles).toEqual(
    Object.fromEntries(
      Object.entries(g.tiles).map(([k, { wear, ...surface }]) => [k, surface]),
    ),
  );
  expect(copy.elevation).toEqual(g.elevation);
  expect(copy.landscapeStyle).toBe("coast");
});
test("offshore island accepts a green and older saves keep their edited shoreline", () => {
  const g = createGame(1234, "coast", "links");
  expect(build(g, "green", 39, 15).ok).toBe(true);
  expect(g.tiles[key(44, 15)].type).toBe("water");
  const saved = JSON.parse(serialize(g));
  // Simulate the previous protocol without regenerating its saved tile map.
  saved.protocol = {
    version: 66,
    ruleset: "prototype-editable-scenery-trees-2026-09-06",
    tick: 0,
    revision: 0,
    clients: [],
  };
  const restored = restore(JSON.stringify(saved));
  expect(restored.tiles).toEqual(g.tiles);
  expect(restored.holes[0].green).toEqual(g.holes[0].green);
});
test("coast option previews and starts in the browser", async ({ page }) => {
  await page.goto("/");
  await page.locator("#loading").waitFor({ state: "hidden" });
  await page.locator("#menu-button").click();
  await page.locator("#new").click();
  await page.locator("#new-environment").selectOption("links");
  await page.locator("#new-landscape").selectOption("coast");
  await page.locator("#new-seed").fill("1234");
  await page.locator("#confirm-new").click();
  await page.locator("#loading").waitFor({ state: "hidden" });
  expect(
    await page.evaluate(() => window.__gameTest.getState().landscapeStyle),
  ).toBe("coast");
  await page.screenshot({ path: "/tmp/simgolf-coast.png" });
});
