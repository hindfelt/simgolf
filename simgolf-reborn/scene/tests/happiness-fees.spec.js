import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  openHole,
  update,
  takeShot,
  serialize,
  restore,
} from "../src/simulation/game.js";
import { happinessReaction, greenFee } from "../src/simulation/happiness.js";
import { createSession } from "../src/simulation/session.js";
function setup() {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 36, 5);
  openHole(g);
  while (!g.guests.length) update(g, 0.05);
  g.nextWeed = g.time + 10000;
  for (const v of g.guests) v.seenWeeds = g.weeds.map((w) => w.id);
  return g;
}
test("positive and negative incidents change happiness once, then actual completion charges the snapshot once", () => {
  const g = setup(),
    v = g.guests[0];
  v.happiness = 4;
  happinessReaction(v, "flowers:hole-1", 1);
  happinessReaction(v, "flowers:hole-1", 1);
  expect(greenFee(v)).toBe(500);
  happinessReaction(v, "wait:hole-1", -1);
  happinessReaction(v, "wait:hole-1", -1);
  expect(greenFee(v)).toBe(400);
  const cup = g.holes[0].green;
  v.ball = { x: cup.x - 0.5, z: cup.z };
  v.pos = { ...v.ball };
  v.path = [];
  v.phase = "address";
  expect(takeShot(g, v, cup).ok).toBe(true);
  const resumed = restore(serialize(g)),
    cash = g.cash;
  for (let i = 0; i < 60; i++) {
    update(g, 0.05);
    update(resumed, 0.05);
  }
  expect(serialize(resumed)).toBe(serialize(g));
  expect(v.scorecard[0]).toMatchObject({ fee: 400, happiness: 4 });
  expect(g.cash - cash).toBe(400);
  expect(g.stats.fees).toBe(400);
  expect(g.holes[0].stats.fees).toBe(400);
  const broken = JSON.parse(serialize(g));
  broken.guests.find((p) => p.id === v.id).scorecard[0].happiness = 9;
  expect(() => restore(JSON.stringify(broken))).toThrow(/scorecard/i);
});
test("legacy migration preserves financial history and current invalid happiness rejects", () => {
  const g = setup();
  createSession(g);
  const old = structuredClone(g);
  old.protocol.version = 25;
  old.protocol.ruleset = "prototype-course-skill-caps-2026-09-06";
  for (const v of old.guests) {
    delete v.happiness;
    delete v.happinessReactions;
  }
  const loaded = restore(JSON.stringify(old));
  expect(loaded.cash).toBe(g.cash);
  expect(loaded.ledger).toEqual(g.ledger);
  expect(loaded.guests.every((v) => v.happiness >= 2 && v.happiness <= 5)).toBe(
    true,
  );
  const bad = structuredClone(g);
  bad.guests[0].happiness = -1;
  expect(() => restore(JSON.stringify(bad))).toThrow(/happiness/i);
  const v = g.guests[0];
  v.happiness = 0;
  happinessReaction(v, "negative", -1);
  expect(greenFee(v)).toBe(0);
  expect(greenFee({ pro: true })).toBe(0);
});
