import { key } from "../src/simulation/world.js";
import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  startPractice,
  shotLimit,
  takeShot,
  serialize,
  restore,
} from "../src/simulation/game.js";
import { allocateProSkill } from "../src/simulation/pro-skills.js";
import { createSession } from "../src/simulation/session.js";
function course(skill, points = 6) {
  const g = createGame(22);
  build(g, "tee", 7, 20);
  build(g, "green", 36, 5);
  if (skill)
    for (let i = 0; i < points; i++)
      expect(allocateProSkill(g, skill, 1).ok).toBe(true);
  startPractice(g);
  return g;
}
test("ten points persist, cannot overspend or reallocate during a round", () => {
  const g = course("power");
  g.proProfile.skills.luck = 4;
  expect(allocateProSkill(g, "power", -1).ok).toBe(false);
  expect(restore(serialize(g)).pro.proSkills.power).toBe(6);
  g.pro.phase = "finished";
  expect(allocateProSkill(g, "luck", 1).ok).toBe(false);
  expect(allocateProSkill(g, "power", -1).ok).toBe(true);
  expect(allocateProSkill(g, "luck", 1).ok).toBe(true);
  g.proProfile.skills.luck = 11;
  expect(() => restore(serialize(g))).toThrow();
});
test("power and long driving increase tee carry; accuracy reduces seeded dispersion", () => {
  const base = course(),
    power = course("power"),
    driver = course("longDrive");
  expect(shotLimit(power, power.pro)).toBeGreaterThan(
    shotLimit(base, base.pro),
  );
  expect(shotLimit(driver, driver.pro)).toBeGreaterThan(
    shotLimit(base, base.pro),
  );
  const accurate = course("driver"),
    target = { x: base.pro.ball.x + 10, z: base.pro.ball.z };
  takeShot(base, base.pro, target);
  takeShot(accurate, accurate.pro, target);
  expect(
    Math.hypot(
      accurate.pro.shot.landing.x - target.x,
      accurate.pro.shot.landing.z - target.z,
    ),
  ).toBeLessThan(
    Math.hypot(
      base.pro.shot.landing.x - target.x,
      base.pro.shot.landing.z - target.z,
    ),
  );
});
test("allocation commands are owner-only and retries do not spend twice", () => {
  const g = createGame(),
    host = createSession(g),
    owner = { id: "owner", role: "owner" };
  const cmd = host.nextCommand(owner.id, "allocate-pro-skill", {
    skill: "power",
    delta: 1,
  });
  expect(host.execute(cmd, owner).ok).toBe(true);
  expect(host.execute(cmd, owner).ok).toBe(true);
  expect(g.proProfile.skills.power).toBe(1);
  const editor = { id: "editor", role: "editor" };
  expect(
    host.execute(
      host.nextCommand(editor.id, "allocate-pro-skill", {
        skill: "power",
        delta: 1,
      }),
      editor,
    ).code,
  ).toBe("forbidden");
});
test("skills dialog allocates, refunds and reloads through actual controls", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__gameTest);
  await page.locator('[data-mode="play"]').click();
  await page.locator("#pro-skills").click();
  await page
    .getByRole("button", { name: "Increase Power Hitter", exact: true })
    .click();
  await expect(page.locator("#skill-points")).toHaveText(
    "9 skill points available",
  );
  await page
    .getByRole("button", { name: "Decrease Power Hitter", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Increase Accurate Irons", exact: true })
    .click();
  await page.reload();
  await page.waitForFunction(() => !!window.__gameTest);
  expect(
    await page.evaluate(
      () => window.__gameTest.getState().proProfile.skills.irons,
    ),
  ).toBe(1);
});
test("recovery, putting, shaped shots and backspin alter actual shot state", () => {
  const recovery = course("recovery"),
    base = course();
  for (const g of [recovery, base])
    g.tiles[key(7, 20)] = { type: "deep-rough" };
  expect(shotLimit(recovery, recovery.pro)).toBeGreaterThan(
    shotLimit(base, base.pro),
  );
  for (const technique of ["draw", "fade", "backspin"]) {
    const skilled = course(technique),
      novice = course();
    const target = { x: novice.pro.ball.x + 10, z: novice.pro.ball.z };
    for (const g of [skilled, novice]) takeShot(g, g.pro, target, technique);
    if (technique === "backspin")
      expect(skilled.pro.shot.end.x).toBeLessThan(novice.pro.shot.end.x);
    else
      expect(Math.abs(skilled.pro.shot.curve)).toBeGreaterThan(
        Math.abs(novice.pro.shot.curve),
      );
  }
  const putter = course("putter"),
    novice = course();
  for (const g of [putter, novice]) {
    g.pro.ball = { x: g.holes[0].green.x - 3, z: g.holes[0].green.z };
    g.pro.pos = { ...g.pro.ball };
    takeShot(g, g.pro, g.holes[0].green);
  }
  const error = (g) =>
    Math.hypot(
      g.pro.shot.end.x - g.holes[0].green.x,
      g.pro.shot.end.z - g.holes[0].green.z,
    );
  expect(error(putter)).toBeLessThan(error(novice));
});
