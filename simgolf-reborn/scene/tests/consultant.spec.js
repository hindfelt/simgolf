import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  addHole,
  openHole,
  hire,
  update,
  serialize,
  restore,
  dismissStaff,
  repositionStaff,
} from "../src/simulation/game.js";
import { createSession } from "../src/simulation/session.js";
import { RULES } from "../src/simulation/rules.js";
function course(count = 6) {
  const g = createGame();
  const layout = [
    [13, 2, 20, 2],
    [24, 2, 24, 9],
    [27, 2, 34, 2],
    [30, 2, 30, 9],
    [38, 2, 38, 9],
    [16, 4, 16, 11],
  ];
  for (const [i, [tc, tr, gc, gr]] of layout.slice(0, count).entries()) {
    if (i) expect(addHole(g).ok).toBe(true);
    expect(build(g, "tee", tc, tr, 1, g.holes[i].id).ok).toBe(true);
    expect(build(g, "green", gc, gr, 1, g.holes[i].id).ok).toBe(true);
  }
  return g;
}
function serving() {
  const g = course();
  openHole(g, g.holes[0].id);
  while (!g.guests.length) update(g, 0.05);
  for (const v of g.guests) v.thirst = 0;
  expect(hire(g, "consultant").ok).toBe(true);
  for (let i = 0; i < 2000 && g.staff[0].phase !== "refreshing"; i++)
    update(g, 0.05);
  expect(g.staff[0].phase).toBe("refreshing");
  return g;
}
test("consultant serves an unthirsty golfer and restores mid-service exactly", () => {
  const g = serving(),
    s = g.staff[0],
    v = g.guests.find((v) => v.id === s.target);
  expect(v.thirst).toBeLessThan(RULES.vendorThirst);
  const happiness = v.happiness,
    copy = restore(serialize(g));
  for (let i = 0; i < 100 && s.served === 0; i++) {
    update(g, 0.05);
    update(copy, 0.05);
  }
  expect(s.served).toBe(1);
  expect(v.happiness).toBe(happiness + 1);
  expect(v.happinessReactions).toContain(`consultant:${v.holeId}`);
  expect(v.refreshmentStaffId).toBeUndefined();
  expect(serialize(copy)).toBe(serialize(g));
  const count = v.happinessReactions.length;
  for (let i = 0; i < 20; i++) update(g, 0.05);
  expect(
    v.happinessReactions.filter((r) => r.startsWith("consultant:")),
  ).toHaveLength(1);
});
test("consultant dismissal and reposition cancel service and release reservations", () => {
  for (const action of ["dismiss", "move"]) {
    const g = serving(),
      s = g.staff[0],
      v = g.guests.find((v) => v.id === s.target);
    expect(
      action === "dismiss"
        ? dismissStaff(g, s.id).ok
        : repositionStaff(g, s.id, 15, 17).ok,
    ).toBe(true);
    expect(v.refreshmentStaffId).toBeUndefined();
    expect(g.stats.services).toBe(0);
    expect(() => restore(serialize(g))).not.toThrow();
  }
});
test("consultant unlock, permission and duplicate purchase checks", () => {
  expect(hire(course(5), "consultant").ok).toBe(false);
  const g = course(),
    h = createSession(g),
    p = { id: "owner", role: "owner" },
    cash = g.cash;
  const cmd = h.nextCommand(p.id, "hire-consultant", {}),
    result = h.execute(cmd, p);
  expect(result.ok).toBe(true);
  expect(createSession(restore(serialize(g))).execute(cmd, p)).toEqual(result);
  expect(g.cash).toBe(cash - RULES.consultantHireCost);
  const watcher = { id: "watcher", role: "spectator" };
  expect(
    h.execute(h.nextCommand(watcher.id, "hire-consultant", {}), watcher).ok,
  ).toBe(false);
});
test("phone hires and retains a Refreshment Consultant", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((save) => {
    if (!localStorage.getItem("simgolf-reborn.course.v1"))
      localStorage.setItem("simgolf-reborn.course.v1", save);
  }, serialize(course()));
  await page.goto("/");
  await page.waitForFunction(() => !!window.__gameTest);
  await page.locator('[data-mode="staff"]').click();
  await page.locator("#hire-consultant").click();
  await expect(page.locator("#live-details")).toContainText("0 drinks served");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "../graphics/samples/consultant-phone.png" });
  await page.reload();
  await page.waitForFunction(() => !!window.__gameTest);
  expect(
    await page.evaluate(() => window.__gameTest.getState().staff[0]?.role),
  ).toBe("consultant");
});
