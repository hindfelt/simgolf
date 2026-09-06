import { test, expect } from "@playwright/test";
import { bridgeEdges } from "../src/rendering/bridge-layout.js";
import {
  createGame,
  build,
  tile,
  restore,
  serialize,
} from "../src/simulation/game.js";
import { demolish, demolitionCheck } from "../src/simulation/course-edit.js";
import { key, center } from "../src/simulation/world.js";
function crossing() {
  const g = createGame();
  for (let r = 27; r <= 30; r++)
    if (tile(g, 26, r) === "water")
      expect(build(g, "bridge", 26, r).ok).toBe(true);
  return g;
}
test("joined bridge decks have no internal railings; bank entrances remain open", () => {
  const g = crossing();
  const edges = bridgeEdges(g, 26, 29);
  expect(edges.filter((e) => e.dc).every((e) => e.rail)).toBe(true);
  expect(edges.filter((e) => e.dr).every((e) => !e.rail)).toBe(true);
  expect(build(g, "bridge", 27, 29).ok).toBe(true);
  expect(bridgeEdges(g, 26, 29).find((e) => e.dc === 1).rail).toBe(false);
  expect(bridgeEdges(g, 27, 29).find((e) => e.dc === -1).rail).toBe(false);
});
test("bridge removal preserves water, restores rails and survives save reload", () => {
  const g = crossing();
  expect(demolitionCheck(g, 26, 29).kind).toBe("bridge");
  expect(demolish(g, 26, 29).ok).toBe(true);
  expect(tile(g, 26, 29)).toBe("water");
  expect(g.bridges[key(26, 29)]).toBeUndefined();
  expect(restore(serialize(g)).tiles[key(26, 29)].type).toBe("water");
  expect(bridgeEdges(g, 26, 28).find((e) => e.dr === 1).rail).toBe(true);
});
test("a reserved crossing cannot disappear ahead of a walking golfer", () => {
  const g = crossing();
  g.guests.push({ pos: center(26, 24), path: [center(26, 29)] });
  expect(demolitionCheck(g, 26, 29).ok).toBe(false);
  expect(build(g, "rough", 26, 29).ok).toBe(false);
  expect(g.bridges[key(26, 29)]).toBe(true);
});
test("browser renders a complete multi-tile bridge", async ({ page }) => {
  const g = crossing();
  await page.addInitScript(
    (save) => localStorage.setItem("simgolf-reborn.course.v1", save),
    serialize(g),
  );
  await page.goto("/");
  await page.waitForFunction(() => window.__gameTest);
  await page.locator("#pause").click();
  await page.screenshot({ path: "../graphics/samples/connected-bridge.png" });
  expect(
    await page.evaluate(
      () => Object.keys(window.__gameTest.getState().bridges).length,
    ),
  ).toBeGreaterThan(1);
});
