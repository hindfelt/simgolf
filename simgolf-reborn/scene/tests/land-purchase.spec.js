import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  tile,
  serialize,
  restore,
} from "../src/simulation/game.js";
import { createSession } from "../src/simulation/session.js";
import { buyLand, ownedRows } from "../src/simulation/land-purchase.js";
import {
  exportCourse,
  coursePractice,
} from "../src/simulation/course-package.js";

test("purchase charges once, unlocks land and survives save and course export", async () => {
  const g = createGame(57),
    before = structuredClone(g.tiles),
    cash = g.cash;
  expect(build(g, "fairway", 10, 43).ok).toBe(false);
  expect(build(g, "raise", 10, 43).ok).toBe(false);
  const session = createSession(g),
    actor = { id: "owner", role: "owner" };
  const command = session.nextCommand(actor.id, "buy-land", {});
  expect(session.execute(command, actor).ok).toBe(true);
  expect(session.execute(command, actor).ok).toBe(true);
  expect(g.cash).toBe(cash - 15000);
  expect(ownedRows(g)).toBe(52);
  for (const [k, v] of Object.entries(before)) expect(g.tiles[k]).toEqual(v);
  expect(build(g, "fairway", 10, 43).ok).toBe(true);
  expect(tile(g, 10, 53)).toBe("blocked");
  expect(restore(serialize(g)).landParcels).toBe(1);
  expect(build(g, "tee", 7, 20).ok).toBe(true);
  expect(build(g, "green", 36, 5).ok).toBe(true);
  expect(coursePractice(await exportCourse(g)).landParcels).toBe(1);
});
test("insufficient funds and spectators cannot purchase; generation is repeatable and varies by seed", () => {
  const g = createGame(),
    session = createSession(g),
    actor = { id: "watcher", role: "spectator" };
  expect(
    session.execute(session.nextCommand(actor.id, "buy-land", {}), actor).ok,
  ).toBe(false);
  g.cash = 0;
  expect(buyLand(g).ok).toBe(false);
  expect(g.landParcels).toBe(0);
  const a = createGame(42),
    b = createGame(42),
    c = createGame(43);
  for (const game of [a, b, c]) expect(buyLand(game).ok).toBe(true);
  expect(a.elevation).toEqual(b.elevation);
  expect(a.elevation).not.toEqual(c.elevation);
  expect(Object.values(a.elevation).some((v) => v < 0)).toBe(true);
  expect(Object.values(a.elevation).some((v) => v > 0)).toBe(true);
});
test("browser buys a parcel through the visible dialog", async ({ page }) => {
  await page.goto("/");
  await page.locator("#loading").waitFor({ state: "hidden" });
  await page.locator('[data-mode="play"]').click();
  await expect(page.locator("#buy-land")).toHaveCount(0);
  for (const id of ["#open-hole", "#add-hole", "#edit-holes"])
    await expect(page.locator(id)).toBeHidden();
  await expect(page.locator("#practice")).toBeVisible();
  await expect(page.locator("#scorecard")).toBeVisible();
  await page.evaluate(() => {
    window.managementShortcutClicks = 0;
    document.querySelector("#open-hole").addEventListener("click", () => window.managementShortcutClicks++);
  });
  await page.locator("#title").click();
  await page.keyboard.press("h");
  expect(await page.evaluate(() => window.managementShortcutClicks)).toBe(0);
  await page.locator('[data-mode="build"]').click();
  await expect(page.locator("#panel #buy-land")).toBeVisible();
  for (const id of ["#open-hole", "#add-hole", "#edit-holes"])
    await expect(page.locator(id)).toBeVisible();
  await page.locator("#buy-land").click();
  await expect(page.locator("#land-purchase")).toContainText("450 tiles");
  await page.locator("#confirm-land").click();
  await expect(page.locator("#land-purchase")).not.toBeVisible();
  await page.locator("#buy-land").click();
  await expect(page.locator("#land-purchase")).toContainText("1 of 3");
});

test('all parcels unlock in sequence, enforce the final limit and reject forged ownership', () => {
  const g = createGame();
  // Earned income is represented by the same ledger invariant used by save validation.
  g.cash += 30000;
  g.ledger.push({ id: 1, time: 0, amount: 30000, reason: 'Course income' });
  for (let i = 1; i <= 3; i++) {
    expect(buyLand(g).ok).toBe(true);
    expect(ownedRows(g)).toBe(42 + i * 10);
    expect(restore(serialize(g)).landParcels).toBe(i);
  }
  expect(build(g, 'fairway', 10, 70).ok).toBe(true);
  const saved = serialize(g);
  expect(buyLand(g).ok).toBe(false);
  expect(serialize(g)).toBe(saved);
  const bad = JSON.parse(saved);
  bad.landParcels = 0;
  expect(() => restore(JSON.stringify(bad))).toThrow();
  const locked = createGame(), session = createSession(locked, {courseLocked: true});
  const actor = {id: 'owner', role: 'owner'};
  expect(session.execute(session.nextCommand(actor.id, 'buy-land', {}), actor).ok).toBe(false);
});
