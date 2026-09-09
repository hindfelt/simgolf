import { test, expect } from "@playwright/test";
async function ready(page) {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__gameTest);
}
async function place(page, tool, x, z) {
  await page.locator(`[data-tool="${tool}"]`).click();
  const p = await page.evaluate(
    ([x, z]) => window.__gameTest.project(x, z),
    [x, z],
  );
  await page.mouse.click(p.x, p.y);
}

test("build through the canvas, open, save a round, reload, and hire staff", async ({
  page,
}) => {
  test.setTimeout(65000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  await page
    .getByRole("button", { name: "Pause simulation", exact: true })
    .click();
  await place(page, "tee", -29, 7);
  await place(page, "green", 29, -23);
  await page.locator('[data-tool="fairway"]').click();
  await page.locator("#brush").selectOption("5");
  for (const [x, z] of [
    [-19, 3],
    [-11, -1],
    [-3, -5],
    [5, -9],
    [13, -13],
    [21, -15],
  ]) {
    const p = await page.evaluate(
      ([x, z]) => window.__gameTest.project(x, z),
      [x, z],
    );
    await page.mouse.click(p.x, p.y);
  }
  await page.locator("#open-hole").click();
  expect(
    (await page.evaluate(() => window.__gameTest.getState())).holes[0].open,
  ).toBe(true);
  await page
    .getByRole("button", { name: "Resume simulation", exact: true })
    .click();
  await page.locator("#speed").click();
  await expect
    .poll(
      async () =>
        page.evaluate(() => window.__gameTest.getState().guests.length),
      { timeout: 10000 },
    )
    .toBeGreaterThan(0);
  await page.locator('[data-mode="staff"]').click();
  await page.locator("#hire").click();
  await expect
    .poll(
      async () =>
        page.evaluate(() => window.__gameTest.getState().stats.rounds),
      { timeout: 40000 },
    )
    .toBeGreaterThan(0);
  await page
    .getByRole("button", { name: "Pause simulation", exact: true })
    .click();
  const before = await page.evaluate(() => window.__gameTest.getState());
  await page.locator("#menu-button").click();
  await page.locator("#save").click();
  await page.reload();
  await page.waitForFunction(() => !!window.__gameTest);
  const after = await page.evaluate(() => window.__gameTest.getState());
  expect(after.cash).toBe(before.cash);
  expect(after.stats.fees).toBe(before.stats.fees);
  expect(after.holes[0].tee).toEqual(before.holes[0].tee);
  expect(after.staff).toHaveLength(1);
  expect(errors).toEqual([]);
});
test("phone can place a tee and open the save menu without horizontal overflow", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await ready(page);
  await page
    .getByRole("button", { name: "Pause simulation", exact: true })
    .tap();
  await page.locator('[data-tool="tee"]').tap();
  const p = await page.evaluate(() => window.__gameTest.project(-9, 1));
  await page.touchscreen.tap(p.x, p.y);
  expect(
    (await page.evaluate(() => window.__gameTest.getState())).holes[0].tee,
  ).not.toBeNull();
  await page.locator("#menu-button").tap();
  await expect(page.locator("#menu")).toBeVisible();
  await expect(page.locator("#export")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await context.close();
});

test("build a second hole, select either one, and inspect a complete course scorecard", async ({
  page,
}) => {
  test.setTimeout(65000);
  await ready(page);
  await page.locator("#pause").click();
  await place(page, "tee", -29, 7);
  await place(page, "green", 1, -13);
  await page.locator("#open-hole").click();
  await page.locator("#add-hole").click();
  expect(await page.locator("#hole-select").inputValue()).toBe("hole-2");
  await place(page, "tee", 11, -13);
  await place(page, "green", 29, 7);
  await page.locator("#open-hole").click();
  await page.locator("#hole-select").selectOption("hole-1");
  expect(
    (await page.evaluate(() => window.__gameTest.getState())).holes,
  ).toHaveLength(2);
  await page.locator("#home").click();
  await page.locator("#pause").click();
  await page.locator("#speed").click();
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          window.__gameTest
            .getState()
            .rounds.some((r) => r.scorecard.length === 2),
        ),
      { timeout: 40000 },
    )
    .toBe(true);
  await page.locator("#scorecard").click();
  await expect(page.locator("#score-dialog")).toBeVisible();
  await expect(page.locator("#score-content table").first()).toContainText(
    "Strokes",
  );
  const scores = await page.evaluate(() => window.__gameTest.getState().rounds.find(r => r.scorecard.length === 2).scorecard);
  for (const score of scores) {
    expect(score.fee).toBe(score.happiness * 100);
    await expect(page.locator("#score-content")).toContainText(`$${score.fee}`);
  }
});

test("green tools extend, move the cup and trim through the canvas", async ({
  page,
}) => {
  await ready(page);
  await page.locator("#pause").click();
  await place(page, "tee", -29, 7);
  await place(page, "green", 1, -13);
  const original = await page.evaluate(
    () => window.__gameTest.getState().holes[0].green,
  );
  await place(page, "green", 7, -13);
  expect(
    (await page.evaluate(() => window.__gameTest.getState())).holes[0].green,
  ).toEqual(original);
  await place(page, "cup", 7, -13);
  expect(
    (await page.evaluate(() => window.__gameTest.getState())).holes[0].green.x,
  ).toBe(7);
  await place(page, "trim-green", -3, -17);
  const g = await page.evaluate(() => window.__gameTest.getState());
  expect(Object.values(g.tiles).filter((t) => t.type === "green")).toHaveLength(
    25,
  );
});

