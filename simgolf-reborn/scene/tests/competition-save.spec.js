import { test, expect } from "@playwright/test";
import {
  createCompetition,
  restoreCompetition,
} from "../src/simulation/competition.js";
import { createGame, build } from "../src/simulation/game.js";
import { exportCourse } from "../src/simulation/course-package.js";
import { exportGolfer } from "../src/simulation/golfer-package.js";
const principal = (id) => ({ id, role: "golfer" });
async function setup() {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 36, 5);
  return createCompetition({
    id: "saved-event",
    course: await exportCourse(g),
    rounds: 2,
    entrants: ["alice", "bob"].map((id) => ({
      id,
      name: id,
      golfer: exportGolfer(g),
    })),
  });
}
function shoot(host, id) {
  const g = host.roundSnapshot(id);
  if (g.pro.phase !== "address") return null;
  const target = g.holes.find((h) => h.id === g.pro.holeId).green;
  const cmd = host.nextCommand(id, "shot", {
    x: target.x,
    z: target.z,
    technique: "straight",
  });
  host.execute(cmd, principal(id));
  return cmd;
}
test("mid-flight restore preserves both rounds and retry receipts exactly", async () => {
  const a = await setup(),
    cmd = shoot(a, "alice");
  shoot(a, "bob");
  a.stepTicks(12);
  const b = await restoreCompetition(a.save());
  expect(b.roundSnapshot("alice")).toEqual(a.roundSnapshot("alice"));
  expect(b.roundSnapshot("bob")).toEqual(a.roundSnapshot("bob"));
  expect(b.execute(cmd, principal("alice"))).toEqual(
    a.execute(cmd, principal("alice")),
  );
  for (let i = 0; i < 1500 && a.snapshot().status !== "complete"; i++) {
    for (const id of ["alice", "bob"]) {
      shoot(a, id);
      shoot(b, id);
    }
    a.stepTicks(20);
    b.stepTicks(20);
  }
  expect(a.snapshot().status).toBe("complete");
  expect(b.snapshot()).toEqual(a.snapshot());
  expect(b.save()).toEqual(a.save());
  expect((await restoreCompetition(a.save())).snapshot()).toEqual(a.snapshot());
});
test("damaged receipts, clock budgets, rulesets and injected final scores reject", async () => {
  const host = await setup();
  shoot(host, "alice");
  const raw = host.save(),
    bad = JSON.parse(raw);
  bad.journal[0].result.ok = false;
  await expect(restoreCompetition(JSON.stringify(bad))).rejects.toThrow(
    "replay",
  );
  const clock = JSON.parse(raw);
  clock.journal.push({ type: "ticks", count: 1000001 });
  await expect(restoreCompetition(JSON.stringify(clock))).rejects.toThrow(
    "clock",
  );
  const version = JSON.parse(raw);
  version.ruleset = "unknown";
  await expect(restoreCompetition(JSON.stringify(version))).rejects.toThrow(
    "Unsupported",
  );
  const score = JSON.parse(raw);
  score.standings = [{ strokes: 1 }];
  await expect(restoreCompetition(JSON.stringify(score))).rejects.toThrow(
    "Unsupported",
  );
});
