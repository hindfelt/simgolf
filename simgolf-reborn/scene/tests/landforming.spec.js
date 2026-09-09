import { createSession } from "../src/simulation/session.js";
import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  tile,
  route,
  restore,
  serialize,
  startPractice,
  takeShot,
  update,
} from "../src/simulation/game.js";
import { key, center } from "../src/simulation/world.js";
import { elevationAt, isOut } from "../src/simulation/landforming.js";
import {
  exportCourse,
  importCourse,
  coursePractice,
} from "../src/simulation/course-package.js";
function course() {
  const g = createGame();
  expect(build(g, "tee", 7, 20).ok).toBe(true);
  expect(build(g, "green", 36, 5).ok).toBe(true);
  return g;
}
test("land height changes in both directions, preserves turf, and survives save and course sharing", async () => {
  const g = course();
  expect(build(g, "fairway", 23, 18).ok).toBe(true);
  expect(build(g, "raise", 23, 18).ok).toBe(true);
  const p = center(23, 18);
  expect(elevationAt(g, p.x, p.z)).toBe(0.5);
  expect(tile(g, 23, 18)).toBe("fairway");
  expect(build(g, "lower", 23, 18).ok).toBe(true);
  expect(elevationAt(g, p.x, p.z)).toBe(0);
  expect(build(g, "lower", 23, 18).ok).toBe(true);
  expect(elevationAt(restore(serialize(g)), p.x, p.z)).toBe(-0.5);
  const pkg = await exportCourse(g);
  const shared = coursePractice(await importCourse(JSON.stringify(pkg)));
  expect(shared.elevation).toEqual(g.elevation);
});
test("tee rotates through eight headings and exports its direction", async () => {
  const g = course();
  for (let i = 1; i <= 9; i++) {
    expect(build(g, "rotate-tee", 7, 20).ok).toBe(true);
    expect(g.holes[0].tee.direction).toBe(i % 8);
  }
  const pkg = await exportCourse(g);
  expect(coursePractice(pkg).holes[0].tee.direction).toBe(1);
  startPractice(g);
  expect(build(g, "rotate-tee", 7, 20).ok).toBe(false);
});
test("original stream can be filled, extended, and crossed with a walkable bridge", async () => {
  const g = course(),
    c = 26,
    r = 29;
  expect(tile(g, c, r)).toBe("water");
  expect(build(g, "rough", c, r).ok).toBe(true);
  expect(tile(g, c, r)).toBe("rough");
  expect(build(g, "water", c, r).ok).toBe(true);
  expect(build(g, "path", c, r).ok).toBe(true);
  expect(g.bridges[key(c, r)]).toBe(true);
  expect(tile(g, c, r)).toBe("path");
  for (let row = 27; row <= 30; row++) {
    if (tile(g, c, row) === "water")
      expect(build(g, "bridge", c, row).ok).toBe(true);
  }
  expect(route(g, center(c, 26), center(c, 31))).toBeTruthy();
  const pkg = await exportCourse(g);
  expect(coursePractice(pkg).bridges).toEqual(g.bridges);
  expect(build(g, "rough", c, r).ok).toBe(true);
  expect(g.bridges[key(c, r)]).toBeUndefined();
});
test("out of bounds costs one penalty and drops near the boundary", () => {
  const g = course();
  expect(build(g, "out-of-bounds", 13, 20, 5).ok).toBe(true);
  expect(build(g, "clear-boundary", 13, 20, 5).ok).toBe(true);
  expect(Object.keys(g.outOfBounds)).toHaveLength(0);
  expect(build(g, "out-of-bounds", 13, 20, 5).ok).toBe(true);
  startPractice(g);
  const v = g.pro,
    from = { ...v.ball };
  takeShot(g, v, center(13, 20));
  for (let i = 0; i < 200 && v.shot; i++) update(g, 0.05);
  expect(v.strokes).toBe(2);
  expect(v.ball).not.toEqual(from);
  expect(isOut(g, v.ball)).toBe(false);
  expect(v.ball.x).toBeGreaterThan(from.x);
  expect(v.comment).toContain("Out of bounds");
  expect(restore(serialize(g)).pro.ball).toEqual(v.ball);
});
test("browser shows illustrated tools and editable landscape", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.waitForFunction(() => window.__gameTest);
  await page.locator("#pause").click();
  async function place(tool, x, z) {
    await page.locator(`[data-tool="${tool}"]`).click();
    const p = await page.evaluate(
      ([x, z]) => window.__gameTest.project(x, z),
      [x, z],
    );
    await page.mouse.click(p.x, p.y);
  }
  await page.locator("#brush").selectOption("5");
  for (let i = 0; i < 4; i++) await place("raise", 3, 1);
  await page.locator("#brush").selectOption("1");
  await place("tee", -29, 7);
  await place("rotate-tee", -29, 7);
  await place("out-of-bounds", 17, 7);
  await place("bridge", 9, 25);
  expect(
    await page.evaluate(() => window.__gameTest.getState().elevation),
  ).toBeTruthy();
  expect(await page.locator(".construction-icon svg").count()).toBeGreaterThan(
    25,
  );
  await page.mouse.move(900, 200);
  await page.screenshot({ path: "../graphics/samples/landforming.png" });
  expect(errors).toEqual([]);
});

