import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  openHole,
  update,
  restore,
  serialize,
} from "../src/simulation/game.js";
import { enjoyFlowers } from "../src/simulation/scenery.js";
import {
  exportCourse,
  coursePractice,
} from "../src/simulation/course-package.js";
const advance = (g, n) => {
  for (let i = 0; i < n / 0.05; i++) update(g, 0.05);
};
function course() {
  const g = createGame();
  for (const [t, c, r] of [
    ["tee", 7, 20],
    ["green", 36, 5],
    ["flowerbed", 5, 17],
  ])
    expect(build(g, t, c, r).ok).toBe(true);
  return g;
}
test("nearby flowers lift spirits once per hole without stacking, remote or paid effects", () => {
  const g = course(),
    v = {
      phase: "walking",
      holeId: "hole-1",
      mood: 50,
      pos: { x: -33, z: 1 },
      paid: false,
    };
  expect(enjoyFlowers(g, v)).toBe(true);
  expect(v.mood).toBe(54);
  expect(enjoyFlowers(g, v)).toBe(false);
  v.holeId = "hole-2";
  v.pos = { x: 30, z: 0 };
  expect(enjoyFlowers(g, v)).toBe(false);
  v.pos = { x: -33, z: 1 };
  v.mood = 99;
  expect(enjoyFlowers(g, v)).toBe(true);
  expect(v.mood).toBe(100);
  v.holeId = "hole-3";
  v.paid = true;
  expect(enjoyFlowers(g, v)).toBe(false);
});
test("real walkers notice beds, saves do not repeat appreciation, layouts include flowers", async () => {
  const g = course();
  openHole(g);
  for (
    let i = 0;
    i < 1200 && !g.guests.some((v) => v.flowerHoleId === "hole-1");
    i++
  )
    update(g, 0.05);
  expect(g.guests.some((v) => v.flowerHoleId === "hole-1")).toBe(true);
  const copy = restore(serialize(g));
  advance(g, 30);
  advance(copy, 30);
  expect(serialize(g)).toBe(serialize(copy));
  const pkg = await exportCourse(g);
  expect(coursePractice(pkg).facilities[0].type).toBe("flowerbed");
  const bad = JSON.parse(serialize(g));
  bad.guests[0].flowerHoleId = "hole-missing";
  expect(() => restore(JSON.stringify(bad))).toThrow("flower appreciation");
});
test("flowerbeds can be built through the illustrated palette", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.__gameTest);
  await page.locator("#pause").click();
  await page.locator('[data-tool="flowerbed"]').click();
  for (const x of [-25, -23, -21]) {
    const p = await page.evaluate((x) => window.__gameTest.project(x, 1), x);
    await page.mouse.click(p.x, p.y);
  }
  expect(
    await page.evaluate(
      () =>
        window.__gameTest
          .getState()
          .facilities.filter((f) => f.type === "flowerbed").length,
    ),
  ).toBe(3);
  await page.screenshot({ path: "../graphics/samples/flowerbeds.png" });
});
