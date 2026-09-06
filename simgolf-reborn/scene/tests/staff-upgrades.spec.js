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
  upgradeStaff,
  renameStaff,
} from "../src/simulation/game.js";
import { createSession } from "../src/simulation/session.js";
import { staffUpgrade } from "../src/simulation/staff-upgrades.js";
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
test("upgrades preserve employee identity, position and work history, with transactional retries", () => {
  for (const role of ["groundskeeper", "club-pro", "vendor"]) {
    const g = course();
    hire(g, role);
    const employee = g.staff[0];
    renameStaff(g, employee.id, "Robin");
    employee.served = 3;
    employee.removed = 4;
    const before = structuredClone(employee),
      cash = g.cash,
      upgrade = staffUpgrade(employee);
    const session = createSession(g),
      owner = { id: "owner", role: "owner" },
      cmd = session.nextCommand(owner.id, "upgrade-staff", {
        staffId: employee.id,
      });
    const result = session.execute(cmd, owner);
    expect(result.ok).toBe(true);
    expect(employee).toEqual({ ...before, role: upgrade.role });
    expect(g.cash).toBe(cash - upgrade.cost);
    const copy = restore(serialize(g));
    expect(createSession(copy).execute(cmd, owner)).toEqual(result);
    expect(copy.staff).toHaveLength(1);
    expect(copy.cash).toBe(g.cash);
    expect(upgradeStaff(g, employee.id).ok).toBe(false);
  }
});
test("upgrade gate, funds and permissions reject without mutation", () => {
  const g = course(5);
  hire(g);
  expect(upgradeStaff(g, g.staff[0].id).ok).toBe(false);
  const full = course();
  hire(full);
  full.cash = 0;
  const before = serialize(full);
  expect(upgradeStaff(full, full.staff[0].id).ok).toBe(false);
  expect(serialize(full)).toBe(before);
  const session = createSession(g),
    watcher = { id: "watcher", role: "spectator" };
  expect(
    session.execute(
      session.nextCommand(watcher.id, "upgrade-staff", {
        staffId: g.staff[0].id,
      }),
      watcher,
    ).ok,
  ).toBe(false);
});
test("vendor can upgrade during service without losing the customer or duplicating the drink", () => {
  const g = course();
  openHole(g, g.holes[0].id);
  while (!g.guests.length) update(g, 0.05);
  for (const v of g.guests) v.thirst = 90;
  hire(g, "vendor");
  const s = g.staff[0];
  for (let i = 0; i < 2000 && s.phase !== "refreshing"; i++) update(g, 0.05);
  expect(s.phase).toBe("refreshing");
  const target = s.target,
    v = g.guests.find((v) => v.id === target);
  expect(upgradeStaff(g, s.id).ok).toBe(true);
  expect(v.refreshmentStaffId).toBe(s.id);
  const copy = restore(serialize(g));
  for (let i = 0; i < 100 && s.served === 0; i++) {
    update(g, 0.05);
    update(copy, 0.05);
  }
  expect(s.served).toBe(1);
  expect(v.refreshmentStaffId).toBeUndefined();
  expect(g.stats.services).toBe(1);
  expect(serialize(copy)).toBe(serialize(g));
});
test("phone upgrades selected staff and preserves the name on reload", async ({
  page,
}) => {
  const g = course();
  hire(g, "club-pro");
  renameStaff(g, g.staff[0].id, "Robin");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((save) => {
    if (!localStorage.getItem("simgolf-reborn.course.v1"))
      localStorage.setItem("simgolf-reborn.course.v1", save);
  }, serialize(g));
  await page.goto("/");
  await page.waitForFunction(() => !!window.__gameTest);
  await page.locator('[data-mode="staff"]').click();
  await expect(page.locator("#staff-upgrade")).toContainText("Celebrity");
  await page.locator("#staff-upgrade").click();
  await expect(page.locator("#staff-upgrade")).toBeDisabled();
  await expect(page.locator("#staff-name")).toHaveValue("Robin");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "../graphics/samples/staff-upgrade-phone.png",
  });
  await page.reload();
  await page.waitForFunction(() => !!window.__gameTest);
  expect(
    await page.evaluate(() => window.__gameTest.getState().staff[0].role),
  ).toBe("celebrity");
});
