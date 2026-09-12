import { test, expect } from "@playwright/test";

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test(
    "World properties browse original offers at " + viewport.width,
    async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/");
      await page.getByRole("button", { name: "Club menu" }).click();
      await page
        .getByRole("button", { name: "World properties", exact: true })
        .click();
      const dialog = page.getByRole("dialog", { name: "A world of golf" });
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByRole("navigation").getByRole("button"),
      ).toHaveCount(16);
      await expect(dialog.locator(".world-detail")).toContainText("§50,000");
      await dialog
        .getByRole("button", { name: "County Kincaide", exact: true })
        .click();
      const detail = dialog.locator(".world-detail");
      await expect(detail).toContainText("Ireland");
      await expect(detail).toContainText("hilly");
      await expect(detail).toContainText("links");
      await expect(detail).toContainText("Leprechauns");
      await expect(
        dialog.getByRole("button", { name: "County Kincaide", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(await dialog.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: "../graphics/samples/world-screen-" + viewport.width + ".png",
      });
      await dialog.getByRole("button", { name: "Close World Screen" }).click();
      await expect(dialog).not.toBeVisible();
      await page.getByRole("button", { name: "Club menu" }).click();
      await page
        .getByRole("button", { name: "World properties", exact: true })
        .click();
      await expect(detail).toContainText("County Kincaide");
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
    },
  );
}
