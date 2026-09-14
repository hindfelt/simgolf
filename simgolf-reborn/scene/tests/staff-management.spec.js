import { test, expect } from "@playwright/test";
import {
  createGame,
  hire,
  update,
  renameStaff,
  dismissStaff,
  repositionStaff,
  serialize,
  restore,
} from "../src/simulation/game.js";
import { createSession } from "../src/simulation/session.js";
import { RULES } from "../src/simulation/rules.js";
const advance = (g, seconds) => {
  for (let i = 0; i < seconds / 0.05; i++) update(g, 0.05);
};
test("rename validates names and preserves a literal name through reload", () => {
  const g = createGame();
  hire(g);
  const s = g.staff[0];
  expect(renameStaff(g, s.id, "   ").ok).toBe(false);
  expect(renameStaff(g, s.id, "x\n").ok).toBe(false);
  expect(renameStaff(g, s.id, "<Turf & Flowers>").ok).toBe(true);
  expect(restore(serialize(g)).staff[0].name).toBe("<Turf & Flowers>");
});
test("reposition cancels a job without work credit and resumes deterministically after travel", () => {
  const g = createGame();
  hire(g);
  advance(g, 0.1);
  const s = g.staff[0],
    pos = { ...s.pos };
  const before = serialize(g);
  expect(repositionStaff(g, s.id, 22, 29).ok).toBe(false);
  expect(serialize(g)).toBe(before);
  expect(repositionStaff(g, s.id, 10, 17).ok).toBe(true);
  expect(s.pos).toEqual(pos);
  expect(s.target).toBeNull();
  expect(s.afterWalk).toBe("idle");
  expect(s.removed).toBe(0);
  const next = restore(serialize(g));
  advance(g, 20);
  advance(next, 20);
  expect(serialize(next)).toBe(serialize(g));
  expect(s.pos).not.toEqual(pos);
});
test("dismissal releases reservations and removes only future wage charges; retries are harmless", () => {
  const g = createGame();
  hire(g);
  hire(g);
  advance(g, 0.1);
  const id = g.staff[0].id;
  const host = createSession(g),
    owner = { id: "owner", role: "owner" },
    cash = g.cash;
  const cmd = host.nextCommand(owner.id, "dismiss-staff", { staffId: id });
  expect(host.execute(cmd, owner).ok).toBe(true);
  expect(host.execute(cmd, owner).ok).toBe(true);
  expect(g.staff).toHaveLength(1);
  expect(g.cash).toBe(cash);
  advance(g, 61);
  expect(
    g.ledger
      .filter((x) => x.reason === "Maintenance wages")
      .map((x) => x.amount),
  ).toEqual([-RULES.wage]);
  expect(dismissStaff(g, id).ok).toBe(false);
  expect(restore(serialize(g)).staff).toHaveLength(1);
  const spectator = { id: "watcher", role: "spectator" };
  expect(
    host.execute(
      host.nextCommand(spectator.id, "dismiss-staff", {
        staffId: g.staff[0].id,
      }),
      spectator,
    ).code,
  ).toBe("forbidden");
});
test("phone can rename, send and dismiss an employee with cancel and reload", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForFunction(() => window.__gameTest);
  await page.locator("#pause").click();
  await page.locator('[data-mode="staff"]').click();
  await page.locator("#hire").click();
  await expect(page.locator("#staff-select option")).toHaveCount(1);
  await page.locator("#staff-name").fill("Morgan <Turf>");
  await page.locator("#staff-rename-form button").click();
  await expect(page.locator("#staff-select option")).toHaveText(
    "Morgan <Turf>",
  );
  await page.locator("#staff-move").click();
  const p = await page.evaluate(() => window.__gameTest.project(-9, -5));
  await page.mouse.click(p.x, p.y);
  expect(
    await page.evaluate(() => window.__gameTest.getState().staff[0].afterWalk),
  ).toBe("idle");
  await page.locator("#staff-dismiss").click();
  await page.locator("#cancel-removal").click();
  await expect(page.locator("#staff-select option")).toHaveCount(1);
  await page.reload();
  await page.waitForFunction(() => window.__gameTest);
  await page.locator('[data-mode="staff"]').click();
  await expect(page.locator("#staff-select option")).toHaveText(
    "Morgan <Turf>",
  );
  await page.screenshot({
    path: "../graphics/samples/staff-management-phone.png",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.locator("#staff-dismiss").click();
  await page.locator("#confirm-removal").click();
  await expect(page.locator("#staff-select option")).toHaveCount(0);
  await expect(page.locator("#staff-move")).toBeDisabled();
});
