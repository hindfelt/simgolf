import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  openHole,
  hire,
  update,
  restore,
  serialize,
  repositionStaff,
  dismissStaff,
} from "../src/simulation/game.js";
import { createSession } from "../src/simulation/session.js";
import { RULES } from "../src/simulation/rules.js";
import { staffWage } from "../src/simulation/maintenance.js";
function course() {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 36, 5);
  openHole(g);
  while (!g.guests.length) update(g, 0.05);
  return g;
}
test("Club Pro welcomes real arrivals once, with persistent happiness and fun credit", () => {
  const g = course(),
    v = g.guests[0];
  const before = v.happiness,
    positive = v.holeReactions.positive;
  expect(hire(g, "club-pro").ok).toBe(true);
  expect(hire(g, "club-pro").ok).toBe(true);
  update(g, 0.05);
  expect(v.happiness).toBe(before + 1);
  expect(v.holeReactions.positive).toBe(positive + 1);
  expect(v.comment).toContain("club pro");
  expect(g.staff.reduce((n, s) => n + s.served, 0)).toBe(2);
  const copy = restore(serialize(g));
  for (let i = 0; i < 100; i++) {
    update(g, 0.05);
    update(copy, 0.05);
  }
  expect(
    v.happinessReactions.filter((r) => r === "club-pro-welcome"),
  ).toHaveLength(1);
  expect(serialize(copy)).toBe(serialize(g));
  for (const s of [...g.staff]) dismissStaff(g, s.id);
  expect(v.happinessReactions).toContain("club-pro-welcome");
});
test("a Club Pro travels to an assigned area before greeting, and uses its wage", () => {
  const g = course(),
    v = g.guests[0];
  v.pos = { ...g.holes[0].tee };
  v.phase = "address";
  v.path = [];
  v.wait = -100;
  hire(g, "club-pro");
  const pro = g.staff[0];
  update(g, 0.05);
  expect(v.happinessReactions).not.toContain("club-pro-welcome");
  expect(repositionStaff(g, pro.id, 7, 20).ok).toBe(true);
  for (
    let i = 0;
    i < 1000 && !v.happinessReactions.includes("club-pro-welcome");
    i++
  )
    update(g, 0.05);
  expect(pro.phase).toBe("idle");
  expect(v.happinessReactions).toContain("club-pro-welcome");
  expect(staffWage(pro)).toBe(RULES.clubProWage);
  const bad = structuredClone(g);
  bad.staff[0].phase = "cleaning";
  expect(() => restore(serialize(bad))).toThrow();
});
test("Club Pro hire validates permissions and retry receipts through reload", () => {
  const g = course(),
    session = createSession(g),
    owner = { id: "owner", role: "owner" };
  const spectator = { id: "watcher", role: "spectator" };
  expect(
    session.execute(
      session.nextCommand(spectator.id, "hire-club-pro", {}),
      spectator,
    ).ok,
  ).toBe(false);
  const cash = g.cash,
    command = session.nextCommand(owner.id, "hire-club-pro", {});
  const result = session.execute(command, owner);
  expect(result.ok).toBe(true);
  const copy = restore(serialize(g));
  expect(createSession(copy).execute(command, owner)).toEqual(result);
  expect(copy.staff).toHaveLength(1);
  expect(copy.cash).toBe(cash - RULES.clubProHireCost);
});
test("phone staff controls hire and save a Club Pro", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForFunction(() => !!window.__gameTest);
  await page.locator('[data-mode="staff"]').click();
  await page.locator("#hire-club-pro").click();
  await expect
    .poll(() =>
      page.evaluate(() => window.__gameTest.getState().staff[0]?.role),
    )
    .toBe("club-pro");
  await expect(page.locator("#live-details")).toContainText("golfers welcomed");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "../graphics/samples/club-pro-phone.png" });
  await page.reload();
  await page.waitForFunction(() => !!window.__gameTest);
  expect(
    await page.evaluate(() => window.__gameTest.getState().staff[0]?.role),
  ).toBe("club-pro");
});
