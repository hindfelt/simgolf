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
import { createSession } from "../src/simulation/session.js";
import {
  considerMembership,
  MEMBERSHIP_TIERS,
} from "../src/simulation/membership.js";
const owner = { id: "owner", role: "owner" };
function application() {
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
  expect(takeShot(g, v, cup).ok).toBe(true);
  for (
    let i = 0;
    i < 6000 &&
    !g.memberships.some((m) => m.golferId === v.id && m.application);
    i++
  )
    update(g, 0.05);
  expect(v.roundFinished).toBe(true);
  expect(
    g.memberships.find((m) => m.golferId === v.id)?.application,
  ).toMatchObject({ tier: 1, greatShots: 1, happiness: 4 });
  return { g, v };
}
test("a played happy round leads to one accepted membership and a real invited visitor", () => {
  const { g, v } = application(),
    s = createSession(g),
    cash = g.cash;
  const cmd = s.nextCommand(owner.id, "decide-membership", {
    golferId: v.id,
    accept: true,
  });
  const result = s.execute(cmd, owner);
  expect(result.ok).toBe(true);
  const m = g.memberships.find((m) => m.golferId === v.id),
    invited = m.history[0].invitedId;
  expect(m.tier).toBe(1);
  expect(g.visitorPool).toHaveLength(13);
  expect(g.cash).toBe(cash);
  expect(s.execute(cmd, owner)).toEqual(result);
  const loaded = restore(serialize(g));
  expect(createSession(loaded).execute(cmd, owner)).toEqual(result);
  expect(loaded.visitorPool).toHaveLength(13);
  let visited = false;
  for (let i = 0; i < 12000; i++) {
    update(g, 0.05);
    update(loaded, 0.05);
    if (g.guests.some((p) => p.id === invited)) {
      visited = true;
      break;
    }
  }
  expect(visited).toBe(true);
  expect(serialize(loaded)).toBe(serialize(g));
});
test("tier progression is bounded and each decision preserves invitation provenance", () => {
  const { g, v: first } = application(),
    s = createSession(g);
  let v = first;
  for (let tier = 1; tier <= 4; tier++) {
    if (tier > 1) {
      const previousRound = v.roundId,
        id = v.id;
      let returned;
      for (let i = 0; i < 20000 && !returned; i++) {
        update(g, 0.05);
        returned = g.guests.find(
          (p) => p.id === id && p.roundId !== previousRound && !p.paid,
        );
      }
      expect(returned).toBeTruthy();
      v = returned;
      const cup = g.holes[0].green;
      v.pos = { x: cup.x - 16, z: cup.z };
      v.ball = { ...v.pos };
      v.path = [];
      v.phase = "address";
      v.happiness = 3;
      v.skills.accuracy = true;
      v.skills.imagination = true;
      v.seenWeeds = g.weeds.map((w) => w.id);
      expect(takeShot(g, v, cup, "backspin").ok).toBe(true);
      for (
        let i = 0;
        i < 6000 && !g.memberships.find((m) => m.golferId === id).application;
        i++
      )
        update(g, 0.05);
      expect(v.roundFinished).toBe(true);
    }
    const m = g.memberships.find((m) => m.golferId === v.id);
    expect(m.application.tier).toBe(tier);
    expect(
      s.execute(
        s.nextCommand(owner.id, "decide-membership", {
          golferId: v.id,
          accept: true,
        }),
        owner,
      ).ok,
    ).toBe(true);
    expect(MEMBERSHIP_TIERS[m.tier]).toBe(
      ["Basic", "Silver", "Gold", "Platinum"][tier - 1],
    );
  }
  expect(g.visitorPool).toHaveLength(16);
  expect(
    new Set(
      g.memberships
        .find((m) => m.golferId === v.id)
        .history.map((h) => h.invitedId),
    ).size,
  ).toBe(4);
  expect(
    considerMembership(g, { ...v, roundId: "round-" + g.nextRoundId }),
  ).toBeNull();
  expect(() => restore(serialize(g))).not.toThrow();
});
test("declining, unqualified rounds, unauthorized decisions and damaged saves do not grant membership", () => {
  const { g, v } = application(),
    s = createSession(g),
    watcher = { id: "watcher", role: "spectator" };
  expect(
    s.execute(
      s.nextCommand(watcher.id, "decide-membership", {
        golferId: v.id,
        accept: true,
      }),
      watcher,
    ).ok,
  ).toBe(false);
  const bad = JSON.parse(serialize(g));
  bad.memberships.find((m) => m.golferId === v.id).application.greatShots = 0;
  expect(() => restore(JSON.stringify(bad))).toThrow(/membership application/);
  expect(
    s.execute(
      s.nextCommand(owner.id, "decide-membership", {
        golferId: v.id,
        accept: false,
      }),
      owner,
    ).ok,
  ).toBe(true);
  expect(considerMembership(g, v)).toBeNull();
  expect(g.visitorPool).toHaveLength(12);
  v.roundId = "round-" + g.nextRoundId++;
  v.happiness = 2;
  expect(considerMembership(g, v)).toBeNull();
  v.roundId = "round-" + g.nextRoundId++;
  v.happiness = 5;
  v.happinessReactions = [];
  expect(considerMembership(g, v)).toBeNull();
});
test("phone accepts an application and preserves membership and the invite after reload", async ({
  page,
}) => {
  const { g, v } = application();
  await page.addInitScript((save) => {
    if (!localStorage.getItem("simgolf-reborn.course.v1"))
      localStorage.setItem("simgolf-reborn.course.v1", save);
  }, serialize(g));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForFunction(() => !!window.__gameTest);
  await page.locator("#pause").click();
  await page.keyboard.press("F9");
  const section = page
    .getByRole("region", { name: "Membership application" })
    .filter({ hasText: v.name + " applies" });
  await expect(section).toContainText("Basic");
  await section
    .getByRole("button", { name: "Accept membership", exact: true })
    .click();
  await expect(page.locator("#roster-content")).toContainText("13 golfers");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "../graphics/samples/membership-phone.png" });
  await page.reload();
  await page.waitForFunction(() => !!window.__gameTest);
  const state = await page.evaluate(() => window.__gameTest.getState());
  expect(state.memberships.find((m) => m.golferId === v.id).tier).toBe(1);
  expect(state.visitorPool).toHaveLength(13);
});
