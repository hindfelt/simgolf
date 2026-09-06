import { test, expect } from "@playwright/test";
import roster from "../src/simulation/pro-roster.json" with { type: "json" };
import {
  ROSTER_OPPONENT_NAMES,
  rosterOpponent,
} from "../src/simulation/roster-opponent.js";
import { validateGolferPackage } from "../src/simulation/golfer-package.js";
import { createGame, build, serialize } from "../src/simulation/game.js";
test("all original professionals have valid, distinct cap-guided exhibition allocations", () => {
  expect(ROSTER_OPPONENT_NAMES).toHaveLength(95);
  const profiles = new Set();
  for (const record of roster.golfers) {
    const chosen = rosterOpponent(record.name);
    expect(chosen.name).toBe(record.name);
    expect(() => validateGolferPackage(chosen.golfer)).not.toThrow();
    expect(
      Object.values(chosen.golfer.profile.skills).reduce((n, v) => n + v, 0),
    ).toBe(10);
    for (const [key, n] of Object.entries(chosen.golfer.profile.skills))
      expect(n).toBeLessThanOrEqual(record.skillCaps[key]);
    profiles.add(JSON.stringify(chosen.golfer.profile.skills));
  }
  expect(profiles.size).toBeGreaterThan(1);
  const chosen = rosterOpponent("Joe Pro");
  chosen.golfer.profile.skills.power = 10;
  expect(rosterOpponent("Joe Pro").golfer.profile.skills.power).not.toBe(10);
  expect(() => rosterOpponent("Invented opponent")).toThrow(/roster/);
});
test("phone selects a named professional and preserves the opponent after event reload", async ({
  page,
}) => {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 36, 5);
  await page.addInitScript((save) => {
    if (!localStorage.getItem("simgolf-reborn.course.v1"))
      localStorage.setItem("simgolf-reborn.course.v1", save);
  }, serialize(g));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForFunction(() => !!window.__gameTest);
  await page.locator("#menu-button").click();
  await page.locator("#pro-challenge").click();
  await expect(page.locator("#championship-opponent option")).toHaveCount(96);
  await page.locator("#championship-opponent").selectOption("Joe Pro");
  await expect(page.locator("#opponent-profile")).toContainText(
    "10-point exhibition",
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "../graphics/samples/roster-opponent-phone.png",
  });
  await page.locator("#start-championship").click();
  await page.waitForURL(/championship=/);
  await page.waitForFunction(() => !!window.__gameTest);
  expect(
    (
      await page.evaluate(() => window.__gameTest.getCompetition())
    ).standings.find((p) => p.id === "club-rival").name,
  ).toBe("Joe Pro");
  await page.reload();
  await page.waitForFunction(() => !!window.__gameTest);
  const rendered = await page.evaluate(() =>
    window.__gameTest
      .getVisibleActors()
      .find((p) => p.id === "opponent:club-rival"),
  );
  expect(rendered.appearance).toEqual(
    roster.golfers.find((p) => p.name === "Joe Pro").appearance,
  );
  await page.screenshot({
    path: "../graphics/samples/named-opponent-appearance.png",
  });
  await page.locator("#standings").click();
  await expect(page.locator("#standings-content")).toContainText("Joe Pro");
});
