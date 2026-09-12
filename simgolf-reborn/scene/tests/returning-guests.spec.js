import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  openHole,
  update,
  serialize,
  restore,
} from "../src/simulation/game.js";
import {
  returningGuest,
  RETURN_POLICY,
} from "../src/simulation/guest-roster.js";
import { createSession } from "../src/simulation/session.js";
function setup() {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 22, 10);
  openHole(g);
  while (!g.guests.length) update(g, 0.05);
  return g;
}
function leave(g, v, mood) {
  for (let i = 0; i < 10000 && !v.roundFinished; i++) {
    v.mood = mood;
    update(g, 0.05);
  }
  expect(v.roundFinished).toBe(true);
  for (let i = 0; i < 10000 && g.guests.some((p) => p.id === v.id); i++)
    update(g, 0.05);
  expect(g.guests.some((p) => p.id === v.id)).toBe(false);
}
test("happy visitor returns with identity and trained skills, fresh round and unchanged past fees", () => {
  const g = setup(),
    v = g.guests[0],
    firstRound = v.roundId;
  v.skills = { length: true, accuracy: true, imagination: true };
  v.trained = { accuracy: true };
  leave(g, v, 90);
  const record = g.guestRoster.find((p) => p.id === v.id);
  expect(record.nextVisitAt).toBeGreaterThan(g.time);
  const copy = restore(serialize(g));
  let returned;
  for (let i = 0; i < 10000; i++) {
    update(g, 0.05);
    update(copy, 0.05);
    returned = g.guests.find((p) => p.id === v.id);
    if (returned) break;
  }
  expect(returned).toBeTruthy();
  expect(serialize(copy)).toBe(serialize(g));
  expect(returned.name).toBe(v.name);
  expect(returned.skills).toEqual(v.skills);
  expect(returned.trained).toEqual(v.trained);
  expect(returned.roundId).not.toBe(firstRound);
  expect(returned.paid).toBe(false);
  expect(returned.scorecard).toEqual([]);
  expect(record.rounds).toBe(1);
  expect(record.nextVisitAt).toBeNull();
  expect(g.guests.filter((p) => p.id === v.id)).toHaveLength(1);
  expect(g.guests.filter((p) => p.pair === returned.pair)).toHaveLength(2);
  expect(g.stats.fees).toBe(
    g.ledger
      .filter((r) => r.reason.includes("green fee"))
      .reduce((sum, r) => sum + r.amount, 0),
  );
  for (let i = 0; i < 10000 && record.rounds < 2; i++) update(g, 0.05);
  expect(record.rounds).toBe(2);
  expect(g.stats.fees).toBe(
    g.ledger
      .filter((r) => r.reason.includes("green fee"))
      .reduce((sum, r) => sum + r.amount, 0),
  );
});
test("unhappy visitors return later and older missing profiles are not invented", () => {
  const g = setup(),
    v = g.guests[0];
  leave(g, v, 10);
  expect(g.guestRoster.find((p) => p.id === v.id).nextVisitAt).toBeGreaterThan(
    g.time + RETURN_POLICY.delay,
  );
  expect(returningGuest(g)?.id).not.toBe(v.id);
  createSession(g);
  const old = structuredClone(g);
  old.protocol.version = 21;
  old.protocol.ruleset = "prototype-guest-roster-2026-09-06";
  for (const p of old.guestRoster) {
    delete p.profile;
    delete p.nextVisitAt;
  }
  const migrated = restore(JSON.stringify(old));
  expect(migrated.guestRoster.find((p) => p.id === v.id).profile).toBeNull();
  const bad = structuredClone(g);
  bad.guestRoster[0].nextVisitAt = -1;
  expect(() => restore(JSON.stringify(bad))).toThrow(/roster/i);
  expect(RETURN_POLICY.delay).toBeGreaterThan(0);
});
