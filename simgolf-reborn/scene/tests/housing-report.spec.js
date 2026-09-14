import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  openHole,
  update,
  serialize,
} from "../src/simulation/game.js";
test("phone housing report shows actual sale, buyer and historical receipt without changing finances", async ({
  page,
}) => {
  const g = createGame();
  build(g, "building-lot", 12, 14);
  for (let c = 7; c <= 12; c++) build(g, "path", c, 12);
  build(g, "tee", 7, 20);
  build(g, "green", 36, 22);
  for (let c = 11; c <= 31; c++) build(g, "fairway", c, 21, 3);
  openHole(g);
  for (let i = 0; i < 18000 && !g.housingSales?.length; i++) update(g, 0.05);
  expect(g.housingSales).toHaveLength(1);
  const sale = g.housingSales[0],
    buyer = g.guestRoster.find((p) => p.id === sale.buyerId);
  // Preserve a sold home's historical payment after its structure is removed.
  g.facilities = [];
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.addInitScript(
    (s) => localStorage.setItem("simgolf-reborn.course.v1", s),
    serialize(g),
  );
  await page.goto("/");
  await page.locator("#loading").waitFor({ state: "hidden" });
  await page.locator("#pause").click();
  await page.locator('[data-mode="reports"]').click();
  const before = await page.evaluate(() => window.__gameTest.getState().cash);
  await page.locator("#housing-report").click();
  const report = page.locator("#housing-content");
  await expect(report).toContainText(buyer.name);
  await expect(report).toContainText("Home removed");
  await expect(report).toContainText(`Ledger receipt ${sale.ledgerId}`);
  expect(await page.evaluate(() => window.__gameTest.getState().cash)).toBe(
    before,
  );
  const bounds = await page.locator("#housing-dialog").boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "/tmp/simgolf-housing-report-phone.png" });
});

test("vacant lot reports missing access and imported homes have no invented owner or income", async ({
  page,
}) => {
  const g = createGame();
  expect(build(g, "building-lot", 12, 14).ok).toBe(true);
  expect(build(g, "building-lot", 18, 14).ok).toBe(true);
  g.facilities[1].type = "home";
  await page.addInitScript(
    (s) => localStorage.setItem("simgolf-reborn.course.v1", s),
    serialize(g),
  );
  await page.goto("/");
  await page.locator("#loading").waitFor({ state: "hidden" });
  await page.locator('[data-mode="reports"]').click();
  await expect(page.locator("#live-details")).toContainText(
    "Home: residential home",
  );
  await expect(page.locator("#live-details")).not.toContainText("undefined");
  await page.locator("#housing-report").click();
  const report = page.locator("#housing-content");
  await expect(report).toContainText("Needs a clubhouse path connection");
  await expect(report).toContainText("Estimated sale $3,000");
  await expect(report).toContainText("No homes sold yet.");
  await expect(report).toContainText(
    "Buyer identities and sale income are not included in course sharing.",
  );
});
