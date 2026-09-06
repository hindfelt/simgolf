import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createGame, build, startPractice } from "../src/simulation/game.js";
import {
  exportGolfer,
  importGolfer,
  loadGolfer,
} from "../src/simulation/golfer-package.js";
import { createSession } from "../src/simulation/session.js";
test("golfer files carry skills without finances, scores or mutable references", () => {
  const g = createGame();
  g.proProfile.skills.power = 4;
  const pkg = exportGolfer(g);
  g.proProfile.skills.power = 0;
  expect(pkg.profile.skills.power).toBe(4);
  const target = createGame(),
    cash = target.cash;
  expect(loadGolfer(target, importGolfer(JSON.stringify(pkg))).ok).toBe(true);
  expect(target.proProfile.skills.power).toBe(4);
  expect(target.cash).toBe(cash);
  expect(target.rounds).toEqual([]);
  pkg.profile.skills.power = 1;
  expect(target.proProfile.skills.power).toBe(4);
});
test("overspent or injected profile state rejects; live rounds cannot swap golfers", () => {
  const g = createGame(),
    pkg = exportGolfer(g);
  pkg.profile.skills.power = 10;
  pkg.profile.skills.luck = 1;
  expect(() => importGolfer(JSON.stringify(pkg))).toThrow();
  const extra = exportGolfer(g);
  extra.cash = 9999;
  expect(() => importGolfer(JSON.stringify(extra))).toThrow();
  build(g, "tee", 7, 20);
  build(g, "green", 36, 5);
  startPractice(g);
  expect(loadGolfer(g, exportGolfer(createGame())).ok).toBe(false);
});
test("loading is owner-controlled, replay-safe and available in shared-course practice", () => {
  const g = createGame(),
    host = createSession(g, { courseLocked: true }),
    owner = { id: "owner", role: "owner" },
    other = { id: "guest", role: "golfer" },
    pkg = exportGolfer(g);
  pkg.profile.skills.irons = 3;
  expect(
    host.execute(
      host.nextCommand(other.id, "load-golfer", { golfer: pkg }),
      other,
    ).ok,
  ).toBe(false);
  const cmd = host.nextCommand(owner.id, "load-golfer", { golfer: pkg }),
    first = host.execute(cmd, owner);
  expect(first.ok).toBe(true);
  expect(host.execute(cmd, owner)).toEqual(first);
  expect(g.proProfile.skills.irons).toBe(3);
});
test("browser downloads and loads saved golfer skills", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.__gameTest);
  await page.locator('[data-mode="play"]').click();
  await page.locator("#pro-skills").click();
  await page
    .getByRole("button", { name: "Increase Power Hitter", exact: true })
    .click();
  const pending = page.waitForEvent("download");
  await page.locator("#export-golfer").click();
  const download = await pending;
  const raw = await readFile(await download.path(), "utf8");
  expect(importGolfer(raw).profile.skills.power).toBe(1);
  const pkg = exportGolfer(createGame());
  pkg.profile.skills.putter = 3;
  await page
    .locator("#import-golfer")
    .setInputFiles({
      name: "golfer.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(pkg)),
    });
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__gameTest.getState().proProfile.skills.putter,
      ),
    )
    .toBe(3);
  await page.screenshot({ path: "../graphics/samples/saved-golfer.png" });
});