test("new hazards paint through the toolbar and show their actual lie during practice", async ({
  page,
}) => {
  await ready(page);
  await page.locator("#pause").click();
  await place(page, "tee", -29, 7);
  await place(page, "green", 29, -23);
  for (const [tool, x, z] of [
    ["deep-rough", -9, 1],
    ["pot-bunker", -3, 1],
    ["waste-bunker", 3, 1],
    ["brush", 9, 1],
    ["rocks", 15, 1],
  ])
    await place(page, tool, x, z);
  const state = await page.evaluate(() => window.__gameTest.getState());
  for (const type of [
    "deep-rough",
    "pot-bunker",
    "waste-bunker",
    "brush",
    "rocks",
  ])
    expect(Object.values(state.tiles).some((t) => t.type === type)).toBe(true);
  await page.locator('[data-mode="play"]').click();
  await page.locator("#practice").click();
  await expect(page.locator("#live-details")).toContainText("Tee");
});

test("confirm or cancel removal, reorder holes and remove an unused hole through the UI", async ({
  page,
}) => {
  await ready(page);
  await page.locator("#pause").click();
  await place(page, "tee", -29, 7);
  await place(page, "green", 29, -23);
  await place(page, "bench", 11, 1);
  await place(page, "demolish", 11, 1);
  await expect(page.locator("#remove-dialog")).toBeVisible();
  await page.locator("#cancel-removal").click();
  expect(
    (await page.evaluate(() => window.__gameTest.getState())).facilities,
  ).toHaveLength(1);
  await place(page, "demolish", 11, 1);
  await page.locator("#confirm-removal").click();
  expect(
    (await page.evaluate(() => window.__gameTest.getState())).facilities,
  ).toHaveLength(0);
  await page.locator("#add-hole").click();
  await page.locator("#edit-holes").click();
  await page
    .getByRole("button", { name: "Move hole 2 earlier", exact: true })
    .click();
  expect(
    (await page.evaluate(() => window.__gameTest.getState())).holes[0].id,
  ).toBe("hole-2");
  await page
    .getByRole("button", { name: "Remove hole 1", exact: true })
    .click();
  await page.locator("#confirm-removal").click();
  expect(
    (await page.evaluate(() => window.__gameTest.getState())).holes,
  ).toHaveLength(1);
  await page
    .getByRole("button", { name: "Close hole editor", exact: true })
    .click();
  await expect(page.locator("#hole-select")).toHaveValue("hole-1");
});


test("choosing Tee on an open hole starts the next hole without moving the first", async ({ page }) => {
  await ready(page);
  await page.locator("#pause").click();
  await place(page, "tee", -29, 7);
  await place(page, "green", 1, -13);
  await page.locator("#open-hole").click();
  const first = await page.evaluate(() => window.__gameTest.getState().holes[0]);
  expect(first.open).toBe(true);
  await place(page, "tee", 11, -13);
  await expect(page.locator("#hole-select")).toHaveValue("hole-2");
  let holes = await page.evaluate(() => window.__gameTest.getState().holes);
  expect(holes).toHaveLength(2);
  expect(holes[0]).toEqual(first);
  expect(holes[1].tee).not.toBeNull();
  await page.locator("#hole-select").selectOption("hole-1");
  await page.locator('[data-tool="tee"]').click();
  await expect(page.locator("#hole-select")).toHaveValue("hole-2");
  expect(await page.evaluate(() => window.__gameTest.getState().holes.length)).toBe(2);
  await place(page, "green", 29, 7);
  await page.locator("#open-hole").click();
  holes = await page.evaluate(() => window.__gameTest.getState().holes);
  expect(holes[1].open).toBe(true);
});


test("holding Space pans without building or pausing, then restores the tool", async ({ page }) => {
  await ready(page);
  await page.locator('[data-tool="fairway"]').click();
  const before = await page.evaluate(() => ({ target: window.__gameTest.getCameraTarget(), game: window.__gameTest.getState() }));
  await page.keyboard.down("Space");
  await page.mouse.move(600, 250);
  await page.mouse.down();
  await page.mouse.move(750, 300, { steps: 10 });
  await page.mouse.up();
  await page.keyboard.up("Space");
  const after = await page.evaluate(() => ({ target: window.__gameTest.getCameraTarget(), game: window.__gameTest.getState() }));
  expect(after.target).not.toEqual(before.target);
  expect(after.game.tiles).toEqual(before.game.tiles);
  await expect(page.locator("#pause")).toHaveAttribute("aria-label", "Pause simulation");
  await expect(page.locator('[data-tool="fairway"]')).toHaveClass(/active/);
});


test("right-click removes an object in Build without changing the selected tool", async ({ page }) => {
  await ready(page);
  await page.locator("#pause").click();
  await place(page, "bench", 11, 1);
  await page.locator('[data-tool="fairway"]').click();
  const point = await page.evaluate(() => window.__gameTest.project(11, 1));
  await page.mouse.click(point.x, point.y, { button: 'right' });
  await expect(page.locator("#remove-dialog")).toBeVisible();
  await page.locator("#cancel-removal").click();
  expect(await page.evaluate(() => window.__gameTest.getState().facilities.length)).toBe(1);
  await page.mouse.click(point.x, point.y, { button: 'right' });
  await page.locator("#confirm-removal").click();
  expect(await page.evaluate(() => window.__gameTest.getState().facilities.length)).toBe(0);
  await expect(page.locator('[data-tool="fairway"]')).toHaveClass(/active/);
  await page.locator('[data-mode="play"]').click();
  await page.mouse.click(point.x, point.y, { button: 'right' });
  await expect(page.locator("#remove-dialog")).not.toBeVisible();
});
