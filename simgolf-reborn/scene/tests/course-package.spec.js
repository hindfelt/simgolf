import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  hire,
  serialize,
  restore,
} from "../src/simulation/game.js";
import {
  exportCourse,
  importCourse,
  courseDigest,
  coursePractice,
} from "../src/simulation/course-package.js";
import { createSession } from "../src/simulation/session.js";
function course() {
  const g = createGame();
  expect(build(g, "tee", 7, 20).ok).toBe(true);
  expect(build(g, "green", 36, 5).ok).toBe(true);
  return g;
}
const owner = { id: "owner", role: "owner" };
test("export excludes money, people, career and receipts; design snapshot remains immutable", async () => {
  const g = course();
  hire(g);
  const host = createSession(g);
  host.execute(
    host.nextCommand(owner.id, "allocate-pro-skill", {
      skill: "power",
      delta: 1,
    }),
    owner,
  );
  const pkg = await exportCourse(g, "My course");
  expect(Object.keys(pkg.content).sort()).toEqual([
    "bridges",
    "elevation",
    "environment",
    "facilities",
    "holes",
    "landParcels",
    "landscapeStyle",
    "outOfBounds",
    "property",
    "removedTrees",
    "ruleset",
    "starterBridgeRemoved",
    "tiles",
    "title",
    "version",
  ]);
  expect(JSON.stringify(pkg)).not.toContain("proProfile");
  expect(JSON.stringify(pkg)).not.toContain("ledger");
  expect(Object.isFrozen(pkg.content.tiles)).toBe(true);
  const saved = JSON.stringify(pkg);
  build(g, "fairway", 20, 17);
  expect(JSON.stringify(pkg)).toBe(saved);
  expect((await exportCourse(g, "My course")).digest).not.toBe(pkg.digest);
  expect(await importCourse(saved)).toEqual(pkg);
});
test("tampering, unsupported geometry, hidden state and incomplete holes reject", async () => {
  await expect(exportCourse(createGame())).rejects.toThrow();
  const pkg = await exportCourse(course());
  const bad = JSON.parse(JSON.stringify(pkg));
  bad.content.title = "Changed";
  await expect(importCourse(JSON.stringify(bad))).rejects.toThrow("digest");
  for (const alter of [
    (p) => (p.content.cash = 999999),
    (p) => (p.content.holes[0].tee.c = 0),
    (p) => p.content.facilities.push({ id: 1, type: "snack", c: 7, r: 20 }),
    (p) => (p.content.tiles["-1"] = { type: "water" }),
  ]) {
    const p = JSON.parse(JSON.stringify(pkg));
    alter(p);
    p.digest = await courseDigest(p.content);
    await expect(importCourse(JSON.stringify(p))).rejects.toThrow();
  }
});
test("two practice instances cannot alter the package, each other or the resort", async () => {
  const resort = course(),
    before = serialize(resort),
    pkg = await exportCourse(resort);
  const a = coursePractice(pkg),
    b = coursePractice(pkg);
  const untouched = serialize(b),
    host = createSession(a, { courseLocked: true });
  expect(
    host.execute(
      host.nextCommand(owner.id, "build", {
        tool: "fairway",
        c: 20,
        r: 17,
        brush: 1,
        holeId: "hole-1",
      }),
      owner,
    ).code,
  ).toBe("course-locked");
  expect(
    host.execute(
      host.nextCommand(owner.id, "start-practice", { holeId: "hole-1" }),
      owner,
    ).ok,
  ).toBe(true);
  expect(
    host.execute(
      host.nextCommand(owner.id, "shot", {
        x: -9,
        z: 1,
        technique: "straight",
      }),
      owner,
    ).ok,
  ).toBe(true);
  host.stepTicks(200);
  const restored = restore(serialize(a)),
    resume = createSession(restored, { courseLocked: true });
  host.stepTicks(200);
  resume.stepTicks(200);
  expect(serialize(restored)).toBe(serialize(a));
  expect(serialize(b)).toBe(untouched);
  expect(serialize(resort)).toBe(before);
  expect(a.guests).toHaveLength(0);
  expect(a.ledger).toHaveLength(0);
  expect(a.weeds).toHaveLength(0);
  expect((await exportCourse(a)).digest).toBe(pkg.digest);
});
test("browser imports a layout into isolated practice and returns to the unchanged resort", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.__gameTest);
  await page.locator("#pause").click();
  await page.locator('[data-mode="staff"]').click();
  await page.locator("#hire").click();
  const pkg = await exportCourse(course(), "Visitor course");
  await page.locator("#import-course").setInputFiles({
    name: "course.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(pkg)),
  });
  await page.waitForURL(/practice=/);
  await page.waitForFunction(() => window.__gameTest);
  await expect(page.locator(".club h1")).toHaveText("Visitor course");
  await expect(page.locator('[data-mode="build"]')).toBeHidden();
  expect(
    await page.evaluate(() => window.__gameTest.getState().staff.length),
  ).toBe(0);
  await page.locator("#practice").click();
  await page.locator("#pause").click();
  await page.screenshot({
    path: "../graphics/samples/shared-course-practice.png",
  });
  await page.reload();
  await page.waitForFunction(() => window.__gameTest?.getState().pro);
  expect(
    await page.evaluate(() => window.__gameTest.getState().courseDigest),
  ).toBe(pkg.digest);
  await page.locator("#menu-button").click();
  const download = page.waitForEvent("download");
  await page.locator("#export-course").click();
  const file = await download;
  expect(await importCourse(await readFile(await file.path(), "utf8"))).toEqual(
    pkg,
  );
  await page.getByRole("button", { name: "Close menu", exact: true }).click();
  await page.locator("#menu-button").click();
  await page.locator("#return-resort").click();
  await page.waitForURL((url) => !url.searchParams.has("practice"));
  await page.waitForFunction(() => window.__gameTest);
  expect(
    await page.evaluate(() => window.__gameTest.getState().staff.length),
  ).toBe(1);
  expect(
    await page.evaluate(() => window.__gameTest.getState().holes[0].tee),
  ).toBeNull();
});
