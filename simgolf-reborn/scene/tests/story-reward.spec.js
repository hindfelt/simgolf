import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  openHole,
  update,
  serialize,
  restore,
  placeStoryReward,
} from "../src/simulation/game.js";
import { stepOpeningStory } from "../src/stories/live.js";
import { createSession } from "../src/simulation/session.js";
import { demolish } from "../src/simulation/course-edit.js";
function happy() {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 36, 5);
  openHole(g);
  for (let i = 0; i < 90; i++) update(g, 0.05);
  for (const v of g.guests) {
    v.mood = 90;
    v.pos = { x: 0, z: 0 };
    v.shot = null;
  }
  for (let i = 0; i < 7; i++) {
    g.time += 12;
    stepOpeningStory(g);
  }
  expect(g.openingStory.status).toBe("happy-ending");
  return g;
}
test("reward is free, validated, owner-controlled and cannot be reclaimed after removal or reload", () => {
  const g = happy(),
    cash = g.cash,
    ledger = structuredClone(g.ledger),
    host = createSession(g),
    owner = { id: "owner", role: "owner" };
  const claim = host.nextCommand(owner.id, "place-story-reward", {
    c: 22,
    r: 14,
  });
  expect(
    host.execute(
      host.nextCommand("viewer", "place-story-reward", { c: 22, r: 14 }),
      { id: "viewer", role: "spectator" },
    ).ok,
  ).toBe(false);
  const result = host.execute(claim, owner);
  expect(result.ok).toBe(true);
  expect(host.execute(claim, owner)).toEqual(result);
  expect(g.facilities).toHaveLength(1);
  expect(g.cash).toBe(cash);
  expect(g.ledger).toEqual(ledger);
  expect(demolish(g, 22, 14).ok).toBe(true);
  const loaded = restore(serialize(g));
  expect(placeStoryReward(loaded, 22, 14).ok).toBe(false);
  expect(placeStoryReward(createGame(), 22, 14).ok).toBe(false);
});
test("happy ending reward places through report and canvas", async ({
  page,
}) => {
  const g = happy();
  await page.addInitScript(
    (save) => localStorage.setItem("simgolf-reborn.course.v1", save),
    serialize(g),
  );
  await page.goto("/");
  await page.waitForFunction(() => !!window.__gameTest);
  await page.locator("#pause").click();
  await page.locator('[data-mode="reports"]').click();
  await page.locator("#story-report").click();
  await page.locator("#place-story-reward").click();
  await expect(page.locator("#hint")).toContainText("Free story reward");
  await page.keyboard.press("Escape");
  expect(
    (await page.evaluate(() => window.__gameTest.getState())).openingStory
      .rewardFacilityId,
  ).toBeUndefined();
  await page.locator('[data-mode="reports"]').click();
  await page.locator("#story-report").click();
  await page.locator("#place-story-reward").click();
  const p = await page.evaluate(() => window.__gameTest.project(1, -5));
  await page.mouse.click(p.x, p.y);
  const saved = await page.evaluate(() => window.__gameTest.getState());
  expect(saved.openingStory.rewardFacilityId).toBe(saved.facilities[0].id);
  expect(saved.cash).toBe(g.cash);
  await page.locator('[data-mode="reports"]').click();
  await page.locator("#story-report").click();
  await expect(page.locator("#story-report-content")).toContainText(
    "already claimed",
  );
  await expect(page.locator("#place-story-reward")).toHaveCount(0);
});

test("an invalid site preserves the reward, which can be placed with no cash", () => {
  const g = happy();
  g.ledger.push({ id: g.ledger.length + 1, time: g.time, amount: -g.cash, reason: "Fixture construction expense" });
  g.cash = 0;
  const before = serialize(g);
  expect(placeStoryReward(g, 7, 20).ok).toBe(false);
  expect(serialize(g)).toBe(before);
  expect(placeStoryReward(g, 22, 14).ok).toBe(true);
  expect(g.cash).toBe(0);
  expect(restore(serialize(g)).openingStory.rewardFacilityId).toBe(
    g.facilities[0].id,
  );
});
