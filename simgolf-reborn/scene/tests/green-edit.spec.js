import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  openHole,
  closeHole,
  update,
  serialize,
  restore,
  addHole,
  startPractice,
  takeShot,
} from "../src/simulation/game.js";
import { greenCells } from "../src/simulation/green-edit.js";
import { RULES } from "../src/simulation/rules.js";
import { createSession } from "../src/simulation/session.js";
function course() {
  const g = createGame();
  expect(build(g, "tee", 7, 20).ok).toBe(true);
  expect(build(g, "green", 22, 10).ok).toBe(true);
  return g;
}

test("extending adds connected turf without moving the cup or replacing the existing green", () => {
  const g = course(),
    cup = structuredClone(g.holes[0].green),
    before = g.cash;
  expect(build(g, "green", 25, 10).ok).toBe(true);
  expect(greenCells(g, "hole-1").size).toBe(26);
  expect(g.holes[0].green).toEqual(cup);
  expect(g.cash).toBe(before - RULES.costs.greenTile);
  expect(build(g, "green", 25, 10).ok).toBe(true);
  expect(g.cash).toBe(before - RULES.costs.greenTile);
  const state = serialize(g);
  expect(build(g, "green", 30, 10).ok).toBe(false);
  expect(serialize(g)).toBe(state);
});
test("cup relocation preserves the surface; a shot aims at the moved cup after reload", () => {
  const g = course();
  build(g, "green", 25, 10);
  const cells = [...greenCells(g, "hole-1")],
    cash = g.cash;
  expect(build(g, "cup", 25, 10).ok).toBe(true);
  expect([...greenCells(g, "hole-1")]).toEqual(cells);
  expect(g.cash).toBe(cash);
  const restored = restore(serialize(g));
  expect(restored.holes[0].green.c).toBe(25);
  startPractice(restored);
  for (let i = 0; i < 5000 && restored.pro.phase !== "finished"; i++) {
    if (restored.pro.phase === "address")
      takeShot(restored, restored.pro, restored.holes[0].green);
    update(restored, 0.05);
  }
  expect(restored.pro.phase).toBe("finished");
  expect(restored.pro.scorecard).toHaveLength(1);
  expect(restored.stats.fees).toBe(0);
});
test("trimming removes edge tiles but rejects cutting the cup or splitting the green", () => {
  const g = course();
  expect(build(g, "trim-green", 20, 8).ok).toBe(true);
  expect(greenCells(g, "hole-1").size).toBe(24);
  const state = serialize(g);
  expect(build(g, "trim-green", 22, 10).ok).toBe(false);
  expect(serialize(g)).toBe(state);
  expect(build(g, "green", 25, 10).ok).toBe(true);
  expect(build(g, "green", 26, 10).ok).toBe(true);
  const joined = serialize(g);
  expect(build(g, "trim-green", 25, 10).ok).toBe(false);
  expect(serialize(g)).toBe(joined);
});
test("green editing protects booked rounds and other holes", () => {
  const g = course();
  openHole(g);
  update(g, 1.1);
  closeHole(g);
  for (const tool of ["green", "cup", "trim-green"])
    expect(build(g, tool, 24, 10).ok).toBe(false);
  const fresh = course();
  addHole(fresh);
  const state = serialize(fresh);
  expect(build(fresh, "green", 22, 10, 1, "hole-2").ok).toBe(false);
  expect(build(fresh, "cup", 22, 10, 1, "hole-2").ok).toBe(false);
  expect(serialize(fresh)).toBe(state);
});
test("green edit commands retry safely and detached saved surfaces reject", () => {
  const g = course(),
    session = createSession(g),
    owner = { id: "owner", role: "owner" },
    cmd = session.nextCommand(owner.id, "build", {
      tool: "green",
      c: 25,
      r: 10,
      brush: 1,
      holeId: "hole-1",
    });
  const result = session.execute(cmd, owner),
    cash = g.cash;
  expect(result.ok).toBe(true);
  expect(session.execute(cmd, owner)).toEqual(result);
  expect(g.cash).toBe(cash);
  const invalid = JSON.parse(serialize(g));
  invalid.tiles[30 * 45 + 30] = { type: "green", holeId: "hole-1" };
  expect(() => restore(JSON.stringify(invalid))).toThrow("connected");
});
