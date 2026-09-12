import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  openHole,
  update,
  serialize,
  restore,
} from "../src/simulation/game.js";
import { firstHoleReadyForArrivals } from "../src/simulation/guest-roster.js";
import { createSession } from "../src/simulation/session.js";
import { PROTOCOL_VERSION } from "../src/simulation/protocol.js";
function course() {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 36, 5);
  openHole(g);
  while (!g.guests.length) update(g, 0.05);
  return g;
}
test("both opening golfers must hit twice; penalties and pre-tee services cannot release arrivals", () => {
  const g = course();
  expect(firstHoleReadyForArrivals(g)).toBe(false);
  const [a, b] = g.guests;
  a.holeReactions.shots = 2;
  b.strokes = 3; // a stroke-and-distance penalty is not a physical shot
  b.holeReactions.shots = 1;
  expect(firstHoleReadyForArrivals(g)).toBe(false);
  b.holeReactions.shots = 2;
  expect(firstHoleReadyForArrivals(g)).toBe(true);
  b.holeReactions.shots = 0;
  b.phase = "service";
  expect(firstHoleReadyForArrivals(g)).toBe(false);
  b.scorecard.push({ holeId: g.holes[0].id, strokes: 1 });
  expect(firstHoleReadyForArrivals(g)).toBe(true);
  const completed = { ...a, scorecard: [{ holeId: g.holes[0].id }] };
  g.guests = Array.from({ length: 12 }, () => structuredClone(completed));
  expect(firstHoleReadyForArrivals(g)).toBe(false);
  g.holes[0].open = false;
  expect(firstHoleReadyForArrivals(g)).toBe(false);
});
test("live admissions follow shots rather than the former timer and resume identically", () => {
  const g = course();
  createSession(g);
  const copy = restore(serialize(g));
  const initial = g.guests.map((v) => v.roundId);
  let admitted = false;
  for (let i = 0; i < 6000; i++) {
    const ready = firstHoleReadyForArrivals(g);
    const count = g.guestRoster.length;
    update(g, 0.05);
    update(copy, 0.05);
    if (g.guestRoster.length > count) {
      expect(ready).toBe(true);
      admitted = true;
      break;
    }
    if (!ready)
      expect(g.guests.every((v) => initial.includes(v.roundId))).toBe(true);
  }
  expect(admitted).toBe(true);
  expect(serialize(copy)).toBe(serialize(g));
});
test("previous saves keep completed results and migrate to the new cadence", () => {
  const g = course();
  createSession(g);
  const previous = JSON.parse(serialize(g));
  previous.protocol.version = 28;
  previous.protocol.ruleset = "prototype-comment-fun-2026-09-06";
  const loaded = restore(JSON.stringify(previous));
  expect(loaded.protocol.version).toBe(PROTOCOL_VERSION);
  expect(loaded.ledger).toEqual(g.ledger);
  expect(loaded.guests).toEqual(g.guests);
  delete loaded.guests[0].holeReactions;
  expect(firstHoleReadyForArrivals(loaded)).toBe(false);
});

test("an actual first-hole ballwasher visit holds back the next pair", () => {
  const g = createGame(22);
  for (const [tool, c, r] of [
    ["tee", 7, 20],
    ["green", 36, 5],
    ["ballwasher", 11, 12],
  ])
    expect(build(g, tool, c, r).ok).toBe(true);
  for (let c = 8; c <= 11; c++) expect(build(g, "path", c, 11).ok).toBe(true);
  openHole(g);
  let observedService = false,
    admitted = false;
  for (let i = 0; i < 6000; i++) {
    update(g, 0.05);
    if (
      g.guests.some(
        (v) =>
          v.phase === "service" &&
          v.serviceId === g.facilities[0].id &&
          v.holeReactions.shots === 0,
      )
    ) {
      observedService = true;
      expect(g.guestRoster).toHaveLength(2);
      expect(firstHoleReadyForArrivals(g)).toBe(false);
    }
    if (g.guestRoster.length > 2) {
      admitted = true;
      break;
    }
  }
  expect(observedService).toBe(true);
  expect(admitted).toBe(true);
});
