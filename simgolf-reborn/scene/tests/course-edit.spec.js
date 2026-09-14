import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  addHole,
  openHole,
  closeHole,
  update,
  serialize,
  restore,
} from "../src/simulation/game.js";
import {
  reorderHoles,
  removeHole,
  demolish,
  demolitionCheck,
} from "../src/simulation/course-edit.js";
import { createSession } from "../src/simulation/session.js";
function course() {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 22, 10);
  addHole(g);
  build(g, "tee", 27, 10, 1, "hole-2");
  build(g, "green", 36, 20, 1, "hole-2");
  return g;
}
function advance(g, seconds) {
  for (let i = 0; i < Math.round(seconds / 0.05); i++) update(g, 0.05);
}

test("reordering changes future bookings while preserving existing itineraries and score numbers", () => {
  const g = course();
  openHole(g, "hole-1");
  openHole(g, "hole-2");
  advance(g, 2);
  const booked = g.guests.map((v) => v.roundId);
  expect(reorderHoles(g, ["hole-2", "hole-1"]).ok).toBe(true);
  advance(g, 200);
  for (const id of booked) {
    const round = g.rounds.find((r) => r.id === id);
    expect(round.scorecard.map((s) => s.holeId)).toEqual(["hole-1", "hole-2"]);
    expect(round.scorecard.map((s) => s.number)).toEqual([1, 2]);
  }
  expect(
    g.rounds.some(
      (r) => !booked.includes(r.id) && r.scorecard[0].holeId === "hole-2",
    ),
  ).toBe(true);
  expect(() => restore(serialize(g))).not.toThrow();
});
test("removing a played hole retains historical fees and scores without dangling active references", () => {
  const g = course();
  openHole(g, "hole-1");
  openHole(g, "hole-2");
  advance(g, 2);
  closeHole(g, "hole-1");
  closeHole(g, "hole-2");
  expect(removeHole(g, "hole-1").ok).toBe(false);
  advance(g, 300);
  expect(g.guests).toHaveLength(0);
  const cash = g.cash,
    stats = structuredClone(g.stats),
    history = structuredClone(g.rounds);
  expect(removeHole(g, "hole-1").ok).toBe(true);
  expect(g.cash).toBe(cash);
  expect(g.stats).toEqual(stats);
  expect(g.rounds).toEqual(history);
  expect(g.retiredHoles[0].id).toBe("hole-1");
  expect(Object.values(g.tiles).some((t) => t.holeId === "hole-1")).toBe(false);
  expect(() => restore(serialize(g))).not.toThrow();
});
test("last-hole removal leaves a fresh blank hole and never reuses retired IDs", () => {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 22, 10);
  expect(removeHole(g, "hole-1").ok).toBe(true);
  expect(g.holes).toHaveLength(1);
  expect(g.holes[0].id).toBe("hole-2");
  expect(g.holes[0].tee).toBeNull();
  expect(() => restore(serialize(g))).not.toThrow();
});
test("facility and terrain demolition removes only the selected object and gives no refund", () => {
  const g = course();
  build(g, "snack", 15, 20);
  const f = g.facilities[0],
    cash = g.cash;
  expect(demolitionCheck(g, f.c, f.r).kind).toBe("facility");
  expect(demolish(g, f.c, f.r).ok).toBe(true);
  expect(g.facilities).toHaveLength(0);
  expect(g.cash).toBe(cash);
  build(g, "rocks", 18, 18);
  expect(demolish(g, 18, 18).ok).toBe(true);
  expect(g.tiles[18 * 45 + 18]).toBeUndefined();
  expect(demolish(g, 18, 29).ok).toBe(true);
  expect(g.starterBridgeRemoved).toBe(true);
  expect(g.tiles[29 * 45 + 18].type).toBe("water");
});
test("removal preview commands conflict after another edit and retry only once", () => {
  const g = course(),
    s = createSession(g),
    owner = { id: "owner", role: "owner" };
  build(g, "bench", 18, 18);
  const pending = s.nextCommand(owner.id, "demolish", { c: 18, r: 18 });
  const other = { id: "editor", role: "editor" };
  s.execute(
    s.nextCommand(other.id, "reorder-holes", { holeIds: ["hole-2", "hole-1"] }),
    other,
  );
  expect(s.execute(pending, owner).code).toBe("conflict");
  expect(g.facilities).toHaveLength(1);
  const fresh = s.nextCommand(owner.id, "demolish", { c: 18, r: 18 }),
    result = s.execute(fresh, owner);
  expect(result.ok).toBe(true);
  expect(s.execute(fresh, owner)).toEqual(result);
  expect(g.facilities).toHaveLength(0);
});
