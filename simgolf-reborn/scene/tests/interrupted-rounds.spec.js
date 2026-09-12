import {
  PROTOCOL_VERSION,
  RULESET_VERSION,
} from "../src/simulation/protocol.js";
import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  addHole,
  openHole,
  update,
  serialize,
  restore,
  interruptVisitor,
  hire,
} from "../src/simulation/game.js";
import { cellAt, center, key } from "../src/simulation/world.js";
import { hasClearedTee } from "../src/simulation/guest-roster.js";
function place(g, type, x, z, id) {
  const { c, r } = cellAt(x, z);
  expect(build(g, type, c, r, 1, id).ok).toBe(true);
}
function course() {
  const g = createGame();
  place(g, "tee", -29, 7, "hole-1");
  place(g, "green", 1, -13, "hole-1");
  expect(addHole(g).ok).toBe(true);
  place(g, "tee", 11, -13, "hole-2");
  place(g, "green", 29, 7, "hole-2");
  expect(openHole(g, "hole-1").ok).toBe(true);
  expect(openHole(g, "hole-2").ok).toBe(true);
  return g;
}

test("interruption preserves completed holes and fees without completing the round; partner continues", () => {
  const g = course();
  while (!g.guests.length) update(g, 0.05);
  const v = g.guests[0],
    partner = g.guests[1];
  for (let i = 0; i < 5000 && v.holeId !== "hole-2"; i++) update(g, 0.05);
  expect(v.holeId).toBe("hole-2");
  const completed = structuredClone(v.scorecard),
    stats = structuredClone(g.stats),
    cash = g.cash;
  expect(interruptVisitor(g, v.id, "ejected").ok).toBe(true);
  expect(interruptVisitor(g, v.id, "ejected").ok).toBe(false);
  expect(g.cash).toBe(cash);
  expect(g.stats).toEqual(stats);
  expect(g.interruptedRounds[0].scorecard).toEqual(completed);
  expect(g.rounds.some((r) => r.id === v.roundId)).toBe(false);
  expect(hasClearedTee(v, "hole-2")).toBe(true);
  const copy = restore(serialize(g));
  for (
    let i = 0;
    i < 5000 && (!partner.roundFinished || g.guests.some((p) => p.id === v.id));
    i++
  ) {
    update(g, 0.05);
    update(copy, 0.05);
  }
  expect(partner.roundFinished).toBe(true);
  expect(g.guests.some((p) => p.id === v.id)).toBe(false);
  expect(serialize(copy)).toBe(serialize(g));
  expect(g.guestRoster.find((p) => p.id === v.id).rounds).toBe(0);
  expect(g.guestRoster.find((p) => p.id === v.id).best).toBeNull();
});
test("blocked departure waits, survives reload, then exits when a route is restored", () => {
  const g = course();
  while (!g.guests.length) update(g, 0.05);
  const v = g.guests[0];
  v.pos = center(42, 1);
  for (const [c, r] of [
    [41, 1],
    [43, 1],
    [42, 0],
    [42, 2],
  ])
    g.tiles[key(c, r)] = { type: "water" };
  expect(interruptVisitor(g, v.id).ok).toBe(true);
  update(g, 0.05);
  expect(v.phase).toBe("departing");
  expect(v.path).toHaveLength(0);
  expect(v.comment).toContain("exit");
  const loaded = restore(serialize(g));
  delete loaded.tiles[key(41, 1)];
  for (let i = 0; i < 3000 && loaded.guests.some((p) => p.id === v.id); i++)
    update(loaded, 0.05);
  expect(loaded.guests.some((p) => p.id === v.id)).toBe(false);
  expect(loaded.guestRoster.find((p) => p.id === v.id).interruptedVisits).toBe(
    1,
  );
});
test("interruption cancels drink service without credit and malformed records reject", () => {
  const g = course();
  while (!g.guests.length) update(g, 0.05);
  for (const v of g.guests) v.thirst = 90;
  hire(g, "vendor");
  const s = g.staff[0];
  for (let i = 0; i < 2000 && s.phase !== "refreshing"; i++) update(g, 0.05);
  expect(s.phase).toBe("refreshing");
  const v = g.guests.find((v) => v.id === s.target);
  expect(interruptVisitor(g, v.id).ok).toBe(true);
  expect(v.refreshmentStaffId).toBeUndefined();
  expect(s.target).toBeNull();
  expect(s.served).toBe(0);
  expect(() => restore(serialize(g))).not.toThrow();
  for (const mutate of [
    (r) => r.totalStrokes++,
    (r) => (r.golferId = -1),
    (r) => (r.reason = "won"),
  ]) {
    const bad = structuredClone(g);
    mutate(bad.interruptedRounds[0]);
    expect(() => restore(serialize(bad))).toThrow();
  }
});
test("phone roster distinguishes interrupted visits from completed rounds", async ({
  page,
}) => {
  const g = course();
  while (!g.guests.length) update(g, 0.05);
  interruptVisitor(g, g.guests[0].id);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((save) => {
    if (!localStorage.getItem("simgolf-reborn.course.v1"))
      localStorage.setItem("simgolf-reborn.course.v1", save);
  }, serialize(g));
  await page.goto("/");
  await page.waitForFunction(() => !!window.__gameTest);
  await page.keyboard.press("F9");
  await expect(
    page.getByRole("table", { name: "Membership roster" }),
  ).toContainText("Interrupted");
  await expect(
    page.getByText("Alice: interrupted (angry) after 0 completed holes.", {
      exact: false,
    }),
  ).toBeVisible();
  await page.screenshot({
    path: "../graphics/samples/interrupted-round-phone.png",
  });
});

test("interrupted first visit returns without inventing a completed result, and old saves migrate", () => {
  const g = course();
  while (!g.guests.length) update(g, 0.05);
  const v = g.guests[0];
  interruptVisitor(g, v.id);
  for (let i = 0; i < 2000 && g.guests.some((p) => p.id === v.id); i++)
    update(g, 0.05);
  const record = g.guestRoster.find((p) => p.id === v.id);
  expect(record.rounds).toBe(0);
  expect(record.best).toBeNull();
  for (let i = 0; i < 12000 && !g.guests.some((p) => p.id === v.id); i++)
    update(g, 0.05);
  const returned = g.guests.find((p) => p.id === v.id);
  expect(returned).toBeTruthy();
  expect(returned.roundId).not.toBe(v.roundId);
  expect(returned.interrupted).toBeUndefined();
  expect(record.interruptedVisits).toBe(1);
  expect(record.rounds).toBe(0);
  const old = course();
  old.protocol = {
    version: 50,
    ruleset: "prototype-staff-upgrades-2026-09-06",
    tick: 0,
    revision: 0,
    clients: [],
  };
  delete old.interruptedRounds;
  expect(restore(serialize(old)).interruptedRounds).toEqual([]);
  const invalid = course();
  delete invalid.interruptedRounds;
  // A current save carries its protocol, so missing required history is corruption.
  invalid.protocol = {
    version: PROTOCOL_VERSION,
    ruleset: RULESET_VERSION,
    tick: 0,
    revision: 0,
    clients: [],
  };
  expect(() => restore(serialize(invalid))).toThrow();
});
