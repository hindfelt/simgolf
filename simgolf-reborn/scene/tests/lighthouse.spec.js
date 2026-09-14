import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  restore,
  serialize,
} from "../src/simulation/game.js";
import { demolish } from "../src/simulation/course-edit.js";
import {
  exportCourse,
  coursePractice,
} from "../src/simulation/course-package.js";

test("lighthouse occupies dry land, survives sharing and can be removed", async () => {
  const g = createGame(1234, "coast", "links");
  expect(build(g, "lighthouse", 44, 20).ok).toBe(false);
  expect(build(g, "lighthouse", 26, 20).ok).toBe(true);
  expect(g.cash).toBe(48000);
  expect(build(g, "bench", 27, 20).ok).toBe(false);
  expect(build(g, "tee", 7, 20).ok).toBe(true);
  expect(build(g, "green", 22, 10).ok).toBe(true);
  expect(restore(serialize(g)).facilities).toEqual(g.facilities);
  const shared = coursePractice(await exportCourse(g)).facilities;
  expect(shared).toHaveLength(1);
  expect(shared[0]).toMatchObject({ type: "lighthouse", c: 26, r: 20 });
  expect(shared[0].rotation || 0).toBe(g.facilities[0].rotation);
  expect(demolish(g, 26, 20).ok).toBe(true);
  expect(g.facilities).toHaveLength(0);
});

test("lighthouse is available in the toolbar and renders in the playable course", async ({
  page,
}) => {
  const g = createGame(1234, "coast", "links");
  await page.addInitScript(
    (save) => localStorage.setItem("simgolf-reborn.course.v1", save),
    serialize(g),
  );
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.locator("#loading").waitFor({ state: "hidden" });
  await page.locator('[data-tool="lighthouse"]').click();
  const pos = await page.evaluate(() => window.__gameTest.project(9, 7));
  await page.mouse.click(pos.x, pos.y);
  expect(
    await page.evaluate(() =>
      window.__gameTest
        .getState()
        .facilities.some((f) => f.type === "lighthouse"),
    ),
  ).toBe(true);
  await page.screenshot({ path: "/tmp/simgolf-lighthouse.png" });
  expect(errors).toEqual([]);
});
