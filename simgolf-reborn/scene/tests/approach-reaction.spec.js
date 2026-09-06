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
import { appreciateApproach } from "../src/simulation/happiness.js";
function setup() {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 36, 5);
  openHole(g);
  while (!g.guests.length) update(g, 0.05);
  g.nextWeed = g.time + 10000;
  const v = g.guests[0],
    cup = g.holes[0].green;
  v.pos = { x: cup.x - 16, z: cup.z };
  v.ball = { ...v.pos };
  v.path = [];
  v.phase = "address";
  v.happiness = 3;
  v.skills.accuracy = true;
  v.seenWeeds = g.weeds.map((w) => w.id);
  return g;
}
test("a real approach earns happiness before the fee, with no repeat after mid-flight reload", () => {
  const g = setup(),
    v = g.guests[0],
    cup = g.holes[0].green;
  expect(takeShot(g, v, cup).ok).toBe(true);
  const loaded = restore(serialize(g));
  for (let i = 0; i < 200 && v.shot; i++) {
    update(g, 0.05);
    update(loaded, 0.05);
  }
  expect(v.shot).toBeNull();
  expect(v.happiness).toBe(4);
  expect(v.comment).toContain("lovely approach");
  expect(serialize(loaded)).toBe(serialize(g));
  expect(
    v.happinessReactions.filter((k) => k.startsWith("great-shot:")),
  ).toHaveLength(1);
  for (let i = 0; i < 2000 && !v.scorecard.length; i++) update(g, 0.05);
  expect(v.scorecard[0]).toMatchObject({ happiness: 4, fee: 400 });
  const after = restore(serialize(g));
  expect(after.guests.find((p) => p.id === v.id).happinessReactions).toEqual(
    v.happinessReactions,
  );
});
test("short chips, putts, wrong greens and tree/water trouble cannot earn an approach reaction", () => {
  for (const [shot, ownGreen] of [
    [{ from: { x: 0, z: 0 }, putt: true }, true],
    [{ from: { x: 0, z: 0 }, obstruction: {} }, true],
    [{ from: { x: 0, z: 0 }, waterLanding: true }, true],
    [{ from: { x: 15, z: 0 } }, true],
    [{ from: { x: 0, z: 0 } }, false],
  ]) {
    const v = {
      happiness: 3,
      happinessReactions: [],
      ball: { x: 20, z: 0 },
      holeId: "hole-1",
    };
    expect(appreciateApproach(v, shot, ownGreen)).toBe(false);
    expect(v.happiness).toBe(3);
  }
  const v = {
      happiness: 3,
      happinessReactions: [],
      ball: { x: 20, z: 0 },
      holeId: "hole-1",
    },
    shot = { from: { x: 0, z: 0 } };
  expect(appreciateApproach(v, shot, true)).toBe(true);
  expect(appreciateApproach(v, shot, true)).toBe(false);
  expect(v.happiness).toBe(4);
});
