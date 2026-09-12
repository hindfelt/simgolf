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
test('pre-tennis tournament saves preserve pinned course, shots and standings on upgrade',async()=>{
 const {PRE_TENNIS_RULESET}=await import('../src/simulation/protocol.js');
 const {courseDigest,importCourse}=await import('../src/simulation/course-package.js');
 const host=await setup();shoot(host,'alice');shoot(host,'bob');host.stepTicks(12);
 const legacy=JSON.parse(host.save());legacy.ruleset=PRE_TENNIS_RULESET;
 legacy.config.course.content.ruleset=PRE_TENNIS_RULESET;
 legacy.config.course.digest=await courseDigest(legacy.config.course.content);
 for(const row of legacy.journal)if(row.type==='command')row.request.command.version=75;
 const restored=await restoreCompetition(JSON.stringify(legacy));
 expect(restored.snapshot().courseDigest).toBe(legacy.config.course.digest);
 for(const id of ['alice','bob']){
  expect(restored.roundSnapshot(id).pro.ball).toEqual(host.roundSnapshot(id).pro.ball);
  expect(restored.roundSnapshot(id).pro.shot).toEqual(host.roundSnapshot(id).pro.shot);
 }
 expect((await restoreCompetition(restored.save())).snapshot()).toEqual(restored.snapshot());
 expect((await importCourse(JSON.stringify(legacy.config.course))).digest).toBe(legacy.config.course.digest);
 legacy.config.course.content.ruleset='unknown';legacy.config.course.digest=await courseDigest(legacy.config.course.content);
 await expect(importCourse(JSON.stringify(legacy.config.course))).rejects.toThrow();
});
test('the tennis-release tournament format also migrates without changing a shot',async()=>{
 const {PRE_MARINA_RULESET}=await import('../src/simulation/protocol.js');
 const {courseDigest}=await import('../src/simulation/course-package.js');
 const host=await setup();shoot(host,'alice');host.stepTicks(12);
 const legacy=JSON.parse(host.save());legacy.ruleset=PRE_MARINA_RULESET;
 legacy.config.course.content.ruleset=PRE_MARINA_RULESET;legacy.config.course.digest=await courseDigest(legacy.config.course.content);
 for(const row of legacy.journal)if(row.type==='command')row.request.command.version=76;
 const restored=await restoreCompetition(JSON.stringify(legacy));
 expect(restored.roundSnapshot('alice').pro.shot).toEqual(host.roundSnapshot('alice').pro.shot);
 expect((await restoreCompetition(restored.save())).snapshot()).toEqual(restored.snapshot());
});

test('the pre-airstrip-fee tournament format also migrates without changing a shot',async()=>{
 const {PRE_AIRSTRIP_RULESET}=await import('../src/simulation/protocol.js');
 const {courseDigest}=await import('../src/simulation/course-package.js');
 const host=await setup();shoot(host,'alice');host.stepTicks(12);
 const legacy=JSON.parse(host.save());legacy.ruleset=PRE_AIRSTRIP_RULESET;
 legacy.config.course.content.ruleset=PRE_AIRSTRIP_RULESET;legacy.config.course.digest=await courseDigest(legacy.config.course.content);
 for(const row of legacy.journal)if(row.type==='command')row.request.command.version=77;
 const restored=await restoreCompetition(JSON.stringify(legacy));
 expect(restored.roundSnapshot('alice').pro.shot).toEqual(host.roundSnapshot('alice').pro.shot);
 expect((await restoreCompetition(restored.save())).snapshot()).toEqual(restored.snapshot());
});

test('the pre-signed-happiness tournament format also migrates without changing a shot',async()=>{
 const {PRE_SIGNED_HAPPINESS_RULESET}=await import('../src/simulation/protocol.js');
 const {courseDigest}=await import('../src/simulation/course-package.js');
 const host=await setup();shoot(host,'alice');host.stepTicks(12);
 const legacy=JSON.parse(host.save());legacy.ruleset=PRE_SIGNED_HAPPINESS_RULESET;
 legacy.config.course.content.ruleset=PRE_SIGNED_HAPPINESS_RULESET;legacy.config.course.digest=await courseDigest(legacy.config.course.content);
 for(const row of legacy.journal)if(row.type==='command')row.request.command.version=78;
 const restored=await restoreCompetition(JSON.stringify(legacy));
 expect(restored.roundSnapshot('alice').pro.shot).toEqual(host.roundSnapshot('alice').pro.shot);
 expect((await restoreCompetition(restored.save())).snapshot()).toEqual(restored.snapshot());
});
