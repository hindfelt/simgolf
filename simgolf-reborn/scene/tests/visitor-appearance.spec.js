import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  openHole,
  update,
  serialize,
  restore,
} from "../src/simulation/game.js";
import { createSession } from "../src/simulation/session.js";
import { visitorAppearance } from "../src/simulation/appearance.js";
test("known skill combinations map to original clothing cues without changing skills", () => {
  for (const [skills, bodies] of [
    [{ length: true, accuracy: true, imagination: true }, [2]],
    [{ length: true, accuracy: false, imagination: true }, [3]],
    [{ length: true, accuracy: true, imagination: false }, [1]],
    [{ length: false, accuracy: true, imagination: true }, [4, 5, 6, 7]],
    [{ length: false, accuracy: false, imagination: false }, [0]],
  ]) {
    const before = structuredClone(skills);
    expect(bodies).toContain(visitorAppearance(skills, 15).body);
    expect(skills).toEqual(before);
  }
});
test("a returning visitor keeps their appearance and old saves preserve the live round", () => {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 22, 10);
  openHole(g);
  while (!g.guests.length) update(g, 0.05);
  const first = g.guests[0],
    id = first.id,
    round = first.roundId,
    appearance = structuredClone(first.appearance);
  createSession(g);
  const old = JSON.parse(serialize(g));
  old.protocol.version = 33;
  old.protocol.ruleset = "prototype-personalities-2026-09-06";
  for (const p of old.visitorPool) delete p.appearance;
  for (const v of old.guests) delete v.appearance;
  const loaded = restore(JSON.stringify(old));
  expect(loaded.guests[0].ball).toEqual(first.ball);
  expect(loaded.guests[0].strokes).toBe(first.strokes);
  expect(loaded.rng).toBe(g.rng);
  expect(loaded.ledger).toEqual(g.ledger);
  let returned;
  for (let i = 0; i < 15000; i++) {
    update(g, 0.05);
    returned = g.guests.find((v) => v.id === id && v.roundId !== round);
    if (returned) break;
  }
  expect(returned).toBeTruthy();
  expect(returned.appearance).toEqual(appearance);
  expect(
    restore(serialize(g)).guests.find((v) => v.id === id).appearance,
  ).toEqual(appearance);
  const bad = JSON.parse(serialize(g));
  bad.visitorPool[0].appearance.skin = 4;
  expect(() => restore(JSON.stringify(bad))).toThrow(/appearance/);
});
test("the browser renders visiting golfers from their saved appearance profiles", async ({
  page,
}) => {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 22, 10);
  openHole(g);
  for (let i = 0; i < 200; i++) update(g, 0.05);
  await page.addInitScript(
    (save) => localStorage.setItem("simgolf-reborn.course.v1", save),
    serialize(g),
  );
  await page.goto("/");
  await page.waitForFunction(() => !!window.__gameTest);
  await page.locator("#pause").click();
  const state = await page.evaluate(() => window.__gameTest.getState());
  const actors = await page.evaluate(() =>
    window.__gameTest.getVisibleActors(),
  );
  for (const v of state.guests)
    expect(actors.find((a) => a.id === v.id).appearance).toEqual(v.appearance);
  await page.screenshot({
    path: "../graphics/samples/visitor-appearances.png",
  });
});
