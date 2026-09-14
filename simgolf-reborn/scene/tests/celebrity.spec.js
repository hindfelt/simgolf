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
} from "../src/simulation/game.js";
import { createSession } from "../src/simulation/session.js";
import { RULES } from "../src/simulation/rules.js";
import { staffWage } from "../src/simulation/maintenance.js";
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
test("Celebrity requires six completed layouts and hiring retries charge once", () => {
  const small = course(5),
    cash = small.cash;
  expect(hire(small, "celebrity").ok).toBe(false);
  expect(small.cash).toBe(cash);
  expect(small.staff).toHaveLength(0);
  const g = course(),
    session = createSession(g),
    owner = { id: "owner", role: "owner" };
  const before = g.cash,
    cmd = session.nextCommand(owner.id, "hire-celebrity", {});
  const result = session.execute(cmd, owner);
  expect(result.ok).toBe(true);
  expect(createSession(restore(serialize(g))).execute(cmd, owner)).toEqual(
    result,
  );
  expect(g.cash).toBe(before - RULES.celebrityHireCost);
  expect(staffWage(g.staff[0])).toBe(RULES.celebrityWage);
  const spectator = { id: "watcher", role: "spectator" };
  expect(
    session.execute(
      session.nextCommand(spectator.id, "hire-celebrity", {}),
      spectator,
    ).ok,
  ).toBe(false);
  expect(g.staff).toHaveLength(1);
});
test("Celebrity welcome is stronger and mixed greeters cannot stack repeated rewards", () => {
  for (const roles of [
    ["club-pro", "celebrity", "celebrity"],
    ["celebrity", "club-pro", "celebrity"],
  ]) {
    const g = course();
    openHole(g, g.holes[0].id);
    while (!g.guests.length) update(g, 0.05);
    const v = g.guests[0],
      happiness = v.happiness,
      positive = v.holeReactions.positive;
    for (const role of roles) expect(hire(g, role).ok).toBe(true);
    update(g, 0.05);
    expect(v.happiness).toBe(happiness + 2);
    expect(v.holeReactions.positive).toBe(positive + 2);
    expect(v.comment).toContain("celebrity");
    const served = g.staff.map((s) => s.served),
      copy = restore(serialize(g));
    for (let i = 0; i < 30; i++) {
      update(g, 0.05);
      update(copy, 0.05);
    }
    expect(g.staff.map((s) => s.served)).toEqual(served);
    expect(
      v.happinessReactions.filter((r) => r === "celebrity-welcome"),
    ).toHaveLength(1);
    expect(serialize(copy)).toBe(serialize(g));
    const bad = structuredClone(g);
    bad.staff.find((s) => s.role === "celebrity").phase = "refreshing";
    expect(() => restore(serialize(bad))).toThrow();
  }
});
test("phone unlocks Celebrity hiring at six holes and preserves the employee", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((save) => {
    if (!localStorage.getItem("simgolf-reborn.course.v1"))
      localStorage.setItem("simgolf-reborn.course.v1", save);
  }, serialize(course()));
  await page.goto("/");
  await page.waitForFunction(() => !!window.__gameTest);
  await page.locator('[data-mode="staff"]').click();
  await expect(page.locator("#hire-celebrity")).toBeEnabled();
  await page.locator("#hire-celebrity").click();
  await expect(page.locator("#live-details")).toContainText("Celebrity 1");
  await expect(page.locator("#live-details")).toContainText("golfers welcomed");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "../graphics/samples/celebrity-phone.png" });
  await page.reload();
  await page.waitForFunction(() => !!window.__gameTest);
  expect(
    await page.evaluate(() => window.__gameTest.getState().staff[0]?.role),
  ).toBe("celebrity");
});
