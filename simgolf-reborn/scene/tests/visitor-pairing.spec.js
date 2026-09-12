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
import { nextVisitorPair } from "../src/simulation/visitor-pairing.js";
const owner = { id: "owner", role: "owner" };
function setup() {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 36, 5);
  openHole(g);
  return { g, s: createSession(g) };
}
test("chosen partners start together, wait for each other and preserve the live round when changed", () => {
  const { g, s } = setup();
  const [a, b, c] = g.visitorPool.slice(3, 6).map((p) => p.id);
  const cmd = s.nextCommand(owner.id, "set-visitor-pair", {
    firstId: a,
    secondId: b,
  });
  const result = s.execute(cmd, owner);
  expect(result.ok).toBe(true);
  expect(s.execute(cmd, owner)).toEqual(result);
  expect(g.visitorPairs).toEqual([[a, b]]);
  while (!g.guests.length) update(g, 0.05);
  expect(g.guests.map((v) => v.id)).toEqual([a, b]);
  expect(new Set(g.guests.map((v) => v.pair)).size).toBe(1);
  const live = structuredClone(g.guests);
  expect(
    s.execute(
      s.nextCommand(owner.id, "set-visitor-pair", { firstId: a, secondId: c }),
      owner,
    ).ok,
  ).toBe(true);
  expect(g.guests).toEqual(live);
  expect(nextVisitorPair(g).some((p) => p.id === c)).toBe(false);
  expect(g.visitorPairs).toEqual([[a, c]]);
  const loaded = restore(serialize(g));
  for (let i = 0; i < 1200; i++) {
    update(g, 0.05);
    update(loaded, 0.05);
  }
  expect(serialize(loaded)).toBe(serialize(g));
});
test("commands reject invalid partners and spectators, survive retry/reload, and can clear a pair", () => {
  const { g, s } = setup();
  const [a, b] = g.visitorPool.map((p) => p.id);
  for (const payload of [
    { firstId: a, secondId: a },
    { firstId: a, secondId: 999999 },
    { firstId: a, secondId: b, extra: true },
  ])
    expect(
      s.execute(s.nextCommand(owner.id, "set-visitor-pair", payload), owner).ok,
    ).toBe(false);
  const spectator = { id: "watcher", role: "spectator" };
  expect(
    s.execute(
      s.nextCommand(spectator.id, "set-visitor-pair", {
        firstId: a,
        secondId: b,
      }),
      spectator,
    ).ok,
  ).toBe(false);
  const cmd = s.nextCommand(owner.id, "set-visitor-pair", {
    firstId: a,
    secondId: b,
  });
  const result = s.execute(cmd, owner),
    loaded = restore(serialize(g)),
    resumed = createSession(loaded);
  expect(resumed.execute(cmd, owner)).toEqual(result);
  expect(loaded.visitorPairs).toEqual([[a, b]]);
  expect(
    resumed.execute(
      resumed.nextCommand(owner.id, "clear-visitor-pair", { golferId: a }),
      owner,
    ).ok,
  ).toBe(true);
  expect(loaded.visitorPairs).toEqual([]);
  const bad = JSON.parse(serialize(g));
  bad.visitorPairs.push([a, b]);
  expect(() => restore(JSON.stringify(bad))).toThrow(/visitor pairs/);
  const old = JSON.parse(serialize(g));
  delete old.visitorPairs;
  old.protocol.version = 31;
  old.protocol.ruleset = "prototype-visitor-pool-2026-09-06";
  expect(restore(JSON.stringify(old)).visitorPairs).toEqual([]);
});
test("phone can pair golfers, preserve the choice after reload, and unpair them", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForFunction(() => !!window.__gameTest);
  await page.locator('[data-mode="reports"]').click();
  await page.locator("#roster-report").click();
  await page
    .getByLabel("First golfer", { exact: true })
    .selectOption({ label: "Alice" });
  await page
    .getByLabel("Second golfer", { exact: true })
    .selectOption({ label: "Clara" });
  await page.getByRole("button", { name: "Pair golfers", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Unpair Alice and Clara", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.waitForFunction(() => !!window.__gameTest);
  await page.keyboard.press("F9");
  await expect(
    page.getByRole("button", { name: "Unpair Alice and Clara", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "../graphics/samples/visitor-pairing-phone.png",
  });
  await page
    .getByRole("button", { name: "Unpair Alice and Clara", exact: true })
    .click();
  expect(
    await page.evaluate(() => window.__gameTest.getState().visitorPairs),
  ).toEqual([]);
});
