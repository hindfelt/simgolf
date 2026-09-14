import { test, expect } from "@playwright/test";
import { createCompetition } from "../src/simulation/competition.js";
import { createGame, build } from "../src/simulation/game.js";
import { exportCourse } from "../src/simulation/course-package.js";
import { exportGolfer } from "../src/simulation/golfer-package.js";
async function setup(rounds = 1) {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 36, 5);
  const course = await exportCourse(g),
    golfer = exportGolfer(g);
  return {
    g,
    course,
    config: {
      id: "club-championship",
      course,
      rounds,
      seed: 20,
      entrants: [
        { id: "alice", name: "Alice", golfer },
        { id: "bob", name: "Bob", golfer },
      ],
    },
  };
}
const principal = (id) => ({ id, role: "golfer" });
function shoot(host, id) {
  const g = host.roundSnapshot(id);
  if (g.pro.phase === "address") {
    const target = g.holes.find((h) => h.id === g.pro.holeId).green;
    return host.execute(
      host.nextCommand(id, "shot", {
        x: target.x,
        z: target.z,
        technique: "straight",
      }),
      principal(id),
    );
  }
}
test("separate rounds pin course and profile; edits, invented scores and impersonation reject", async () => {
  const { config, g } = await setup(),
    host = await createCompetition(config);
  config.entrants[0].golfer.profile.skills.power = 10;
  build(g, "fairway", 20, 20);
  expect(host.roundSnapshot("alice").pro.proSkills.power).toBe(0);
  const before = host.roundSnapshot("bob");
  expect(shoot(host, "alice").ok).toBe(true);
  expect(host.roundSnapshot("bob")).toEqual(before);
  expect(
    host.execute(host.nextCommand("alice", "build", {}), principal("alice")).ok,
  ).toBe(false);
  expect(
    host.execute(
      host.nextCommand("alice", "submit-score", { strokes: 1 }),
      principal("alice"),
    ).ok,
  ).toBe(false);
  expect(
    host.execute(
      host.nextCommand("bob", "shot", { x: 0, z: 0, technique: "straight" }),
      principal("alice"),
    ).ok,
  ).toBe(false);
  expect(host.roundSnapshot("alice").stats.fees).toBe(0);
});
test("real simulated rounds produce standings, ties and no resort income", async () => {
  const { config } = await setup(2),
    host = await createCompetition(config);
  const first = host.nextCommand("alice", "shot", {
    x: 29,
    z: -23,
    technique: "straight",
  });
  const result = host.execute(first, principal("alice"));
  expect(host.execute(first, principal("alice"))).toEqual(result);
  shoot(host, "bob");
  for (let i = 0; i < 2000 && host.snapshot().status !== "complete"; i++) {
    for (const id of ["alice", "bob"]) shoot(host, id);
    host.stepTicks(20);
  }
  const state = host.snapshot();
  expect(state.status).toBe("complete");
  expect(state.standings.map((p) => p.rank)).toEqual([1, 1]);
  for (const p of state.standings) {
    expect(p.roundsCompleted).toBe(2);
    expect(p.results).toHaveLength(2);
    expect(p.strokes).toBe(p.results.reduce((n, r) => n + r.strokes, 0));
    expect(host.roundSnapshot(p.id).ledger).toEqual([]);
  }
  expect(host.execute(first, principal("alice")).ok).toBe(false);
  state.standings[0].strokes = 0;
  expect(host.snapshot().standings[0].strokes).toBeGreaterThan(0);
});
test("invalid course digest and duplicate player identities reject", async () => {
  const { config } = await setup();
  await expect(
    createCompetition({
      ...config,
      entrants: [config.entrants[0], config.entrants[0]],
    }),
  ).rejects.toThrow("entrant");
  await expect(
    createCompetition({
      ...config,
      course: { ...config.course, digest: "0".repeat(64) },
    }),
  ).rejects.toThrow("digest");
});

test("tick batching is deterministic and previous-round commands cannot enter the next round", async () => {
  const { config } = await setup(2),
    a = await createCompetition(config),
    b = await createCompetition(config);
  for (const id of ["alice", "bob"]) {
    shoot(a, id);
    shoot(b, id);
  }
  a.stepTicks(100);
  for (let i = 0; i < 100; i++) b.stepTicks();
  expect(a.snapshot()).toEqual(b.snapshot());
  expect(a.roundSnapshot("alice")).toEqual(b.roundSnapshot("alice"));
  let previous;
  for (
    let i = 0;
    i < 1000 && a.snapshot().standings[0].roundsCompleted === 0;
    i++
  ) {
    const g = a.roundSnapshot("alice");
    if (g.pro.phase === "address") {
      previous = a.nextCommand("alice", "shot", {
        x: g.holes[0].green.x,
        z: g.holes[0].green.z,
        technique: "straight",
      });
      a.execute(previous, principal("alice"));
    }
    a.stepTicks(20);
  }
  expect(a.snapshot().standings[0].roundsCompleted).toBe(1);
  const before = a.roundSnapshot("alice");
  expect(a.execute(previous, principal("alice")).ok).toBe(false);
  expect(a.roundSnapshot("alice")).toEqual(before);
});
