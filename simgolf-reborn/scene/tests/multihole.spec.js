import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  addHole,
  hire,
  openHole,
  closeHole,
  update,
  serialize,
  restore,
  startPractice,
  takeShot,
  getHole,
} from "../src/simulation/game.js";
import { cellAt } from "../src/simulation/world.js";
import { createSession } from "../src/simulation/session.js";
import { readFileSync } from "node:fs";
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
function advance(g, seconds) {
  for (let i = 0; i < Math.round(seconds / 0.05); i++) update(g, 0.05);
}

test("visitors complete holes in order with separate fees and complete-round scorecards", () => {
  const g = course();
  advance(g, 180);
  expect(g.rounds.length).toBeGreaterThan(0);
  for (const round of g.rounds) {
    expect(round.scorecard.map((s) => s.holeId)).toEqual(["hole-1", "hole-2"]);
    expect(round.totalStrokes).toBe(
      round.scorecard.reduce((n, s) => n + s.strokes, 0),
    );
  }
  expect(g.stats.fees).toBe(
    g.ledger
      .filter((r) => r.reason.includes("green fee"))
      .reduce((sum, r) => sum + r.amount, 0),
  );
  expect(g.stats.holesCompleted).toBeGreaterThanOrEqual(g.stats.rounds * 2);
  expect(g.holes.map((h) => h.stats.completed).every((n) => n > 0)).toBe(true);
  expect(g.holes.reduce((n, h) => n + h.stats.fees, 0)).toBe(g.stats.fees);
});
test("closing a future hole preserves booked rounds; later arrivals get the open itinerary", () => {
  const g = course();
  advance(g, 2);
  const original = g.guests.map((v) => v.roundId);
  closeHole(g, "hole-2");
  expect(build(g, "tee", 30, 20, 1, "hole-2").ok).toBe(false);
  advance(g, 180);
  for (const id of original)
    expect(
      g.rounds.find((r) => r.id === id)?.scorecard.map((s) => s.holeId),
    ).toEqual(["hole-1", "hole-2"]);
  expect(
    g.rounds.some((r) => !original.includes(r.id) && r.scorecard.length === 1),
  ).toBe(true);
});
test("reload between holes preserves fees, routing and exact future state", () => {
  const g = course();
  let attempts = 0;
  while (!g.guests.some((v) => v.holeId === "hole-2") && attempts++ < 4000)
    update(g, 0.05);
  expect(g.guests.some((v) => v.holeId === "hole-2")).toBe(true);
  const resumed = restore(serialize(g));
  advance(g, 100);
  advance(resumed, 100);
  expect(serialize(resumed)).toBe(serialize(g));
});
test("editing one hole cannot consume another hole’s green or tee", () => {
  const g = course();
  closeHole(g, "hole-2");
  const before = structuredClone(g.holes[0]);
  const target = cellAt(-29, 7);
  expect(build(g, "tee", target.c, target.r, 1, "hole-2").ok).toBe(false);
  place(g, "tee", 15, -11, "hole-2");
  expect(g.holes[0]).toEqual(before);
  expect(g.tiles[20 * 45 + 7].holeId).toBe("hole-1");
});
test("practice plays an ordered multi-hole round without collecting visitor fees", () => {
  const g = course();
  closeHole(g, "hole-1");
  closeHole(g, "hole-2");
  startPractice(g, "hole-1");
  for (let i = 0; i < 10000 && g.pro.phase !== "finished"; i++) {
    if (g.pro.phase === "address")
      takeShot(g, g.pro, getHole(g, g.pro.holeId).green);
    update(g, 0.05);
  }
  expect(g.pro.phase).toBe("finished");
  expect(g.pro.scorecard.map((s) => s.holeId)).toEqual(["hole-1", "hole-2"]);
  expect(g.stats.fees).toBe(0);
  expect(g.stats.rounds).toBe(0);
  expect(g.rounds[0].pro).toBe(true);
});
test("a genuine old single-hole fixture migrates without losing cash or active shots", () => {
  const raw = JSON.parse(
    readFileSync(
      new URL("../fixtures/single-hole-v1.json", import.meta.url),
      "utf8",
    ),
  );
  expect(raw.version).toBe(1);
  const g = restore(JSON.stringify(raw));
  expect(g.version).toBe(2);
  expect(g.cash).toBe(raw.cash);
  expect(g.holes[0].tee).toEqual(raw.hole.tee);
  expect(g.guests[0].shot).toEqual(raw.guests[0].shot);
  expect(g.guests[0].itinerary).toEqual(["hole-1"]);
  const host = createSession(g);
  host.stepTicks(1200);
  expect(() => restore(serialize(g))).not.toThrow();
  expect(g.stats.fees).toBeGreaterThanOrEqual(raw.stats.fees);
});
test("unknown hole commands and corrupt itineraries are rejected", () => {
  const g = course(),
    s = createSession(g),
    owner = { id: "owner", role: "owner" },
    before = g.cash;
  expect(
    s.execute(
      s.nextCommand(owner.id, "open-hole", { holeId: "missing" }),
      owner,
    ).ok,
  ).toBe(false);
  expect(g.cash).toBe(before);
  advance(g, 2);
  g.guests[0].itinerary.push("missing");
  expect(() => restore(serialize(g))).toThrow();
});

