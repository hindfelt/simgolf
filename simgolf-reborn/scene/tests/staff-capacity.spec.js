import { test, expect } from "@playwright/test";
import {
  createGame,
  hire,
  dismissStaff,
  update,
  serialize,
  restore,
} from "../src/simulation/game.js";
import { createSession } from "../src/simulation/session.js";
import { RULES } from "../src/simulation/rules.js";
import { staffWage } from "../src/simulation/maintenance.js";
test("sixteen real employees work, accrue wages and preserve exact future state; excess hiring is transactional", () => {
  const g = createGame(),
    s = createSession(g),
    owner = { id: "owner", role: "owner" };
  for (let i = 0; i < RULES.staffLimit; i++)
    expect(hire(g, ["groundskeeper", "vendor", "ranger"][i % 3]).ok).toBe(true);
  expect(g.staff).toHaveLength(16);
  const before = serialize(g),
    cash = g.cash;
  expect(hire(g).ok).toBe(false);
  expect(serialize(g)).toBe(before);
  const cmd = s.nextCommand(owner.id, "hire-ranger", {}),
    result = s.execute(cmd, owner);
  expect(result.ok).toBe(false);
  expect(s.execute(cmd, owner)).toEqual(result);
  expect(g.cash).toBe(cash);
  const copy = restore(serialize(g)),
    wage = g.staff.reduce((sum, p) => sum + staffWage(p), 0);
  for (let i = 0; i < 1300; i++) {
    update(g, 0.05);
    update(copy, 0.05);
  }
  expect(serialize(copy)).toBe(serialize(g));
  expect(g.cash).toBe(cash - wage);
  expect(g.stats.removed).toBeGreaterThan(0);
  expect(dismissStaff(g, g.staff[0].id).ok).toBe(true);
  expect(hire(g, "ranger").ok).toBe(true);
  expect(restore(serialize(g)).staff).toHaveLength(16);
});
test("over-capacity saves reject and an older three-person course migrates without losing staff", () => {
  const g = createGame();
  for (let i = 0; i < 3; i++) hire(g);
  createSession(g);
  const old = structuredClone(g);
  old.protocol.version = 42;
  old.protocol.ruleset = "prototype-rangers-2026-09-06";
  const loaded = restore(JSON.stringify(old));
  expect(loaded.staff).toEqual(g.staff);
  while (loaded.staff.length < 16) expect(hire(loaded).ok).toBe(true);
  const bad = structuredClone(loaded);
  bad.staff.push({ ...structuredClone(bad.staff[0]), id: bad.nextId++ });
  expect(() => restore(JSON.stringify(bad))).toThrow();
});
test("phone roster can select the sixteenth employee and retain it after reload", async ({
  page,
}) => {
  const g = createGame();
  for (let i = 0; i < 16; i++) hire(g, "ranger");
  await page.addInitScript((save) => {
    if (!localStorage.getItem("simgolf-reborn.course.v1"))
      localStorage.setItem("simgolf-reborn.course.v1", save);
  }, serialize(g));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForFunction(() => !!window.__gameTest);
  await page.locator('[data-mode="staff"]').click();
  await expect(page.locator("#staff-select option")).toHaveCount(16);
  await page.locator("#staff-select").selectOption(String(g.staff[15].id));
  await expect(page.locator("#staff-name")).toHaveValue("Ranger 16");
  await expect(page.locator("#live-details")).toContainText("16/16 employees");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "../graphics/samples/staff-capacity-phone.png",
  });
  await page.reload();
  await page.waitForFunction(() => !!window.__gameTest);
  expect(
    await page.evaluate(() => window.__gameTest.getState().staff.length),
  ).toBe(16);
});
