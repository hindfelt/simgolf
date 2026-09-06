import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  openHole,
  update,
  serialize,
  restore,
} from "../src/simulation/game.js";
import { stepOpeningStory } from "../src/stories/live.js";
function start() {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 36, 5);
  openHole(g);
  for (let i = 0; i < 90; i++) update(g, 0.05);
  return g;
}
test("first pair speaks, retries an unhappy chapter and resumes toward one happy ending", () => {
  const g = start();
  expect(g.openingStory.partners).toHaveLength(2);
  const [a, b] = g.openingStory.partners.map((id) =>
    g.guests.find((v) => v.id === id),
  );
  a.pos = { x: 0, z: 0 };
  b.pos = { x: 1, z: 0 };
  a.shot = b.shot = null;
  b.mood = 20;
  expect(g.openingStory.lines).toHaveLength(1);
  g.time += 12;
  stepOpeningStory(g);
  expect(g.openingStory.lines).toHaveLength(2);
  expect(g.openingStory.progress.chapter).toBe(0);
  const saved = restore(serialize(g));
  for (const v of saved.guests) v.mood = 90;
  for (let i = 0; i < 8; i++) {
    saved.time += 12;
    stepOpeningStory(saved);
  }
  expect(saved.openingStory.status).toBe("happy-ending");
  expect(saved.openingStory.progress.chapter).toBe(4);
  const count = saved.openingStory.lines.length;
  saved.time += 20;
  stepOpeningStory(saved);
  expect(saved.openingStory.lines).toHaveLength(count);
  expect(restore(serialize(saved)).openingStory).toEqual(saved.openingStory);
  const corrupt = JSON.parse(serialize(saved));
  corrupt.openingStory.progress.chapter = 5;
  expect(() => restore(JSON.stringify(corrupt))).toThrow();
});
test("browser shows the first original story prompt from real visitors", async ({
  page,
}) => {
  const g = start();
  await page.addInitScript((save) => {
    const key = "simgolf-reborn.course.v1";
    if (!localStorage.getItem(key)) localStorage.setItem(key, save);
  }, serialize(g));
  await page.goto("/");
  await page.waitForFunction(() => !!window.__gameTest);
  await page.reload();
  await page.waitForFunction(() => !!window.__gameTest);
  await expect(
    page
      .locator(".golfer-remark")
      .filter({ hasText: "our friendship is the first story" }),
  ).toBeVisible({ timeout: 15000 });
  await page.locator("#pause").click();
  await page.screenshot({ path: "../graphics/samples/opening-day-story.png" });
});

test("phone story report preserves actual transcript after reload", async ({
  page,
}) => {
  const g = start();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((save) => {
    const key = "simgolf-reborn.course.v1";
    if (!localStorage.getItem(key)) localStorage.setItem(key, save);
  }, serialize(g));
  await page.goto("/");
  await page.waitForFunction(() => !!window.__gameTest);
  await page.reload();
  await page.waitForFunction(() => !!window.__gameTest);
  await page.locator("#pause").click();
  await page.locator('[data-mode="reports"]').click();
  await page.locator("#story-report").click();
  await expect(page.locator("#story-report-content")).toContainText(
    "Opening Day",
  );
  await expect(page.locator(".story-transcript")).toContainText(
    "our friendship is the first story",
  );
  await expect(page.locator(".story-status")).toHaveText("Chapter 1 of 4");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "../graphics/samples/story-report-phone.png" });
});
test("saved story text and chapter progress must agree", () => {
  const g = start();
  const text = JSON.parse(serialize(g));
  text.openingStory.lines[0].text = "invented";
  expect(() => restore(JSON.stringify(text))).toThrow();
  const progress = JSON.parse(serialize(g));
  progress.openingStory.progress.chapter = 2;
  expect(() => restore(JSON.stringify(progress))).toThrow();
});

test("unfinished conversation resumes only for its original returning pair without losing its transcript", () => {
  const g = start();
  const [a, b] = g.openingStory.partners.map((id) =>
    g.guests.find((v) => v.id === id),
  );
  a.pos = { x: 0, z: 0 };
  b.pos = { x: 1, z: 0 };
  a.shot = b.shot = null;
  const transcript = structuredClone(g.openingStory.lines),
    progress = structuredClone(g.openingStory.progress);
  a.paid = true;
  stepOpeningStory(g);
  expect(g.openingStory.status).toBe("unfinished");
  a.paid = false;
  const originalPair = b.pair;
  b.pair = a.pair + 1;
  g.time += 30;
  stepOpeningStory(g);
  expect(g.openingStory.status).toBe("unfinished");
  b.pair = originalPair;
  stepOpeningStory(g);
  expect(g.openingStory.status).toBe("active");
  expect(g.openingStory.lines).toEqual(transcript);
  expect(g.openingStory.progress).toEqual(progress);
  const loaded = restore(serialize(g));
  for (const v of loaded.guests) v.mood = 90;
  for (let i = 0; i < 9; i++) {
    loaded.time += 12;
    stepOpeningStory(loaded);
  }
  expect(loaded.openingStory.status).toBe("happy-ending");
  expect(loaded.openingStory.lines.slice(0, transcript.length)).toEqual(
    transcript,
  );
});
