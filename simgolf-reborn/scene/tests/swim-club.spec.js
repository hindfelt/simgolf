import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  startingAttitude,
  serialize,
  restore,
} from "../src/simulation/game.js";
import { key } from "../src/simulation/world.js";
import {
  exportCourse,
  coursePractice,
} from "../src/simulation/course-package.js";
import { createSession } from "../src/simulation/session.js";

test("Swim Club needs a connection, shares the recreation benefit and survives export", async () => {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 36, 5);
  expect(build(g, "swim-club", 22, 15, 1, g.holes[0].id, 1).ok).toBe(true);
  expect(startingAttitude(g, 35)).toBe(35);
  for (let c = 8; c <= 22; c++) expect(build(g, "path", c, 11).ok).toBe(true);
  expect(startingAttitude(g, 35)).toBe(60);
  expect(startingAttitude(g, 90)).toBe(90);
  expect(build(g, "snack", 22, 15).ok).toBe(false);
  const copy = coursePractice(await exportCourse(g));
  expect(copy.facilities[0].type).toBe("swim-club");
  expect(copy.facilities[0].rotation).toBe(1);
  expect(startingAttitude(copy, 35)).toBe(60);
  expect(restore(serialize(g)).facilities).toEqual(g.facilities);
  delete g.tiles[key(8, 11)];
  expect(startingAttitude(g, 35)).toBe(35);
});
test("Swim Club purchases are authoritative and retries do not duplicate charges", () => {
  const g = createGame(),
    host = createSession(g),
    actor = { id: "owner", role: "owner" },
    cash = g.cash;
  const cmd = host.nextCommand(actor.id, "build", {
    tool: "swim-club",
    c: 22,
    r: 15,
    brush: 1,
    holeId: g.holes[0].id,
  });
  expect(host.execute(cmd, actor).ok).toBe(true);
  expect(host.execute(cmd, actor).ok).toBe(true);
  expect(g.cash).toBe(cash - 2200);
  expect(g.facilities).toHaveLength(1);
});
test("browser constructs the illustrated Swim Club and reports its path requirement", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#loading").waitFor({ state: "hidden" });
  await page.locator("#pause").click();
  await page.locator('[data-tool="swim-club"]').click();
  const p = await page.evaluate(() => window.__gameTest.project(1, -3));
  await page.mouse.click(p.x, p.y);
  expect(
    await page.evaluate(() => window.__gameTest.getState().facilities[0]?.type),
  ).toBe("swim-club");
  await page.screenshot({ path: "/tmp/simgolf-swim-club.png" });
  await page.locator('[data-mode="reports"]').click();
  await expect(page.locator("#live-details")).toContainText(
    "Swim Club: needs a path",
  );
});
