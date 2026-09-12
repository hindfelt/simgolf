import { test, expect } from "@playwright/test";
import { createGame, build, serialize } from "../src/simulation/game.js";

for (const kind of ["championship", "pro-challenge"]) {
  test(`start ${kind}, play, resume and preserve the resort`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const game = createGame();
    build(game, "tee", 7, 20);
    build(game, "green", 36, 5);
    await page.goto("/");
    await page.evaluate(
      (save) => localStorage.setItem("simgolf-reborn.course.v1", save),
      serialize(game),
    );
    await page.reload();
    await page.waitForFunction(() => !!window.__gameTest);
    await page.locator("#pause").click();
    await page.locator("#menu-button").click();
    await page.locator(`#${kind}`).click();
    await page.locator("#start-championship").click();
    await page.waitForURL(/championship=/);
    await page.waitForFunction(() => !!window.__gameTest);
    await expect(page.locator("#cash")).toHaveText(
      kind === "pro-challenge" ? "Pro challenge" : "Local championship",
    );
    const actors = await page.evaluate(() => window.__gameTest.getVisibleActors());
    expect(actors).toHaveLength(2);
    expect(actors.some(a => a.id === "opponent:club-rival" && a.ball)).toBe(true);
    const resort = await page.evaluate(() =>
      localStorage.getItem("simgolf-reborn.course.v1"),
    );
    await page.locator("#standings").click();
    await expect(page.locator("#standings-content")).toContainText(
      "Club professional",
    );
    await page
      .getByRole("button", { name: "Close standings", exact: true })
      .click();
    await page.locator("#speed").click();
    for (let i = 0; i < 100; i++) {
      const state = await page.evaluate(() => ({
        game: window.__gameTest.getState(),
        event: window.__gameTest.getCompetition(),
      }));
      if (state.event.status === "complete") break;
      if (state.game.pro.phase === "address") {
        const green = state.game.holes.find(
          (h) => h.id === state.game.pro.holeId,
        ).green;
        const p = await page.evaluate(
          (p) => window.__gameTest.project(p.x, p.z),
          green,
        );
        await page.mouse.click(p.x, p.y);
      }
      await page.waitForTimeout(500);
    }
    await expect(page.locator("#fun")).toHaveText("Event complete", {
      timeout: 10000,
    });
    await expect(page.locator("#standings-dialog")).toBeVisible();
    const event = await page.evaluate(() => window.__gameTest.getCompetition());
    expect(
      event.standings.every((p) => p.roundsCompleted === 1 && p.rank >= 1),
    ).toBe(true);
    if (kind === "pro-challenge") {
      await expect(page.locator("#challenge-results")).toContainText(
        "Match wager:",
      );
      expect(event.residentNet + event.challengerNet).toBe(0);
    }
    await page.screenshot({ path: `../graphics/samples/${kind}-results.png` });
    await page.reload();
    await page.waitForFunction(() => !!window.__gameTest);
    expect(
      await page.evaluate(() => window.__gameTest.getCompetition()),
    ).toEqual(event);
    expect(
      await page.evaluate(() =>
        localStorage.getItem("simgolf-reborn.course.v1"),
      ),
    ).toBe(resort);
    await page
      .getByRole("button", { name: "Close standings", exact: true })
      .click();
    await page.locator("#find-rival").click();
    await expect(page.locator("#toast")).toContainText("You still control Gary");
    expect(await page.evaluate(() => window.__gameTest.getCompetition())).toEqual(event);
    await page.locator("#menu-button").click();
    const downloadPromise = page.waitForEvent("download");
    await page.locator("#export").click();
    const download = await downloadPromise;
    const exportPath = await download.path();
    await page.locator("#return-resort").click();
    await page.waitForFunction(
      () => !!window.__gameTest && !window.__gameTest.getCompetition(),
    );
    expect((await page.evaluate(() => window.__gameTest.getState())).cash).toBe(
      JSON.parse(resort).cash,
    );
    await page.locator("#menu-button").click();
    await page.locator("#import-championship").setInputFiles(exportPath);
    await page.waitForURL(/championship=/);
    await page.waitForFunction(() => !!window.__gameTest);
    expect(
      await page.evaluate(() => window.__gameTest.getCompetition()),
    ).toEqual(event);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator("#standings-dialog")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page
        .locator("#standings-content")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await page.screenshot({
      path: "../graphics/samples/local-championship-phone.png",
    });
    expect(errors).toEqual([]);
  });
}
