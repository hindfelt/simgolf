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

test("original invitation defaults follow the saved challenge ladder and reject invalid counters", async ({page}) => {
  const { originalChallengeOfferStakes } = await import('../src/simulation/pro-challenge.js');
  expect(originalChallengeOfferStakes()).toEqual({perHole:2000,match:4000});
  expect(originalChallengeOfferStakes(1)).toEqual({perHole:4000,match:8000});
  expect(originalChallengeOfferStakes(9)).toEqual({perHole:20000,match:40000});
  for (const value of [-1,0.5,NaN,Infinity,Number.MAX_SAFE_INTEGER,'1',null])
    expect(()=>originalChallengeOfferStakes(value)).toThrow();
  await page.goto('/');
  await page.waitForFunction(()=>!!window.__gameTest);
  await page.locator('#menu-button').click();
  await page.locator('#pro-challenge').click();
  await expect(page.locator('#challenge-hole-stake')).toHaveValue('2000');
  await expect(page.locator('#challenge-match-stake')).toHaveValue('4000');
  await page.locator('#challenge-hole-stake').fill('75');
  await page.locator('[aria-label="Close championship setup"]').click();
  await page.locator('#menu-button').click();
  await page.locator('#pro-challenge').click();
  await expect(page.locator('#challenge-hole-stake')).toHaveValue('75');
});
