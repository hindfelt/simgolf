import { test, expect } from "@playwright/test";

async function openScene(page) {
  await page.goto("/?mode=art");
  await page.waitForFunction(() => window.__artTest?.getState().ready);
}
const state = (page) => page.evaluate(() => window.__artTest.getState());

test("terrain painting preserves gravel, grass and the green as distinct surfaces", async ({
  page,
}) => {
  await openScene(page);
  const colors = await page.evaluate(() => ({
    path: window.__artTest.terrainColor(-39, 10),
    buffer: window.__artTest.terrainColor(-36, 10),
    green: window.__artTest.terrainColor(32, -25),
  }));
  expect(colors.path[2]).toBeGreaterThan(100);
  expect(colors.buffer[2]).toBeLessThan(85);
  expect(colors.green[1]).toBeGreaterThan(140);
});

test("scene renders without script, shader or resource errors", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  await openScene(page);
  await page.waitForFunction(() => window.__artTest.getState().fps > 0);
  const s = await state(page);
  expect(s.triangles).toBeGreaterThan(100000);
  expect(s.drawCalls).toBeLessThan(200);
  expect(errors).toEqual([]);
});

test("pan, zoom, focus and home change the real camera", async ({ page }) => {
  await openScene(page);
  const initial = await state(page);
  await page.mouse.move(720, 430);
  await page.mouse.down();
  await page.mouse.move(850, 475, { steps: 12 });
  await page.mouse.up();
  await expect
    .poll(async () => JSON.stringify((await state(page)).target))
    .not.toBe(JSON.stringify(initial.target));
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  expect((await state(page)).zoom).toBeGreaterThan(initial.zoom);
  await page.locator('[data-focus="clubhouse"]').click();
  await expect.poll(async () => (await state(page)).zoom).toBeCloseTo(2.45, 1);
  await expect(page.locator("#selection-title")).toHaveText(
    "The old country clubhouse",
  );
  await page.getByRole("button", { name: "Return to reference view" }).click();
  await expect.poll(async () => (await state(page)).zoom).toBeCloseTo(1, 2);
  expect((await state(page)).feature).toBe("overview");
});

test("pause freezes the scene; comparison preserves the camera", async ({
  page,
}) => {
  await openScene(page);
  await page.locator("#pause").click();
  const before = await state(page);
  await page.waitForTimeout(250);
  expect((await state(page)).elapsed).toBe(before.elapsed);
  await page.locator("#concept-toggle").click();
  await expect(page.locator("#concept-overlay")).toBeVisible();
  const img = page.locator("#concept-overlay img");
  expect(await img.evaluate((i) => i.complete && i.naturalWidth > 0)).toBe(
    true,
  );
  await page.locator("#close-concept").click();
  expect((await state(page)).target).toEqual(before.target);
  await page.locator("#pause").click();
  await expect
    .poll(async () => (await state(page)).elapsed)
    .toBeGreaterThan(before.elapsed);
});

test("world picking selects a feature without requiring its tab", async ({
  page,
}) => {
  await openScene(page);
  await page.locator('[data-focus="clubhouse"]').click();
  await expect.poll(async () => (await state(page)).zoom).toBeCloseTo(2.45, 2);
  // Escape resets the selection while the camera is still at the clubhouse; a click hits its geometry.
  await page.locator("#world canvas").focus();
  await page.keyboard.press("Escape");
  await page.mouse.click(720, 450);
  await expect(page.locator("#selection-title")).toHaveText(
    "The old country clubhouse",
  );
});

test("phone layout supports touch exploration and every detail tab", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await openScene(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  for (const feature of ["clubhouse", "bridge", "garden", "green"]) {
    await page.locator(`[data-focus="${feature}"]`).tap();
    await expect.poll(async () => (await state(page)).feature).toBe(feature);
    const box = await page.locator(`[data-focus="${feature}"]`).boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
  }
  // Real browser touch events exercise pinch handling rather than calling the zoom implementation.
  const session = await context.newCDPSession(page);
  await page.waitForTimeout(1050);
  const before = await state(page);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: 145, y: 400, id: 1 },
      { x: 245, y: 400, id: 2 },
    ],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { x: 110, y: 400, id: 1 },
      { x: 280, y: 400, id: 2 },
    ],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  expect((await state(page)).zoom).toBeGreaterThan(before.zoom);
  await page.getByRole("button", { name: "Return to reference view" }).tap();
  await expect.poll(async () => (await state(page)).zoom).toBeCloseTo(1, 2);
  await page.screenshot({ path: "../graphics/samples/browser-phone.png" });
  await context.close();
});
