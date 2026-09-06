import { test, expect } from "@playwright/test";
import * as THREE from "three";
import { staffCoverage } from "../src/rendering/staff-coverage.js";
import { RULES } from "../src/simulation/rules.js";
test("coverage uses gameplay radius and terrain height, reuses geometry and hides inactive staff", () => {
  const scene = new THREE.Scene(),
    overlay = staffCoverage(scene, (x, z) => x * 0.1 + z * 0.2),
    g = { revision: 1 },
    staff = { role: "ranger", phase: "idle", pos: { x: 3, z: 7 } };
  overlay.update(g, staff);
  const line = scene.children[0],
    geometry = line.geometry;
  for (let i = 0; i < 65; i++) {
    const p = geometry.attributes.position;
    expect(Math.hypot(p.getX(i) - 3, p.getZ(i) - 7)).toBeCloseTo(
      RULES.rangerRadius,
      4,
    );
    expect(p.getY(i)).toBeCloseTo(p.getX(i) * 0.1 + p.getZ(i) * 0.2 + 0.18, 4);
  }
  overlay.update(g, staff, { x: 10, z: 12 });
  expect(line.geometry).toBe(geometry);
  expect(overlay.snapshot().preview).toBe(true);
  staff.phase = "walking";
  overlay.update(g, staff);
  expect(line.visible).toBe(false);
  overlay.update(g, { ...staff, role: "groundskeeper", phase: "idle" });
  expect(overlay.snapshot()).toBeNull();
  overlay.dispose();
  expect(scene.children).toHaveLength(0);
});
test("phone can preview a Ranger destination without moving staff or spending money", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForFunction(() => !!window.__gameTest);
  await page.locator("#pause").click();
  await page.locator('[data-mode="staff"]').click();
  await page.locator("#hire-ranger").click();
  await expect
    .poll(() =>
      page.evaluate(() => window.__gameTest.getStaffCoverage()?.radius),
    )
    .toBe(RULES.rangerRadius);
  const before = await page.evaluate(() => window.__gameTest.getState());
  await page.locator("#staff-move").click();
  const p = await page.evaluate(() => window.__gameTest.project(-9, -5));
  await page.mouse.move(p.x, p.y);
  await expect
    .poll(() =>
      page.evaluate(() => window.__gameTest.getStaffCoverage()?.preview),
    )
    .toBe(true);
  expect(await page.evaluate(() => window.__gameTest.getState())).toEqual(
    before,
  );
  await page.screenshot({
    path: "../graphics/samples/ranger-coverage-phone.png",
  });
  await page.mouse.click(p.x, p.y);
  await expect
    .poll(() =>
      page.evaluate(() => window.__gameTest.getState().staff[0].phase),
    )
    .toBe("walking");
  await expect
    .poll(() => page.evaluate(() => window.__gameTest.getStaffCoverage()))
    .toBeNull();
  await page.locator('[data-mode="build"]').click();
  expect(
    await page.evaluate(() => window.__gameTest.getStaffCoverage()),
  ).toBeNull();
});
