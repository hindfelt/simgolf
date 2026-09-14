import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  openHole,
  update,
  serialize,
  restore,
  hire,
  repositionStaff,
  dismissStaff,
} from "../src/simulation/game.js";
import { createSession } from "../src/simulation/session.js";
import { isMotivated } from "../src/simulation/rangers.js";
import { RULES } from "../src/simulation/rules.js";
function course() {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 36, 5);
  openHole(g);
  while (!g.guests.length) update(g, 0.05);
  const v = g.guests[0];
  v.pos = { ...g.holes[0].tee };
  v.path = [];
  v.phase = "address";
  v.wait = -100;
  return { g, v };
}
test("hired Ranger walks to assigned tee, motivates, speeds preparation, and restores mid-shot exactly", () => {
  const { g, v } = course(),
    s = createSession(g),
    owner = { id: "owner", role: "owner" },
    cash = g.cash;
  const cmd = s.nextCommand(owner.id, "hire-ranger", {});
  const result = s.execute(cmd, owner);
  expect(result.ok).toBe(true);
  expect(s.execute(cmd, owner)).toEqual(result);
  expect(g.cash).toBe(cash - RULES.rangerHireCost);
  const ranger = g.staff[0];
  expect(repositionStaff(g, ranger.id, 7, 20).ok).toBe(true);
  expect(isMotivated(g, v)).toBe(false);
  for (let i = 0; i < 1000 && !isMotivated(g, v); i++) update(g, 0.05);
  expect(isMotivated(g, v)).toBe(true);
  expect(ranger.served).toBeGreaterThan(0);
  v.wait = 0.9;
  update(g, 0.05);
  expect(v.shot).toBeTruthy();
  const copy = restore(serialize(g));
  for (let i = 0; i < 100; i++) {
    update(g, 0.05);
    update(copy, 0.05);
  }
  expect(serialize(copy)).toBe(serialize(g));
});
test("motivation increases actual walking pace, expires, and multiple Rangers do not stack it", () => {
  const { g, v } = course();
  hire(g, "ranger");
  hire(g, "ranger");
  for (const s of g.staff) s.pos = { ...v.pos };
  update(g, 0.05);
  expect(g.staff.reduce((n, s) => n + s.served, 0)).toBe(1);
  const until = v.motivatedUntil;
  update(g, 0.05);
  expect(v.motivatedUntil).toBe(until);
  for (const s of [...g.staff]) dismissStaff(g, s.id);
  const baseline = restore(serialize(g));
  delete baseline.guests[0].motivatedUntil;
  for (const world of [g, baseline]) {
    const p = world.guests[0];
    p.pos = { x: 10, z: 10 };
    p.path = [{ x: 20, z: 10 }];
    p.phase = "walking";
    p.afterWalk = "address";
  }
  update(g, 0.2);
  update(baseline, 0.2);
  expect(v.pos.x).toBeGreaterThan(baseline.guests[0].pos.x);
  while (g.time <= until) update(g, 0.05);
  expect(isMotivated(g, v)).toBe(false);
});
test("spectators cannot hire Rangers and malformed motivation deadlines reject", () => {
  const { g } = course(),
    s = createSession(g),
    spectator = { id: "watcher", role: "spectator" };
  expect(
    s.execute(s.nextCommand(spectator.id, "hire-ranger", {}), spectator).ok,
  ).toBe(false);
  expect(g.staff).toHaveLength(0);
  for (const value of [-1, g.time + RULES.rangerMotivationSeconds + 1]) {
    const bad = structuredClone(g);
    bad.guests[0].motivatedUntil = value;
    expect(() => restore(JSON.stringify(bad))).toThrow();
  }
});
test("phone staff controls hire and retain a Ranger on reload", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForFunction(() => !!window.__gameTest);
  await page.locator('[data-mode="staff"]').click();
  await page.locator("#hire-ranger").click();
  await expect
    .poll(() =>
      page.evaluate(() => window.__gameTest.getState().staff[0]?.role),
    )
    .toBe("ranger");
  await expect(page.locator("#live-details")).toContainText(
    "golfers motivated",
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "../graphics/samples/ranger-phone.png" });
  await page.reload();
  await page.waitForFunction(() => !!window.__gameTest);
  expect(
    await page.evaluate(() => window.__gameTest.getState().staff[0].role),
  ).toBe("ranger");
});
