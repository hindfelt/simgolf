import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  footprint,
  tile,
  connected,
  serialize,
  restore,
} from "../src/simulation/game.js";
import {
  facilityContains,
  marinaWaterCell,
} from "../src/simulation/facilities.js";
import {
  exportCourse,
  coursePractice,
} from "../src/simulation/course-package.js";
import { demolish } from "../src/simulation/course-edit.js";
import { key } from "../src/simulation/world.js";
function course() {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 36, 5);
  return g;
}
for (const rotation of [0, 1, 2, 3])
  test(`marina rotation ${rotation} follows the shoreline and preserves water on removal`, async () => {
    const g = course(),
      f = { type: "marina", c: 30, r: 16, rotation };
    expect(build(g, "marina", f.c, f.r, 1, g.holes[0].id, rotation).ok).toBe(
      false,
    );
    for (const p of footprint(f.type, f.c, f.r, 1, rotation))
      if (marinaWaterCell(f, p.c, p.r))
        expect(build(g, "water", p.c, p.r).ok).toBe(true);
    expect(build(g, "marina", f.c, f.r, 1, g.holes[0].id, rotation).ok).toBe(
      true,
    );
    expect(restore(serialize(g)).facilities[0]).toMatchObject(f);
    const shared = coursePractice(await exportCourse(g)).facilities[0];
    expect({ ...shared, rotation: shared.rotation || 0 }).toMatchObject(f);
    expect(build(g, "rough", 30, 16).ok).toBe(false);
    expect(demolish(g, 30, 16).ok).toBe(true);
    expect(g.tiles[key(30, 16)].type).toBe("water");
  });
test("airstrip footprint is elongated, rotates and protects its distant ends", async () => {
  const g = course();
  expect(build(g, "airstrip", 22, 15).ok).toBe(true);
  expect(footprint("airstrip", 22, 15)).toHaveLength(217);
  expect(tile(g, 37, 15)).toBe("blocked");
  expect(tile(g, 22, 19)).not.toBe("blocked");
  expect(build(g, "raise", 37, 15).ok).toBe(false);
  expect(build(g, "helipad", 37, 15).ok).toBe(false);
  expect(coursePractice(await exportCourse(g)).facilities[0].type).toBe(
    "airstrip",
  );
  const rotated = { type: "airstrip", c: 22, r: 20, rotation: 1 };
  expect(facilityContains(rotated, 22, 35)).toBe(true);
  expect(facilityContains(rotated, 37, 20)).toBe(false);
  expect(demolish(g, 37, 15).ok).toBe(true);
  expect(g.facilities).toHaveLength(0);
});
test("helipad is compact, costs once and connects like other facilities", () => {
  const g = course(),
    cash = g.cash;
  expect(build(g, "helipad", 22, 14).ok).toBe(true);
  expect(g.cash).toBe(cash - 6000);
  expect(footprint("helipad", 22, 14)).toHaveLength(25);
  for (let c = 8; c <= 22; c++) expect(build(g, "path", c, 11).ok).toBe(true);
  expect(connected(g, g.facilities[0])).toBe(true);
});
test("browser places the long airstrip and compact helipad from the resort tray", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#loading").waitFor({ state: "hidden" });
  await page.locator("#pause").click();
  await page.locator('[data-palette="resort"]').click();
  await page.locator('[data-tool="airstrip"]').click();
  const p = await page.evaluate(() => window.__gameTest.project(1, -3));
  await page.mouse.click(p.x, p.y);
  expect(
    await page.evaluate(() => window.__gameTest.getState().facilities[0]?.type),
  ).toBe("airstrip");
  await page.locator('[data-tool="helipad"]').click();
  const h = await page.evaluate(() => window.__gameTest.project(15, -23));
  await page.mouse.click(h.x, h.y);
  expect(
    await page.evaluate(() =>
      window.__gameTest.getState().facilities.map((f) => f.type),
    ),
  ).toEqual(["airstrip", "helipad"]);
  await page.mouse.move(10, 10);
  await page.screenshot({ path: "/tmp/simgolf-airstrip-helipad.png" });
});

test("a rotated runway builds with a narrow width and rejects uneven terrain", async () => {
  const g = course();
  for (const p of footprint("airstrip", 30, 18, 1, 1))
    if (g.tiles[key(p.c, p.r)]?.type === "water")
      expect(build(g, "rough", p.c, p.r).ok).toBe(true);
  expect(build(g, "raise", 30, 18, 5).ok).toBe(true);
  expect(build(g, "raise", 30, 18, 5).ok).toBe(true);
  expect(build(g, "airstrip", 30, 18, 1, g.holes[0].id, 1).ok).toBe(false);
  build(g, "lower", 30, 18, 5);
  build(g, "lower", 30, 18, 5);
  expect(build(g, "airstrip", 30, 18, 1, g.holes[0].id, 1).ok).toBe(true);
  expect(tile(g, 30, 33)).toBe("blocked");
  expect(tile(g, 34, 18)).not.toBe("blocked");
  expect(coursePractice(await exportCourse(g)).facilities[0].rotation).toBe(1);
});
