import {createProtocol,PROTOCOL_VERSION,RULESET_VERSION} from "../src/simulation/protocol.js";
import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  openHole,
  update,
  serialize,
  restore,
  connected,
} from "../src/simulation/game.js";
import {
  airstripFeeBonus,
  validFeeSnapshot,
} from "../src/simulation/happiness.js";
import { demolish } from "../src/simulation/course-edit.js";

test("connected airstrip contributes to a real paid round and keeps its historical bonus after removal", () => {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 36, 22);
  for (let c = 11; c <= 31; c++) build(g, "fairway", c, 21, 3);
  expect(build(g, "airstrip", 22, 15).ok).toBe(true);
  for (let c = 7; c <= 22; c++) expect(build(g, "path", c, 11).ok).toBe(true);
  expect(connected(g, g.facilities[0])).toBe(true);
  expect(openHole(g).ok).toBe(true);
  for (let i = 0; i < 16000 && !g.rounds.length; i++) update(g, 0.05);
  expect(g.rounds).toHaveLength(1);
  const s = g.rounds[0].scorecard[0];
  expect(s.airstripBonus).toBe(100);
  expect(s.airstripBonus).toBeGreaterThan(0);
  expect(s.fee).toBe(s.happiness * 100 + 100);
  expect(
    g.ledger.some((r) => r.amount === s.fee && r.reason.includes("green fee")),
  ).toBe(true);
  const saved = restore(serialize(g));
  expect(saved.rounds[0].scorecard[0]).toEqual(s);
  // Clear active visit paths before demolition, as normal construction protection requires.
  g.guests = [];
  expect(demolish(g, 22, 15).ok).toBe(true);
  expect(g.rounds[0].scorecard[0]).toEqual(s);
  expect(validFeeSnapshot(s)).toBe(true);
});
test("no bonus for pros or disconnected facilities; forged score additions reject", () => {
  expect(airstripFeeBonus({ pro: true, happiness: 8 }, true)).toBe(0);
  expect(airstripFeeBonus({ pro: false, happiness: 8 }, false)).toBe(0);
  expect(
    validFeeSnapshot({ happiness: 8, fee: 1000, airstripBonus: 200 }),
  ).toBe(true);
  expect(validFeeSnapshot({ happiness: 8, fee: 800 })).toBe(true);
  expect(
    validFeeSnapshot({ happiness: 8, fee: 1800, airstripBonus: 1000 }),
  ).toBe(false);
  expect(validFeeSnapshot({ fee: 1000, airstripBonus: 200 })).toBe(false);
});

test("visitor panel includes the connected Airstrip fee bonus", async ({
  page,
}) => {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 36, 22);
  for (let c = 11; c <= 31; c++) build(g, "fairway", c, 21, 3);
  build(g, "airstrip", 22, 15);
  for (let c = 7; c <= 22; c++) build(g, "path", c, 11);
  openHole(g);
  for (let i = 0; i < 16000 && !g.guests.some((v) => v.happiness > 0); i++)
    update(g, 0.05);
  const v = g.guests[0];
  expect(v.happiness).toBeGreaterThan(0);
  await page.addInitScript(
    (s) => localStorage.setItem("simgolf-reborn.course.v1", s),
    serialize(g),
  );
  await page.goto("/");
  await page.locator("#loading").waitFor({ state: "hidden" });
  await page.locator("#pause").click();
  await page.locator('[data-mode="guests"]').click();
  const expected = await page.evaluate(
    () => window.__gameTest.getState().guests[0].happiness * 100 + 100,
  );
  await expect(page.locator("#live-details")).toContainText(
    `Current green fee $${expected}`,
  );
});

test('new fee rules reject percentage bonuses while historical snapshots remain valid',()=>{
 expect(validFeeSnapshot({feeRule:'airstrip-flat-v1',happiness:8,fee:900,airstripBonus:100})).toBe(true);
 expect(validFeeSnapshot({feeRule:'airstrip-flat-v1',happiness:8,fee:1000,airstripBonus:200})).toBe(false);
 expect(validFeeSnapshot({happiness:8,fee:1000,airstripBonus:200})).toBe(true);
 expect(validFeeSnapshot({feeRule:'unknown',happiness:8,fee:800})).toBe(false);
 const g=createGame(),data=JSON.parse(serialize(g));data.protocol=createProtocol();data.protocol.version=77;data.protocol.ruleset='prototype-marina-activity-2026-09-11';
 const upgraded=restore(JSON.stringify(data));expect(upgraded.protocol.version).toBe(PROTOCOL_VERSION);expect(upgraded.protocol.ruleset).toBe(RULESET_VERSION);
});