test("aiming stays visible across water to the full target", async ({
  page,
}) => {
  const g = course();
  build(g, "water", 20, 14, 5);
  startPractice(g);
  await page.addInitScript(
    (save) => localStorage.setItem("simgolf-reborn.course.v1", save),
    serialize(g),
  );
  await page.goto("/");
  await page.waitForFunction(() => window.__gameTest);
  await page.locator("#pause").click();
  await page.locator('[data-mode="play"]').click();
  const p = await page.evaluate(() => window.__gameTest.project(29, -23));
  await page.mouse.move(p.x, p.y);
  await page.screenshot({ path: "../graphics/samples/full-shot-line.png" });
  expect(
    await page.evaluate(() => window.__gameTest.getState().pro.phase),
  ).toBe("address");
});

test("uphill terrain changes a seeded shot and repeated bridge paint does not charge again", () => {
  const flat = course(),
    hill = restore(serialize(flat));
  for (let i = 0; i < 4; i++)
    expect(build(hill, "raise", 13, 20, 3).ok).toBe(true);
  startPractice(flat);
  startPractice(hill);
  const target = center(13, 20);
  takeShot(flat, flat.pro, target);
  takeShot(hill, hill.pro, target);
  expect(hill.pro.shot.landing.x).toBeLessThan(flat.pro.shot.landing.x);
  const g = course();
  expect(build(g, "bridge", 26, 29).ok).toBe(true);
  const cash = g.cash;
  expect(build(g, "bridge", 26, 29).ok).toBe(true);
  expect(g.cash).toBe(cash);
  const bad = JSON.parse(serialize(g));
  bad.bridges[key(26, 10)] = true;
  expect(() => restore(JSON.stringify(bad))).toThrow("Bridge needs water");
});

test("elevation is free at zero funds and in debt, with transactional protection and replay receipts", () => {
  const g = course();
  g.ledger.push({
    id: g.ledger.length + 1,
    time: g.time,
    amount: -g.cash,
    reason: "Fixture expenses",
  });
  g.cash = 0;
  const host = createSession(g),
    owner = { id: "owner", role: "owner" };
  const beforeLedger = structuredClone(g.ledger);
  const command = host.nextCommand(owner.id, "build", {
    tool: "raise",
    c: 23,
    r: 18,
    brush: 3,
    holeId: "hole-1",
  });
  const result = host.execute(command, owner);
  expect(result.ok).toBe(true);
  expect(host.execute(command, owner)).toEqual(result);
  expect(g.elevation[key(23, 18)]).toBe(0.5);
  expect(g.cash).toBe(0);
  expect(g.ledger).toEqual(beforeLedger);
  const loaded = restore(serialize(g)),
    resumed = createSession(loaded);
  expect(resumed.execute(command, owner)).toEqual(result);
  expect(loaded.elevation).toEqual(g.elevation);
  g.ledger.push({
    id: g.ledger.length + 1,
    time: g.time,
    amount: -10,
    reason: "Fixture wage",
  });
  g.cash = -10;
  expect(build(g, "lower", 23, 18, 3).ok).toBe(true);
  expect(g.cash).toBe(-10);
  expect(restore(serialize(g)).cash).toBe(-10);
  const protectedState = serialize(g);
  expect(build(g, "raise", 26, 29).ok).toBe(false);
  expect(serialize(g)).toBe(protectedState);
  expect(build(g, "bridge", 26, 29).ok).toBe(false);
  expect(serialize(g)).toBe(protectedState);
});
