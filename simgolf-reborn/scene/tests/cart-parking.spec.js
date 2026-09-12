import { PROTOCOL_VERSION } from "../src/simulation/protocol.js";
import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  openHole,
  update,
  takeShot,
  serialize,
  restore,
  lie,
} from "../src/simulation/game.js";
import { center } from "../src/simulation/world.js";
import { createSession } from "../src/simulation/session.js";
function course() {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 36, 5);
  build(g, "cart-garage", 22, 13);
  for (let c = 8; c <= 22; c++) build(g, "path", c, 11);
  for (let c = 25; c <= 27; c++) build(g, "path", c, 20);
  openHole(g);
  while (!g.guests.length) update(g, 0.05);
  const v = g.guests[0];
  v.pos = center(25, 20);
  v.cartPosition = { ...v.pos, heading: Math.PI / 2 };
  v.path = [center(26, 20), center(27, 20), center(28, 20)];
  v.phase = "walking";
  v.afterWalk = "address";
  return { g, v };
}
test("cart parks at path edge, survives a shot, and is picked up on the next walking route", () => {
  const { g, v } = course();
  for (let i = 0; i < 100 && v.phase === "walking"; i++) update(g, 0.05);
  expect(v.phase).toBe("address");
  expect(v.cartPosition.x).toBeLessThan(v.pos.x);
  const parked = { ...v.cartPosition };
  v.ball = { ...v.pos };
  expect(takeShot(g, v, center(25, 20)).ok).toBe(true);
  const copy = restore(serialize(g));
  for (let i = 0; i < 500 && v.phase === "shot"; i++) {
    update(g, 0.05);
    update(copy, 0.05);
    expect(v.cartPosition).toEqual(parked);
  }
  expect(v.phase).toBe("walking");
  expect(v.path.some((p) => p.x === parked.x && p.z === parked.z)).toBe(true);
  expect(serialize(copy)).toBe(serialize(g));
  for (let i = 0; i < 500 && v.cartPosition.x === parked.x; i++) {
    update(g, 0.05);
    update(copy, 0.05);
  }
  expect(v.cartPosition.x).not.toBe(parked.x);
  expect(serialize(copy)).toBe(serialize(g));
});
test("legacy available carts gain a position while malformed current cart positions reject", () => {
  const { g, v } = course();
  createSession(g);
  const old = structuredClone(g);
  old.protocol.version = 44;
  old.protocol.ruleset = "prototype-golf-carts-2026-09-06";
  delete old.guests[0].cartPosition;
  expect(restore(JSON.stringify(old)).guests[0].cartPosition).toEqual({
    ...v.pos,
    heading: v.heading || 0,
  });
  const bad = structuredClone(g);
  delete bad.guests[0].cartPosition;
  expect(() => restore(JSON.stringify(bad))).toThrow();
});
test("browser retains a parked cart apart from its golfer after reload", async ({
  page,
}) => {
  const { g, v } = course();
  for (let i = 0; i < 100 && v.phase === "walking"; i++) update(g, 0.05);
  v.wait = -100;
  await page.addInitScript((save) => {
    if (!localStorage.getItem("simgolf-reborn.course.v1"))
      localStorage.setItem("simgolf-reborn.course.v1", save);
  }, serialize(g));
  await page.goto("/");
  await page.waitForFunction(() => !!window.__gameTest);
  await expect
    .poll(() =>
      page.evaluate(
        (id) =>
          window.__gameTest.getVisibleActors().find((a) => a.id === id)?.cart,
        v.id,
      ),
    )
    .toEqual({ x: v.cartPosition.x, z: v.cartPosition.z });
  await page.screenshot({ path: "../graphics/samples/cart-parking.png" });
  await page.reload();
  await page.waitForFunction(() => !!window.__gameTest);
  await expect
    .poll(() =>
      page.evaluate(
        (id) =>
          window.__gameTest.getVisibleActors().find((a) => a.id === id)?.cart,
        v.id,
      ),
    )
    .toEqual({ x: v.cartPosition.x, z: v.cartPosition.z });
});

test("collecting a holed putt leaves the cart parked without a pickup detour", () => {
  const { g, v } = course();
  v.pos = center(35, 4);
  v.ball = { ...v.pos };
  v.phase = "address";
  v.path = [];
  const parked = { ...v.cartPosition };
  expect(lie(g, v.ball)).toBe("green");
  expect(takeShot(g, v, center(35, 6)).ok).toBe(true);
  const copy = restore(serialize(g));
  for (let i = 0; i < 500 && v.phase === "shot"; i++) {
    update(g, 0.05);
    update(copy, 0.05);
  }
  expect(v.phase).toBe("walking");
  expect(v.path.length).toBeGreaterThan(0);
  expect(v.path.every((p) => lie(g, p) === "green")).toBe(true);
  expect(v.path.some((p) => p.x === parked.x && p.z === parked.z)).toBe(false);
  for (let i = 0; i < 500 && v.phase === "walking"; i++) {
    update(g, 0.05);
    update(copy, 0.05);
  }
  expect(v.phase).toBe("hole-complete");
  expect(v.cartPosition).toEqual(parked);
  expect(serialize(copy)).toBe(serialize(g));
});

test("protocol 45 saves retain parked carts when migrating routing rules", () => {
  const { g } = course();
  createSession(g);
  g.protocol.version = 45;
  g.protocol.ruleset = "prototype-cart-parking-2026-09-06";
  const loaded = restore(serialize(g));
  expect(loaded.guests[0].cartPosition).toEqual(g.guests[0].cartPosition);
  expect(loaded.protocol.version).toBe(PROTOCOL_VERSION);
});
