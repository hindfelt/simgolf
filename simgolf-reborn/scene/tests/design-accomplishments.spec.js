import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  openHole,
  update,
  serialize,
  restore,
} from "../src/simulation/game.js";
import { createSession } from "../src/simulation/session.js";
function course() {
  const g = createGame(8);
  build(g, "tee", 7, 20);
  build(g, "green", 23, 17);
  for (let c = 9; c <= 21; c++) build(g, "fairway", c, 19);
  return g;
}
function observations(g, advantages) {
  const h = g.holes[0];
  h.stats.evaluation.cohorts = {};
  h.stats.completed = 0;
  h.stats.strokes = 0;
  for (let mask = 0; mask < 8; mask++) {
    const strokes =
      100 *
      (6 -
        advantages.reduce((sum, a, i) => sum + (mask & (1 << i) ? a : 0), 0));
    // The live original report consumes integer score histograms, not just means.
    const mean=strokes/100,low=Math.floor(mean),highCount=Math.round((mean-low)*100);
    const scoreCounts={[low]:100-highCount};
    if(highCount)scoreCounts[low+1]=highCount;
    h.stats.evaluation.cohorts[mask] = {
      scoreCounts,
      count: 100,
      strokes,
      seconds: 1000,
      mood: 5000,
    };
    h.stats.completed += 100;
    h.stats.strokes += strokes;
  }
  g.stats.holesCompleted = h.stats.completed;
  g.stats.strokes = h.stats.strokes;
}
test("actual visitor scores earn a design accomplishment, retained through exact future replay", () => {
  const g = course();
  openHole(g);
  for (let i = 0; i < 4000 && !g.accomplishments.length; i++) update(g, 0.05);
  expect(g.accomplishments.map((r) => r.id)).toContain("first-challenge");
  expect(g.holes[0].stats.completed).toBeGreaterThan(0);
  expect(g.proProfile.points).toBe(13);
  const copy = restore(serialize(g));
  for (let i = 0; i < 2000; i++) {
    update(g, 0.05);
    update(copy, 0.05);
  }
  expect(serialize(copy)).toBe(serialize(g));
  expect(
    g.accomplishments.filter((r) => r.id === "first-challenge"),
  ).toHaveLength(1);
});
test("all four supported design awards use cohort comparisons and remain earned when ratings change", () => {
  const g = course();
  update(g, 0.05);
  expect(g.accomplishments).toEqual([]);
  for (const [id, ratings] of [
    ["first-challenge", [0.75, 0.75, 0]],
    ["first-heroic", [0.75, 0, 0.75]],
    ["first-strategic", [0, 0.75, 0.75]],
    ["first-classic", [1.25, 1.25, 1.25]],
  ]) {
    observations(g, ratings);
    update(g, 0.05);
    expect(g.accomplishments.map((r) => r.id)).toContain(id);
    expect(restore(serialize(g)).accomplishments).toEqual(g.accomplishments);
  }
  expect(g.proProfile.points).toBe(22);
  observations(g, [0, 0, 0]);
  update(g, 0.05);
  expect(g.accomplishments).toHaveLength(4);
  observations(g, [1, 1, 1]);
  update(g, 0.05);
  expect(g.proProfile.points).toBe(22);
});
test("missing comparisons do not award; original weakest-skill ties and milestone migration are preserved", () => {
  const g = course();
  g.holes[0].stats.evaluation.cohorts = {
    0: { count: 1, strokes: 6, seconds: 10, mood: 50 },
  };
  g.holes[0].stats.completed = 1;
  g.holes[0].stats.strokes = 6;
  update(g, 0.05);
  expect(g.accomplishments).toEqual([]);
  observations(g, [0.75, 0.75, 0.75]);
  update(g, 0.05);
  expect(g.accomplishments.map(a=>a.id)).toEqual(["first-strategic"]);
  createSession(g);
  g.accomplishments = [{ id: "nine-holes", at: 0 }];
  g.proProfile.points = 13;
  const old = structuredClone(g);
  old.protocol.version = 38;
  old.protocol.ruleset = "prototype-course-accomplishments-2026-09-06";
  const loaded = restore(JSON.stringify(old));
  expect(loaded.accomplishments).toEqual(g.accomplishments);
  expect(loaded.proProfile.points).toBe(13);
});
test("phone report includes a design award earned by real visitors", async ({
  page,
}) => {
  const g = course();
  openHole(g);
  for (let i = 0; i < 4000 && !g.accomplishments.length; i++) update(g, 0.05);
  await page.addInitScript((save) => {
    if (!localStorage.getItem("simgolf-reborn.course.v1"))
      localStorage.setItem("simgolf-reborn.course.v1", save);
  }, serialize(g));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForFunction(() => !!window.__gameTest);
  await page.keyboard.press("F10");
  await expect(page.locator("#accomplishments-content")).toContainText(
    "✓ First challenge hole",
  );
  await expect(page.locator("#accomplishments-content")).toContainText(
    "○ First classic hole",
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "../graphics/samples/design-accomplishments-phone.png",
  });
});
