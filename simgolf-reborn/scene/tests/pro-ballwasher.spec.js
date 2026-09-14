import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  startPractice,
  useBallwasher,
  update,
  restore,
  serialize,
} from "../src/simulation/game.js";
import { createSession } from "../src/simulation/session.js";
import { demolitionCheck } from "../src/simulation/course-edit.js";
import { key } from "../src/simulation/world.js";
const advance = (g, s) => {
  for (let i = 0; i < s / 0.05; i++) update(g, 0.05);
};
function course() {
  const g = createGame();
  for (const [t, c, r] of [
    ["tee", 7, 20],
    ["green", 36, 5],
    ["ballwasher", 11, 12],
  ])
    expect(build(g, t, c, r).ok).toBe(true);
  for (let c = 8; c <= 11; c++) build(g, "path", c, 11);
  startPractice(g);
  return g;
}
test("pro visits washer during a hole and returns to unchanged ball without a stroke", () => {
  const g = course(),
    v = g.pro;
  v.strokes = 2;
  const from = { ...v.ball };
  expect(useBallwasher(g).ok).toBe(true);
  expect(v.cleanedHoleId).toBeUndefined();
  expect(demolitionCheck(g, 11, 12).ok).toBe(false);
  for (let i = 0; i < 3000 && v.phase !== "service"; i++) update(g, 0.05);
  expect(v.phase).toBe("service");
  const copy = restore(serialize(g));
  advance(g, 40);
  advance(copy, 40);
  expect(serialize(g)).toBe(serialize(copy));
  expect(v.phase).toBe("address");
  expect(v.pos).toEqual(from);
  expect(v.ball).toEqual(from);
  expect(v.strokes).toBe(2);
  expect(v.cleanedHoleId).toBe(v.holeId);
  expect(useBallwasher(g).ok).toBe(false);
});
test("disconnect cancels cleaning and golfer returns without benefit", () => {
  const g = course();
  useBallwasher(g);
  for (let i = 0; i < 3000 && g.pro.phase !== "service"; i++) update(g, 0.05);
  delete g.tiles[key(8, 11)];
  advance(g, 40);
  expect(g.pro.phase).toBe("address");
  expect(g.pro.cleanedHoleId).toBeUndefined();
  expect(g.facilities[0].served).toBe(0);
});
test("only controlling golfer can clean; retries and locked courses use authoritative commands", () => {
  const g = course(),
    host = createSession(g, { courseLocked: true }),
    owner = { id: "alice", role: "golfer" };
  g.pro.ownerId = owner.id;
  const other = { id: "bob", role: "golfer" };
  expect(
    host.execute(host.nextCommand(other.id, "use-ballwasher"), other).ok,
  ).toBe(false);
  const cmd = host.nextCommand(owner.id, "use-ballwasher"),
    first = host.execute(cmd, owner);
  expect(first.ok).toBe(true);
  expect(host.execute(cmd, owner)).toEqual(first);
});
test("Clean ball control starts real walking in browser", async ({ page }) => {
  const g = course();
  await page.addInitScript(
    (s) => localStorage.setItem("simgolf-reborn.course.v1", s),
    serialize(g),
  );
  await page.goto("/");
  await page.waitForFunction(() => window.__gameTest);
  await page.locator("#pause").click();
  await page.locator('[data-mode="play"]').click();
  await page.locator("#wash-ball").click();
  expect(
    await page.evaluate(
      () => window.__gameTest.getState().pro.serviceContinuation,
    ),
  ).toBe("return-ball");
  await page.screenshot({ path: "../graphics/samples/pro-ballwasher.png" });
});
