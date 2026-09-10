import { test, expect } from "@playwright/test";
import roster from "../src/simulation/pro-roster.json" with { type: "json" };
import {
  ROSTER_OPPONENT_NAMES,
  originalProfessionalSkills,
  rosterOpponent,
} from "../src/simulation/roster-opponent.js";
import { validateGolferPackage } from "../src/simulation/golfer-package.js";
import { createGame, build, serialize } from "../src/simulation/game.js";
test("original professionals retain every roster skill without granting player allocation points", () => {
  expect(ROSTER_OPPONENT_NAMES).toHaveLength(95);
  for (const record of roster.golfers) {
    const chosen = rosterOpponent(record.name);
    expect(chosen.professional).toBe(record.name);
    expect(() => validateGolferPackage(chosen.golfer)).not.toThrow();
    expect(originalProfessionalSkills(chosen.professional)).toEqual(record.skillCaps);
    expect(Object.values(chosen.golfer.profile.skills).every(n => n === 0)).toBe(true);
  }
  const skills = originalProfessionalSkills("Joe Pro");
  skills.power = 99;
  expect(originalProfessionalSkills("Joe Pro").power).toBe(3);
  expect(() => rosterOpponent("Invented opponent")).toThrow(/roster/);
});
test("phone selects a named professional and preserves the opponent after event reload", async ({
  page,
}) => {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 36, 5);
  await page.addInitScript((save) => {
    if (!localStorage.getItem("simgolf-reborn.course.v1"))
      localStorage.setItem("simgolf-reborn.course.v1", save);
  }, serialize(g));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForFunction(() => !!window.__gameTest);
  await page.locator("#menu-button").click();
  await page.locator("#pro-challenge").click();
  await expect(page.locator("#championship-opponent option")).toHaveCount(96);
  await page.locator("#championship-opponent").selectOption("Joe Pro");
  await expect(page.locator("#opponent-profile")).toContainText(
    "Professional skills",
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "../graphics/samples/roster-opponent-phone.png",
  });
  await page.locator("#start-championship").click();
  await page.waitForURL(/championship=/);
  await page.waitForFunction(() => !!window.__gameTest);
  expect(
    (
      await page.evaluate(() => window.__gameTest.getCompetition())
    ).standings.find((p) => p.id === "club-rival").name,
  ).toBe("Joe Pro");
  await page.reload();
  await page.waitForFunction(() => !!window.__gameTest);
  const rendered = await page.evaluate(() =>
    window.__gameTest
      .getVisibleActors()
      .find((p) => p.id === "opponent:club-rival"),
  );
  expect(rendered.appearance).toEqual(
    roster.golfers.find((p) => p.name === "Joe Pro").appearance,
  );
  await page.screenshot({
    path: "../graphics/samples/named-opponent-appearance.png",
  });
  await page.locator("#standings").click();
  await expect(page.locator("#standings-content")).toContainText("Joe Pro");
});

test("competition uses full NPC abilities, preserves replay and leaves player skills alone", async () => {
  const {createCompetition, restoreCompetition} = await import('../src/simulation/competition.js');
  const {exportCourse} = await import('../src/simulation/course-package.js');
  const {exportGolfer} = await import('../src/simulation/golfer-package.js');
  const g = createGame(); build(g,'tee',7,20); build(g,'green',36,5);
  const strongest = roster.golfers.find(p=>Object.values(p.skillCaps).some(n=>n>10));
  const config = {id:'roster-full',course:await exportCourse(g),entrants:[
    {id:'owner',name:'Gary',golfer:exportGolfer(g)},
    {id:'rival',...rosterOpponent(strongest.name)},
  ]};
  const host = await createCompetition(config);
  expect(host.roundSnapshot('rival').pro.proSkills).toEqual(strongest.skillCaps);
  expect(host.roundSnapshot('owner').pro.proSkills).toEqual(g.proProfile.skills);
  const cup = host.roundSnapshot('rival').holes[0].green;
  expect(host.execute(host.nextCommand('rival','shot',{x:cup.x,z:cup.z,technique:'straight'}),{id:'rival',role:'golfer'}).ok).toBe(true);
  host.stepTicks(40);
  const restored = await restoreCompetition(host.save());
  expect(restored.roundSnapshot('rival')).toEqual(host.roundSnapshot('rival'));
  expect(restored.roundSnapshot('rival').pro.proSkills).toEqual(strongest.skillCaps);
  const wrong = structuredClone(config); wrong.entrants[1].professional = 'Unknown';
  await expect(createCompetition(wrong)).rejects.toThrow(/roster/);
  // Existing event configurations without the new identifier keep their own allocations.
  const legacy = structuredClone(config); delete legacy.entrants[1].professional;
  const oldHost = await createCompetition(legacy);
  expect(oldHost.roundSnapshot('rival').pro.proSkills).toEqual(legacy.entrants[1].golfer.profile.skills);
});
