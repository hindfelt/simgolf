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
import {
  PERSONALITY_TRAITS,
  compatibilityHappiness,
} from "../src/simulation/personality.js";
const traits = (n) => Object.fromEntries(PERSONALITY_TRAITS.map((k) => [k, n]));
function start(same) {
  const g = createGame();
  g.visitorPool[0].personality = traits(0);
  g.visitorPool[1].personality = traits(same ? 0 : 10);
  build(g, "tee", 7, 20);
  build(g, "green", 36, 5);
  openHole(g);
  while (!g.guests.length) update(g, 0.05);
  return g;
}
test("compatibility changes actual starting happiness without changing skills, mood or shot RNG", () => {
  const similar = start(true),
    different = start(false);
  expect(similar.guests[0].happiness).toBeGreaterThan(
    different.guests[0].happiness,
  );
  expect(similar.guests[1].happiness).toBeGreaterThan(
    different.guests[1].happiness,
  );
  expect(similar.rng).toBe(different.rng);
  expect(similar.guests.map((v) => [v.skills, v.mood])).toEqual(
    different.guests.map((v) => [v.skills, v.mood]),
  );
  expect(compatibilityHappiness(traits(0), traits(5))).toBe(0);
  const loaded = restore(serialize(similar));
  for (let i = 0; i < 2400; i++) {
    update(similar, 0.05);
    update(loaded, 0.05);
  }
  expect(serialize(loaded)).toBe(serialize(similar));
  expect(similar.stats.fees).toBeGreaterThan(0);
  expect(
    similar.ledger
      .filter((r) => r.reason.includes("green fee"))
      .reduce((n, r) => n + r.amount, 0),
  ).toBe(similar.stats.fees);
});
test("profiles persist; old saves gain traits without rewriting their active happiness", () => {
  const g = start(true);
  createSession(g);
  expect(createGame().visitorPool).toEqual(createGame().visitorPool);
  const old = JSON.parse(serialize(g));
  old.protocol.version = 32;
  old.protocol.ruleset = "prototype-visitor-pairing-2026-09-06";
  for (const p of old.visitorPool) delete p.personality;
  const loaded = restore(JSON.stringify(old));
  expect(loaded.guests).toEqual(g.guests);
  expect(
    loaded.visitorPool.every((p) => Object.keys(p.personality).length === 5),
  ).toBe(true);
  for (const damage of [
    (s) => delete s.visitorPool[0].personality,
    (s) => (s.visitorPool[0].personality.nice = 11),
    (s) => (s.visitorPool[0].personality.extra = 2),
  ]) {
    const bad = JSON.parse(serialize(g));
    damage(bad);
    expect(() => restore(JSON.stringify(bad))).toThrow(/personality/);
  }
});
test("phone pairing shows both profiles and updates the compatibility preview", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForFunction(() => !!window.__gameTest);
  await page.keyboard.press("F9");
  const profiles = page.getByLabel("Partner personalities", { exact: true });
  await expect(profiles).toContainText("Alice:");
  await expect(profiles).toContainText("Ben:");
  for (const trait of ["Neat", "Outgoing", "Active", "Playful", "Nice"])
    await expect(profiles).toContainText(trait);
  await page
    .getByLabel("Second golfer", { exact: true })
    .selectOption({ label: "Clara" });
  await expect(profiles).toContainText("Clara:");
  await page
    .getByLabel("Second golfer", { exact: true })
    .selectOption({ label: "Alice" });
  await expect(profiles).toContainText("Choose two different golfers");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "../graphics/samples/personalities-phone.png",
  });
});
