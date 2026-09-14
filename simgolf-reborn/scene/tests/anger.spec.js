import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  openHole,
  update,
  serialize,
  restore,
} from "../src/simulation/game.js";
import { cellAt } from "../src/simulation/world.js";
function setup() {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 36, 5);
  openHole(g);
  while (!g.guests.length) update(g, 0.05);
  g.nextArrival = 10000;
  g.nextWeed = 10000;
  g.weeds = [];
  const v = g.guests[0],
    other = g.guests[1];
  v.pos = { ...g.holes[0].tee };
  v.phase = "address";
  v.path = [];
  v.wait = -100;
  v.mood = 20;
  v.happiness = 1;
  other.pos = { x: v.pos.x + 1, z: v.pos.z };
  other.phase = "address";
  other.path = [];
  other.wait = -100;
  other.happiness = 5;
  other.mood = 80;
  g.weeds.push({ id: g.nextId++, ...cellAt(v.pos.x, v.pos.z), ...v.pos });
  return { g, v, other };
}
test("a real complaint triggers angry movement, affects neighbours once and ends in an interrupted visit", () => {
  const { g, v, other } = setup();
  update(g, 0.05);
  expect(v.happiness).toBe(0);
  update(g, 0.05);
  expect(v.phase).toBe("angry");
  expect(other.happinessReactions).toContain(`angry:${v.roundId}`);
  const start = { ...v.pos },
    copy = restore(serialize(g));
  for (let i = 0; i < 10; i++) {
    update(g, 0.05);
    update(copy, 0.05);
  }
  expect(v.pos).not.toEqual(start);
  expect(
    other.happinessReactions.filter((r) => r === `angry:${v.roundId}`),
  ).toHaveLength(1);
  for (let i = 0; i < 2000 && g.guests.some((p) => p.id === v.id); i++) {
    update(g, 0.05);
    update(copy, 0.05);
  }
  expect(g.guests.some((p) => p.id === v.id)).toBe(false);
  expect(g.interruptedRounds.filter((r) => r.id === v.roundId)).toHaveLength(1);
  expect(g.rounds.some((r) => r.id === v.roundId)).toBe(false);
  expect(serialize(copy)).toBe(serialize(g));
});
test("positive happiness does not trigger anger and malformed rage state rejects", () => {
  const { g, v } = setup();
  g.weeds = [];
  update(g, 0.05);
  expect(v.phase).toBe("address");
  v.happiness = 0;
  update(g, 0.05);
  expect(v.phase).toBe("angry");
  for (const mutate of [
    (p) => (p.anger.until = Infinity),
    (p) => (p.anger.leg = -1),
    (p) => (p.phase = "address"),
  ]) {
    const bad = structuredClone(g);
    mutate(bad.guests[0]);
    expect(() => restore(serialize(bad))).toThrow();
  }
});
test("browser displays the angry golfer's actual remark", async ({ page }) => {
  const { g } = setup();
  update(g, 0.05);
  update(g, 0.05);
  await page.addInitScript((save) => {
    if (!localStorage.getItem("simgolf-reborn.course.v1"))
      localStorage.setItem("simgolf-reborn.course.v1", save);
  }, serialize(g));
  await page.goto("/");
  await page.waitForFunction(() => !!window.__gameTest);
  await expect(
    page.locator(".golfer-remark").filter({ hasText: "infuriating" }),
  ).toBeVisible();
  await page.screenshot({ path: "../graphics/samples/angry-golfer.png" });
});