test("a staffed legally built 18-hole course completes full rounds and rejects a nineteenth hole", () => {
  const g = createGame();
  const layout = [
    [13, 2, 20, 2],
    [24, 2, 24, 9],
    [27, 2, 34, 2],
    [30, 2, 30, 9],
    [38, 2, 38, 9],
    [16, 4, 16, 11],
    [15, 7, 10, 12],
    [34, 7, 34, 14],
    [42, 7, 42, 14],
    [20, 9, 20, 16],
    [3, 10, 3, 17],
    [34, 10, 29, 15],
    [20, 12, 15, 17],
    [3, 13, 8, 18],
    [25, 13, 25, 20],
    [38, 15, 33, 20],
    [25, 16, 20, 21],
    [37, 18, 37, 25],
  ];
  for (const [i, [tc, tr, gc, gr]] of layout.entries()) {
    if (i) expect(addHole(g).ok).toBe(true);
    const id = g.holes[i].id;
    expect(build(g, "tee", tc, tr, 1, id).ok).toBe(true);
    expect(build(g, "green", gc, gr, 1, id).ok).toBe(true);
    expect(openHole(g, id).ok).toBe(true);
  }
  expect(addHole(g).ok).toBe(false);
  for (let i = 0; i < 12; i++) expect(hire(g, "technician").ok).toBe(true);
  for (let i = 0; i < 4; i++) expect(hire(g, "consultant").ok).toBe(true);
  advance(g, 1500);
  expect(g.rounds.length).toBeGreaterThan(0);
  expect(g.rounds[0].scorecard.map((s) => s.holeId)).toEqual(
    g.holes.map((h) => h.id),
  );
  expect(() => restore(serialize(g))).not.toThrow();
});


test("cart visitors finish a two-hole round and leave after mid-round reload", () => {
  const g = course();
  expect(build(g, "cart-garage", 18, 14).ok).toBe(true);
  for (let c = 8; c <= 18; c++) expect(build(g, "path", c, 12).ok).toBe(true);
  while (!g.guests.length) update(g, 0.05);
  const visitor = g.guests[0];
  expect(visitor.hasCart).toBe(true);
  for (let i = 0; i < 6000 && visitor.holeId !== "hole-2"; i++) update(g, 0.05);
  expect(visitor.holeId).toBe("hole-2");
  const copy = restore(serialize(g));
  for (let i = 0; i < 6000 && g.guests.some((v) => v.id === visitor.id); i++) {
    update(g, 0.05);
    update(copy, 0.05);
  }
  expect(g.guests.some((v) => v.id === visitor.id)).toBe(false);
  const round = g.rounds.find((r) => r.id === visitor.roundId);
  expect(round.scorecard.map((s) => s.holeId)).toEqual(["hole-1", "hole-2"]);
  expect(serialize(copy)).toBe(serialize(g));
});
