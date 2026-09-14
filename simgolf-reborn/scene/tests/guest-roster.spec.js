import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  openHole,
  update,
  serialize,
  restore,
  startPractice,
} from "../src/simulation/game.js";
import { createSession } from "../src/simulation/session.js";
function course() {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 22, 10);
  openHole(g);
  return g;
}
function advance(g, seconds) {
  for (let i = 0; i < seconds * 20; i++) update(g, 0.05);
}
test("roster retains departed golfers and results beyond the recent scorecard limit", () => {
  const g = course();
  while (!g.rounds.length) update(g, 0.05);
  const earliestRound = g.rounds[0].id;
  // This exercises history eviction, not admission throughput. Returning guests
  // can interrupt unhappy visits and still retain their persistent identity.
  for (let i = 0; i < 360000 && g.stats.rounds < 105; i++) update(g, 0.05);
  expect(g.stats.rounds).toBeGreaterThanOrEqual(105);
  expect(g.rounds).toHaveLength(100);
  const first = g.guestRoster[0];
  // The original visit has ended; the same person may already be visiting again.
  expect(g.guests.some((v) => v.roundId === earliestRound)).toBe(false);
  expect(g.rounds.some((v) => v.id === earliestRound)).toBe(false);
  expect(first.rounds).toBeGreaterThanOrEqual(1);
  expect(first.best.holes).toBe(1);
  expect(g.guestRoster.reduce((n, p) => n + p.rounds, 0)).toBe(g.stats.rounds);
  const loaded = restore(serialize(g));
  expect(loaded.guestRoster).toEqual(g.guestRoster);
  advance(g, 10);
  advance(loaded, 10);
  expect(serialize(loaded)).toBe(serialize(g));
  expect(g.guestRoster).toHaveLength(12);
  expect(new Set(g.guestRoster.map((p) => p.id)).size).toBe(12);
});
test("old saves reconstruct known visitors while damaged current rosters reject", () => {
  const g = course();
  advance(g, 160);
  for (let i = 0; i < 6000 && !g.guests.length; i++) update(g, 0.05);
  expect(g.guests.length).toBeGreaterThan(0);
  createSession(g);
  const old = structuredClone(g);
  delete old.guestRoster;
  old.protocol.version = 20;
  old.protocol.ruleset = "prototype-story-reward-2026-09-05";
  expect(restore(JSON.stringify(old)).guestRoster.length).toBeGreaterThan(0);
  for (const damage of [
    (state) => delete state.guestRoster,
    (state) => state.guestRoster.push({ ...state.guestRoster[0] }),
    (state) => (state.guestRoster[0].rounds = -1),
    (state) =>
      (state.guestRoster = state.guestRoster.filter(
        (p) => p.id !== state.guests[0].id,
      )),
  ]) {
    const bad = structuredClone(g);
    damage(bad);
    expect(() => restore(JSON.stringify(bad))).toThrow(/roster/i);
  }
  const practice = createGame();
  build(practice, "tee", 7, 20);
  build(practice, "green", 22, 10);
  startPractice(practice);
  expect(practice.guestRoster).toEqual([]);
});
test("F9 and Reports show saved departed visitors on desktop and phone", async ({
  page,
}) => {
  const g = course();
  advance(g, 160);
  await page.addInitScript(
    (save) => localStorage.setItem("simgolf-reborn.course.v1", save),
    serialize(g),
  );
  await page.goto("/");
  await page.waitForFunction(() => !!window.__gameTest);
  await page.keyboard.press("F9");
  await expect(
    page.getByRole("table", { name: "Membership roster" }),
  ).toBeVisible();
  await expect(page.locator("#roster-content")).toContainText("Departed");
  await expect(page.locator("#roster-content")).toContainText(
    g.guestRoster[0].name,
  );
  await page.getByRole("button", { name: "Close membership roster" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-mode="reports"]').click();
  await page.locator("#roster-report").click();
  await expect(
    page.getByRole("table", { name: "Membership roster" }),
  ).toBeVisible();
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "../graphics/samples/membership-roster-phone.png",
  });
});
