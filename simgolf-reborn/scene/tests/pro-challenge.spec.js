import { test, expect } from "@playwright/test";
import { createGame, build } from "../src/simulation/game.js";
import { exportCourse } from "../src/simulation/course-package.js";
import { exportGolfer } from "../src/simulation/golfer-package.js";
import {
  createProChallenge,
  restoreProChallenge,
} from "../src/simulation/pro-challenge.js";
test("challenge derives zero-sum stakes from played holes and replays without duplicate winnings", async () => {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 36, 5);
  const originalCash = g.cash;
  const golfer = exportGolfer(g);
  const host = await createProChallenge({
    id: "challenge",
    course: await exportCourse(g),
    resident: { id: "resident", name: "Gary", golfer },
    challenger: { id: "rival", name: "Rival", golfer },
    stakes: { perHole: 100, match: 500 },
  });
  for (let i = 0; i < 4000 && host.snapshot().status !== "complete"; i++) {
    for (const id of ["resident", "rival"]) {
      const round = host.roundSnapshot(id),
        p = round.pro;
      if (p.phase === "address") {
        const cup = round.holes[0].green;
        // Deliberately make the rival play sideways before approaching.
        const target =
          id === "rival" && p.strokes < 2
            ? { x: p.ball.x + 5, z: p.ball.z }
            : cup;
        host.execute(
          host.nextCommand(id, "shot", {
            x: target.x,
            z: target.z,
            technique: "straight",
          }),
          { id, role: "golfer" },
        );
      }
    }
    host.stepTicks(5);
  }
  const s = host.snapshot();
  expect(s.settled).toBe(true);
  expect(s.holes).toHaveLength(1);
  expect(s.residentNet + s.challengerNet).toBe(0);
  const winner = Math.sign(
    s.holes[0].challengerStrokes - s.holes[0].residentStrokes,
  );
  expect(s.residentNet).toBe(winner * 600);
  expect((await restoreProChallenge(host.save())).snapshot()).toEqual(s);
  host.stepTicks(100);
  expect(host.snapshot()).toEqual(s);
  expect(g.cash).toBe(originalCash);
  const damaged = JSON.parse(host.save());
  damaged.stakes.perHole = -1;
  await expect(restoreProChallenge(JSON.stringify(damaged))).rejects.toThrow();
});
