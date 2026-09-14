import { test, expect } from "@playwright/test";
import { TOOLS } from "../src/simulation/rules.js";
import { inPaletteGroup } from "../src/ui/construction-palette.js";
test("every construction tool belongs to one category and common controls remain available", () => {
  for (const tool of [...TOOLS, "demolish"]) {
    const groups = ["course", "landscape", "resort"].filter((g) =>
      inPaletteGroup(tool, g),
    );
    expect(groups.length).toBe(["inspect", "demolish"].includes(tool) ? 3 : 1);
  }
});
test("categories filter the tray and clear a hidden active building tool", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.__gameTest);
  await page.locator("#pause").click();
  await page.locator('[data-palette="landscape"]').click();
  await expect(page.locator('[data-tool="raise"]')).toBeVisible();
  await expect(page.locator('[data-tool="hotel"]')).toHaveCount(0);
  await page.locator('[data-tool="raise"]').click();
  await page.locator('[data-palette="resort"]').click();
  await expect(page.locator('[data-tool="inspect"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator('[data-tool="hotel"]')).toBeVisible();
  await page.locator("#brush").selectOption("5");
  await page.locator('[data-palette="course"]').click();
  await expect(page.locator("#brush")).toHaveValue("5");
  await expect(page.locator('[data-tool="green"]')).toBeVisible();
  await page.screenshot({ path: "../graphics/samples/course-palette.png" });
});
test("phone brush selector stays visible while the tool list scrolls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForFunction(() => window.__gameTest);
  await page.getByText("Brush & direction",{exact:true}).click();
  const before = await page.locator("#brush").boundingBox();
  await page
    .locator(".tools")
    .evaluate((el) => (el.scrollTop = el.scrollHeight));
  expect(await page.locator("#brush").boundingBox()).toEqual(before);
  await expect(page.locator("#brush")).toBeInViewport();
  await page.locator('[data-palette="resort"]').click();
  await page.locator('[data-tool="hotel"]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-tool="hotel"]')).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "../graphics/samples/resort-palette-phone.png",
  });
});
