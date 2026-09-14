import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  openHole,
  update,
  serialize,
  restore,
} from "../src/simulation/game.js";
import { center } from "../src/simulation/world.js";
function course(steps = 2, downhill = false, surface = "path") {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 36, 5);
  openHole(g);
  while (!g.guests.length) update(g, 0.05);
  for (let c = 25; c <= 27; c++) expect(build(g, surface, c, 20).ok).toBe(true);
  for (let i = 0; i < steps; i++)
    expect(build(g, "raise", 26, 20).ok).toBe(true);
  const v = g.guests[0];
  v.pos = center(downhill ? 26 : 25, 20);
  v.path = [center(downhill ? 25 : 26, 20)];
  v.afterWalk = "address";
  v.phase = "walking";
  v.happiness = 5;
  g.weeds = [];
  g.weedRevision++;
  g.nextWeed = 10000;
  return { g, v };
}
test("walking up a steep constructed path complains once and persists through mid-climb reload", () => {
  const { g, v } = course();
  update(g, 0.05);
  expect(v.happinessReactions).toContain(`steep-path:${v.holeId}`);
  expect(v.happiness).toBe(4);
  expect(v.comment).toContain("too steep");
  const copy = restore(serialize(g));
  for (let i = 0; i < 6; i++) {
    update(g, 0.05);
    update(copy, 0.05);
  }
  expect(serialize(copy)).toBe(serialize(g));
  expect(v.happiness).toBe(4);
  expect(
    v.happinessReactions.filter((k) => k.startsWith("steep-path:")),
  ).toHaveLength(1);
});
test("gentle paths, downhill movement, rough ground and waiting do not trigger uphill-path complaints", () => {
  for (const [steps, downhill, surface] of [
    [1, false, "path"],
    [2, true, "path"],
    [2, false, "rough"],
  ]) {
    const { g, v } = course(steps, downhill, surface);
    update(g, 0.05);
    expect(v.happiness).toBe(5);
    expect(v.happinessReactions.some((k) => k.startsWith("steep-path:"))).toBe(
      false,
    );
  }
  const { g, v } = course();
  v.phase = "address";
  v.wait = -100;
  update(g, 0.05);
  expect(v.happiness).toBe(5);
});
test("a golfer already partway up a segment still detects its gradient; a gentler gradient avoids the complaint", () => {
  const steep = course(),
    gentle = course(1);
  for (const { g, v } of [steep, gentle]) {
    v.pos.x += 1.25; // Remaining rise is below half a unit, but gradient is unchanged.
    update(g, 0.05);
  }
  expect(steep.v.happiness).toBe(4);
  expect(gentle.v.happiness).toBe(5);
});

test("steep path feedback appears above the walking visitor in the browser", async ({page}) => {
 const {g,v}=course();update(g,.05);
 await page.addInitScript(save=>{if(!localStorage.getItem('simgolf-reborn.course.v1'))localStorage.setItem('simgolf-reborn.course.v1',save);},serialize(g));
 await page.goto('/');await page.waitForFunction(()=>!!window.__gameTest);
 const remark=page.locator('.golfer-remark').filter({hasText:'This path is too steep'});
 await expect(remark).toBeVisible();await expect(remark).toContainText(v.name);
 await page.screenshot({path:'../graphics/samples/steep-path-remark.png'});
});
