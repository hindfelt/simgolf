import { test, expect } from "@playwright/test";
import { ENVIRONMENTS } from "../src/simulation/environments.js";
import {
  createGame,
  build,
  serialize,
  restore,
} from "../src/simulation/game.js";
import { createSession } from "../src/simulation/session.js";
import {
  exportCourse,
  coursePractice,
} from "../src/simulation/course-package.js";
for (const [environment, { recreation }] of Object.entries(ENVIRONMENTS)) {
  test(`${environment} restricts recreation through authoritative commands and preserves exports`, async () => {
    const g = createGame(42, "classic", environment),
      host = createSession(g),
      owner = { id: "owner", role: "owner" };
    for (const { recreation: tool } of Object.values(ENVIRONMENTS)) {
      const before = g.cash;
      const result = host.execute(
        host.nextCommand(owner.id, "build", {
          tool,
          c: 22,
          r: 15,
          brush: 1,
          holeId: g.holes[0].id,
        }),
        owner,
      );
      expect(result.ok).toBe(tool === recreation);
      if (tool !== recreation) expect(g.cash).toBe(before);
    }
    expect(restore(serialize(g)).environment).toBe(environment);
    build(g, "tee", 7, 20);
    build(g, "green", 36, 5);
    expect(coursePractice(await exportCourse(g)).environment).toBe(environment);
  });
}
test("legacy mixed catalogs remain intact and malformed environments reject", () => {
  const g = createGame();
  delete g.environment;
  expect(build(g, "spa", 22, 15).ok).toBe(true);
  expect(restore(serialize(g)).facilities[0].type).toBe("spa");
  const mixed = structuredClone(g);
  mixed.environment = "parklands";
  expect(() => restore(JSON.stringify(mixed))).toThrow();
  for (const invalid of ["unknown", {}, ["parklands"], 42]) {
    expect(() => createGame(42, "classic", invalid)).toThrow();
    const bad = structuredClone(g);
    bad.environment = invalid;
    expect(() => restore(JSON.stringify(bad))).toThrow();
  }
});
test("phone selects a tropical course and sees its regional recreation option", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("/");
  await page.locator("#loading").waitFor({ state: "hidden" });
  await page.locator("#menu-button").click();
  await page.locator("#new").click();
  await page.locator("#new-environment").selectOption("tropical");
  await expect(page.locator("#environment-summary")).toContainText("Swim Club");
  await page.locator("#confirm-new").click();
  await page.waitForLoadState("load");
  await page.locator("#loading").waitFor({ state: "hidden" });
  await page.locator('[data-palette="resort"]').click();
  await expect(page.locator('[data-tool="swim-club"]')).toHaveCount(1);
  for (const type of ["tennis-court", "stable", "spa"])
    await expect(page.locator(`[data-tool="${type}"]`)).toHaveCount(0);
  expect(
    await page.evaluate(() => window.__gameTest.getState().environment),
  ).toBe("tropical");
  await context.close();
});
