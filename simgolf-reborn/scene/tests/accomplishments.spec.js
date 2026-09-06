import { removeHole } from "../src/simulation/course-edit.js";
import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  addHole,
  update,
  par,
  serialize,
  restore,
} from "../src/simulation/game.js";
import { allocateProSkill } from "../src/simulation/pro-skills.js";
import { exportGolfer, loadGolfer } from "../src/simulation/golfer-package.js";
import { createSession } from "../src/simulation/session.js";
const layout = [
  [13, 2, 20, 2],
  [24, 2, 24, 9],
  [27, 2, 34, 2],
  [30, 2, 30, 9],
  [38, 2, 38, 9],
  [16, 4, 16, 11],
  [15, 7, 10, 12],
  [34, 7, 34, 14],
  [42, 7, 42, 14],
  [20, 9, 20, 16],
  [3, 10, 3, 17],
  [34, 10, 29, 15],
  [20, 12, 15, 17],
  [3, 13, 8, 18],
  [25, 13, 25, 20],
  [38, 15, 33, 20],
  [25, 16, 20, 21],
  [37, 18, 37, 25],
];
function buildNext(g, i) {
  if (i) expect(addHole(g).ok).toBe(true);
  const [tc, tr, gc, gr] = layout[i],
    id = g.holes[i].id;
  expect(build(g, "tee", tc, tr, 1, id).ok).toBe(true);
  expect(build(g, "green", gc, gr, 1, id).ok).toBe(true);
}
test("real course milestones award once, persist after demolition, and fund portable skill allocation", () => {
  const g = createGame();
  for (let i = 0; i < 8; i++) buildNext(g, i);
  update(g, 0.05);
  expect(g.proProfile.points).toBe(10);
  buildNext(g, 8);
  update(g, 0.05);
  expect(g.accomplishments.map((r) => r.id)).toEqual(["nine-holes"]);
  expect(g.proProfile.points).toBe(13);
  for (let i = 9; i < 18; i++) buildNext(g, i);
  update(g, 0.05);
  expect(g.proProfile.points).toBe(16);
  const copy = restore(serialize(g));
  for (let i = 0; i < 20; i++) {
    update(g, 0.05);
    update(copy, 0.05);
  }
  expect(serialize(copy)).toBe(serialize(g));
  expect(g.proProfile.points).toBe(16);
  for (let i = 0; i < 10; i++)
    expect(allocateProSkill(g, "power", 1).ok).toBe(true);
  for (let i = 0; i < 6; i++)
    expect(allocateProSkill(g, "irons", 1).ok).toBe(true);
  expect(allocateProSkill(g, "irons", 1).ok).toBe(false);
  const other = createGame();
  expect(loadGolfer(other, exportGolfer(g)).ok).toBe(true);
  expect(other.proProfile).toEqual(g.proProfile);
  // Removing a green cannot erase an earned milestone or allow earning it twice.
  const hole = g.holes[17];
  expect(removeHole(g, hole.id).ok).toBe(true);
  update(g, 0.05);
  expect(g.proProfile.points).toBe(16);
  expect(restore(serialize(g)).accomplishments).toHaveLength(2);
  buildNext(g, 17);
  update(g, 0.05);
  expect(g.proProfile.points).toBe(16);
});
test("first par five uses calculated yardage; locked practice never earns resort awards", () => {
  const g = createGame();
  expect(build(g, "tee", 2, 37).ok).toBe(true);
  expect(build(g, "green", 40, 2).ok).toBe(true);
  expect(par(g)).toBe(5);
  const locked = restore(serialize(g));
  locked.courseLocked = true;
  update(locked, 0.05);
  expect(locked.accomplishments).toEqual([]);
  update(g, 0.05);
  expect(g.accomplishments[0].id).toBe("par-five");
  expect(g.proProfile.points).toBe(13);
  update(g, 0.05);
  expect(g.proProfile.points).toBe(13);
});
test("old resorts migrate without invented past awards; malformed records reject", () => {
  const g = createGame();
  createSession(g);
  const old = structuredClone(g);
  old.protocol.version = 37;
  old.protocol.ruleset = "prototype-complaint-dandelions-2026-09-06";
  delete old.accomplishments;
  expect(restore(JSON.stringify(old)).accomplishments).toEqual([]);
  for (const records of [
    [{ id: "unknown", at: 0 }],
    [{ id: "par-five", at: 1 }],
    [
      { id: "par-five", at: 0 },
      { id: "par-five", at: 0 },
    ],
  ]) {
    const bad = structuredClone(g);
    bad.accomplishments = records;
    expect(() => restore(JSON.stringify(bad))).toThrow(/accomplishment/i);
  }
});
test("phone accomplishment report shows earned points and the real skill controls spend them", async ({
  page,
}) => {
  const g = createGame();
  for (let i = 0; i < 9; i++) buildNext(g, i);
  update(g, 0.05);
  await page.addInitScript((save) => {
    if (!localStorage.getItem("simgolf-reborn.course.v1"))
      localStorage.setItem("simgolf-reborn.course.v1", save);
  }, serialize(g));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForFunction(() => !!window.__gameTest);
  await page.keyboard.press("F10");
  await expect(page.locator("#accomplishments-content")).toContainText(
    "13 skill points available",
  );
  await expect(page.locator("#accomplishments-content")).toContainText(
    "✓ First nine-hole course",
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "../graphics/samples/accomplishments-phone.png",
  });
  await page.getByLabel("Close accomplishments").click();
  await page.locator('[data-mode="play"]').click();
  await page.locator("#pro-skills").click();
  await page
    .getByRole("button", { name: "Increase Power Hitter", exact: true })
    .click();
  await expect(page.locator("#skill-points")).toHaveText(
    "12 skill points available",
  );
  await page.reload();
  await page.waitForFunction(() => !!window.__gameTest);
  expect(
    await page.evaluate(() => window.__gameTest.getState().proProfile.points),
  ).toBe(13);
});
