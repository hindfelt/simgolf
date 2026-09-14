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
import { eligibleVisitors } from "../src/simulation/visitor-pool.js";
test("twelve identities exist before opening; same-name golfers stay distinct and cannot visit twice", () => {
  const g = createGame();
  expect(g.visitorPool).toHaveLength(12);
  expect(g.guestRoster).toEqual([]);
  const ids = g.visitorPool.map((p) => p.id);
  expect(new Set(ids).size).toBe(12);
  expect(createGame().visitorPool).toEqual(g.visitorPool);
  g.visitorPool[1].name = g.visitorPool[0].name;
  build(g, "tee", 7, 20);
  build(g, "green", 22, 10);
  openHole(g);
  while (g.guests.length < 2) update(g, 0.05);
  expect(g.guests.map((v) => v.id)).toEqual(ids.slice(0, 2));
  expect(g.guests[0].name).toBe(g.guests[1].name);
  expect(
    eligibleVisitors(g).some((p) => g.guests.some((v) => v.id === p.id)),
  ).toBe(false);
  const saved = restore(serialize(g));
  expect(saved.visitorPool).toEqual(g.visitorPool);
  for (let i = 0; i < 12000; i++) update(g, 0.05);
  expect(g.visitorPool.map((p) => p.id)).toEqual(ids);
  expect(g.guestRoster).toHaveLength(12);
  expect(g.stats.rounds).toBeGreaterThan(12);
});
test("old courses preserve known identities and current malformed pools reject", () => {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 22, 10);
  openHole(g);
  for (let i = 0; i < 200; i++) update(g, 0.05);
  createSession(g);
  const old = JSON.parse(serialize(g));
  delete old.visitorPool;
  old.protocol.version = 30;
  old.protocol.ruleset = "prototype-tee-spacing-2026-09-06";
  const loaded = restore(JSON.stringify(old));
  expect(loaded.visitorPool).toHaveLength(12);
  expect(loaded.guests).toEqual(g.guests);
  expect(loaded.ledger).toEqual(g.ledger);
  for (const v of g.guests)
    expect(loaded.visitorPool.find((p) => p.id === v.id)?.name).toBe(v.name);
  for (const damage of [
    (s) => delete s.visitorPool,
    (s) => s.visitorPool.push(s.visitorPool[0]),
    (s) => (s.visitorPool[0].profile.skills.length = 1),
  ]) {
    const bad = JSON.parse(serialize(g));
    damage(bad);
    expect(() => restore(JSON.stringify(bad))).toThrow(/visitor pool/i);
  }
});

test("phone roster shows all twelve golfers before their first visit", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForFunction(() => !!window.__gameTest);
  await page.locator('[data-mode="reports"]').click();
  await page.locator("#roster-report").click();
  await expect(page.locator("#roster-content tbody tr")).toHaveCount(12);
  await expect(page.locator("#roster-content")).toContainText("0 have visited");
  await expect(page.locator("#roster-content")).toContainText("Yet to visit");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "../graphics/samples/initial-visitors-phone.png",
  });
});
