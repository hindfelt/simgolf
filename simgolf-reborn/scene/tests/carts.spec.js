import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  openHole,
  update,
  serialize,
  restore,
  connected,
} from "../src/simulation/game.js";
import {
  exportCourse,
  coursePractice,
} from "../src/simulation/course-package.js";
import { center, key } from "../src/simulation/world.js";
import { ridesCart } from "../src/simulation/carts.js";
function course(link = true) {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 36, 5);
  expect(build(g, "cart-garage", 22, 13).ok).toBe(true);
  if (link)
    for (let c = 8; c <= 22; c++) expect(build(g, "path", c, 11).ok).toBe(true);
  openHole(g);
  while (!g.guests.length) update(g, 0.05);
  return g;
}
test("connected garage supplies real arrivals; disconnected garage does not; carts survive round reload", () => {
  const g = course(),
    detached = course(false);
  expect(connected(g, g.facilities[0])).toBe(true);
  expect(g.guests[0].hasCart).toBe(true);
  expect(detached.guests[0].hasCart).toBe(false);
  const copy = restore(serialize(g));
  for (let i = 0; i < 1200; i++) {
    update(g, 0.05);
    update(copy, 0.05);
  }
  expect(serialize(copy)).toBe(serialize(g));
});
test("cart travel is faster on paths and fairways, with ordinary walking on rough and greens", () => {
  for (const surface of ["path", "fairway", "firm", "rough", "green"]) {
    const g = course(),
      v = g.guests[0];
    g.tiles[key(25, 20)] = { type: surface };
    v.pos = center(25, 20);
    v.cartPosition={...v.pos,heading:0};
    v.path = [center(26, 20)];
    v.phase = "walking";
    v.afterWalk = "address";
    const foot = structuredClone(g);
    foot.guests[0].hasCart = false;
    update(g, 0.05);
    update(foot, 0.05);
    if (["path", "fairway", "firm"].includes(surface))
      expect(v.pos.x).toBeGreaterThan(foot.guests[0].pos.x);
    else expect(v.pos).toEqual(foot.guests[0].pos);
  }
  expect(ridesCart({ hasCart: true, phase: "address" }, "fairway")).toBe(false);
});
test("garage layout shares independently; malformed cart availability rejects", async () => {
  const g = course(),
    pkg = await exportCourse(g, "Cart course"),
    practice = await coursePractice(pkg);
  expect(practice.facilities[0].type).toBe("cart-garage");
  expect(practice.pro?.hasCart ?? false).toBe(false);
  const bad = structuredClone(g);
  bad.guests[0].hasCart = "yes";
  expect(() => restore(JSON.stringify(bad))).toThrow();
});
test("browser renders garage and visiting carts without errors", async ({
  page,
}) => {
  const g = course(),
    v = g.guests[0];
  v.pos = center(20, 11);
  v.cartPosition={...v.pos,heading:0};
  v.path = [center(22, 11)];
  v.phase = "walking";
  v.afterWalk = "address";
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript((save) => {
    if (!localStorage.getItem("simgolf-reborn.course.v1"))
      localStorage.setItem("simgolf-reborn.course.v1", save);
  }, serialize(g));
  await page.goto("/");
  await page.waitForFunction(() => !!window.__gameTest);
  await page.locator("#pause").click();
  await page.locator('[data-mode="build"]').click();
  await expect(
    page.getByRole("button", { name: "Cart Garage", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cart Garage", exact: true }).click();
  const pos = await page.evaluate(() => window.__gameTest.project(1, 5));
  await page.mouse.click(pos.x, pos.y);
  await expect
    .poll(() =>
      page.evaluate(() => window.__gameTest.getState().facilities.length),
    )
    .toBe(2);
  await page.screenshot({ path: "../graphics/samples/cart-garage.png" });
  expect(errors).toEqual([]);
});
