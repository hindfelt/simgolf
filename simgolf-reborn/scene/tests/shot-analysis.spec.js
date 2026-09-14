import { test, expect } from "@playwright/test";
import * as THREE from "three";
import { createGame, build, serialize } from "../src/simulation/game.js";
import { analyzeShots } from "../src/simulation/shot-analysis.js";
import { analysisOverlay } from "../src/rendering/shot-analysis.js";
function course() {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 36, 5);
  return g;
}
test("skill comparisons are repeatable and leave the entire live course untouched", () => {
  const g = course(),
    before = serialize(g);
  const rows = analyzeShots(g, g.holes[0].id, g.holes[0].tee);
  expect(serialize(g)).toBe(before);
  expect(rows.map((r) => r.label)).toEqual([
    "All skills",
    "No Length",
    "No Accuracy",
    "No Imagination",
  ]);
  expect(
    rows.every((r) => r.samples.length === 3 && Number.isFinite(r.carry)),
  ).toBe(true);
  expect(rows[1].carry).toBeLessThan(rows[0].carry);
  expect(rows[3].samples.every((s) => s.curve === 0)).toBe(true);
  g.rng = 123456;
  expect(analyzeShots(g, g.holes[0].id, g.holes[0].tee)).toEqual(rows);
  for (const from of [null, { x: NaN, z: 0 }, { x: 999, z: 999 }])
    expect(() => analyzeShots(g, g.holes[0].id, from)).toThrow(/playable/);
  expect(() => analyzeShots(createGame(), 1, { x: 0, z: 0 })).toThrow(
    /completed/,
  );
});
test("visible flight overlays include the endpoint and release old geometry", () => {
  const g = course(),
    scene = new THREE.Scene();
  const overlay = analysisOverlay(scene, () => 0);
  const rows = analyzeShots(g, g.holes[0].id, g.holes[0].tee);
  overlay.show(rows);
  const lines = [...scene.children[0].children];
  expect(lines).toHaveLength(4);
  let disposed = 0;
  lines.forEach((line, i) => {
    line.geometry.addEventListener("dispose", () => disposed++);
    const vertices = line.geometry.attributes.position;
    expect(vertices.getX(vertices.count - 1)).toBeCloseTo(
      rows[i].samples[0].end.x,
    );
    expect(line.material.depthTest).toBe(false);
  });
  overlay.clear();
  expect(disposed).toBe(4);
  expect(scene.children[0].children).toHaveLength(0);
});
test("Reports and keyboard analysis work without charging or playing a stroke", async ({
  page,
}) => {
  const g = course();
  await page.addInitScript(
    (save) => localStorage.setItem("simgolf-reborn.course.v1", save),
    serialize(g),
  );
  await page.goto("/");
  await page.waitForFunction(() => !!window.__gameTest);
  await page.locator("#pause").click();
  await page.locator('[data-mode="reports"]').click();
  await page.locator("#shot-analysis").click();
  const before = await page.evaluate(() => window.__gameTest.getState());
  const point = await page.evaluate(() => {
    const tee = window.__gameTest.getState().holes[0].tee;
    return window.__gameTest.project(tee.x, tee.z);
  });
  await page.mouse.click(point.x, point.y);
  await expect(page.locator("#shot-analysis-dialog")).toBeVisible();
  for (const label of [
    "All skills",
    "No Length",
    "No Accuracy",
    "No Imagination",
  ])
    await expect(page.locator("#shot-analysis-content")).toContainText(label);
  expect(await page.evaluate(() => window.__gameTest.getState())).toEqual(
    before,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "../graphics/samples/shot-analysis-phone.png",
  });
  await page
    .getByRole("button", { name: "Close shot analysis", exact: true })
    .click();
  await page.keyboard.press("/");
  await expect(page.locator("#hint")).toContainText("Shot analysis");
  await page.keyboard.press("Escape");
  await expect(page.locator("#hint")).not.toContainText("Shot analysis");
});
