import {
  exportCourse,
  coursePractice,
} from "../src/simulation/course-package.js";
import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  openHole,
  update,
  serialize,
  restore,
  connected,
  tile,
} from "../src/simulation/game.js";
import { lotValue, validateHousing } from "../src/simulation/housing.js";
test("completed golfers buy connected lots once; payments survive saves and reject forgery", async () => {
  const g = createGame();
  expect(build(g, "building-lot", 12, 14).ok).toBe(true);
  for (let c = 7; c <= 12; c++) expect(build(g, "path", c, 12).ok).toBe(true);
  expect(connected(g, g.facilities[0])).toBe(true);
  build(g, "tee", 7, 20);
  build(g, "green", 36, 22);
  for (let c = 11; c <= 31; c++) build(g, "fairway", c, 21, 3);
  expect(openHole(g).ok).toBe(true);
  for (let i = 0; i < 18000 && !g.housingSales?.length; i++) update(g, 0.05);
  expect(g.housingSales).toHaveLength(1);
  expect(g.facilities[0].type).toBe("home");
  const pkg = await exportCourse(g, "Residential course");
  expect(pkg.content.housingSales).toBeUndefined();
  expect(pkg.content.facilities[0].type).toBe("home");
  const saved = restore(serialize(g));
  expect(saved.housingSales).toEqual(g.housingSales);
  for (let i = 0; i < 100; i++) update(saved, 0.05);
  expect(saved.housingSales).toHaveLength(1);
  saved.housingSales[0].amount++;
  expect(() => validateHousing(saved)).toThrow();
});
test("scenery adds value and transport benefit does not stack", () => {
  const g = createGame(),
    lot = { c: 25, r: 15 };
  const plain = lotValue(
    g,
    lot,
    () => true,
    () => "rough",
  );
  const scenic = lotValue(
    g,
    lot,
    () => true,
    (g, c, r) => (c === 25 ? "water" : "tree"),
  );
  expect(scenic.base).toBeGreaterThan(plain.base);
  g.facilities.push({ type: "marina" }, { type: "helipad" });
  expect(
    lotValue(
      g,
      lot,
      () => true,
      () => "rough",
    ).bonus,
  ).toBe(750);
  expect(
    lotValue(
      g,
      lot,
      () => false,
      () => "rough",
    ).bonus,
  ).toBe(0);
});
test("vacant lots require a completed visitor and do not sell during locked play", () => {
  const g = createGame();
  build(g, "building-lot", 12, 14);
  for (let c = 7; c <= 12; c++) build(g, "path", c, 12);
  update(g, 10);
  expect(g.housingSales || []).toHaveLength(0);
  g.guestRoster.push({ id: 123, name: "Test", rounds: 1 });
  update(g, 10, false);
  expect(g.housingSales || []).toHaveLength(0);
});

test("browser builds a marked lot from the Resort palette", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#loading").waitFor({ state: "hidden" });
  await page.locator("#pause").click();
  await page.locator('[data-palette="resort"]').click();
  await page.locator('[data-tool="building-lot"]').click();
  const p = await page.evaluate(() => window.__gameTest.project(-19, -5));
  await page.mouse.click(p.x, p.y);
  expect(
    await page.evaluate(() => window.__gameTest.getState().facilities[0]?.type),
  ).toBe("building-lot");
  await page.mouse.move(10, 10);
  await page.screenshot({ path: "/tmp/simgolf-building-lot.png" });
  await page.addInitScript(() => {
    const g = JSON.parse(localStorage.getItem('simgolf-reborn.course.v1'));
    g.facilities[0].type = 'home';
    localStorage.setItem('simgolf-reborn.course.v1', JSON.stringify(g));
  });
  await page.reload();
  await page.locator('#loading').waitFor({state:'hidden'});
  expect(await page.evaluate(()=>window.__gameTest.getState().facilities[0]?.type)).toBe('home');
  await page.screenshot({path:'/tmp/simgolf-home.png'});

});
