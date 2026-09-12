import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  openHole,
  update,
  serialize,
  restore,
  shotLimit,
  takeShot,
  connected,
} from "../src/simulation/game.js";
import {
  TRAINING_FACILITIES,
  completeTraining,
} from "../src/simulation/facilities.js";
import { key } from "../src/simulation/world.js";
const advance = (g, seconds) => {
  for (let i = 0; i < seconds / 0.05; i++) update(g, 0.05);
};
function course(type, link = true) {
  const g = createGame(22);
  expect(build(g, "tee", 7, 20).ok).toBe(true);
  expect(build(g, "green", 36, 5).ok).toBe(true);
  expect(build(g, type, 11, 14).ok).toBe(true);
  if (link)
    for (let c = 8; c <= 11; c++) expect(build(g, "path", c, 11).ok).toBe(true);
  if (type === "pro-shop" && link)
    expect(build(g, "path", 11, 12).ok).toBe(true);
  return g;
}
test("all training facilities have protected footprints and connected entrances", () => {
  for (const type of TRAINING_FACILITIES) {
    const g = course(type);
    expect(connected(g, g.facilities[0])).toBe(true);
    expect(build(g, "fairway", 11, 14).ok).toBe(false);
    expect(restore(serialize(g)).facilities[0].type).toBe(type);
    expect(connected(course(type, false), g.facilities[0])).toBe(false);
  }
});
test("existing skill only, one benefit per round, with carry and accuracy changes", () => {
  const v = {
    skills: { length: false, accuracy: true, imagination: true },
    trained: {},
    pro: false,
    paid: false,
  };
  expect(completeTraining(v, "driving-range")).toBe(false);
  expect(v.skills.length).toBe(false);
  expect(completeTraining(v, "pro-shop")).toBe(true);
  expect(completeTraining(v, "pro-shop")).toBe(false);
  const g = course("driving-range");
  openHole(g);
  advance(g, 1.2);
  const a = g.guests[0];
  a.skills.length = true;
  const before = shotLimit(g, a);
  expect(completeTraining(a, "driving-range")).toBe(true);
  expect(shotLimit(g, a)).toBeGreaterThan(before);
});
test("actual visits train eligible guests and persist mid-service; disconnected training is unavailable", () => {
  for (const type of TRAINING_FACILITIES) {
    const g = course(type);
    openHole(g);
    advance(g, 1.1);
    let saw = false;
    for (let i = 0; i < 1400; i++) {
      update(g, 0.05);
      if (g.guests.some((v) => v.phase === "service")) {
        saw = true;
        break;
      }
    }
    expect(saw).toBe(true);
    const next = restore(serialize(g));
    advance(g, 15);
    advance(next, 15);
    expect(serialize(next)).toBe(serialize(g));
    expect(g.facilities[0].served).toBeGreaterThan(0);
    for (const v of g.guests)
      for (const skill of Object.keys(v.trained))
        expect(v.skills[skill]).toBe(true);
    const detached = course(type, false);
    openHole(detached);
    advance(detached, 90);
    expect(detached.facilities[0].served).toBe(0);
  }
});
test("disconnecting during training gives no credit or snack income", () => {
  const g = course("pro-shop");
  openHole(g);
  for (let i = 0; i < 1400 && !g.guests.some((v) => v.phase === "service"); i++)
    update(g, 0.05);
  const learner = g.guests.find((v) => v.phase === "service");
  expect(learner).toBeTruthy();
  delete g.tiles[key(8, 11)];
  advance(g, 8);
  expect(g.facilities[0].served).toBe(0);
  expect(learner.trained.accuracy).toBeUndefined();
  expect(g.ledger.some((x) => x.reason === "Snack bar sale")).toBe(false);
});
test("browser builds distinct training facilities and preserves them on reload", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.__gameTest);
  await page.locator("#pause").click();
  for (const [tool, x, z] of [
    ["pro-shop", -21, -5],
    ["driving-range", 3, 1],
    ["putting-green", 21, 1],
  ]) {
    await page.locator(`[data-tool="${tool}"]`).click();
    const p = await page.evaluate(
      ([x, z]) => window.__gameTest.project(x, z),
      [x, z],
    );
    await page.mouse.click(p.x, p.y);
  }
  expect(
    await page.evaluate(() =>
      window.__gameTest.getState().facilities.map((f) => f.type),
    ),
  ).toEqual(TRAINING_FACILITIES);
  await page.locator("#menu-button").click();
  await page.locator("#save").click();
  await page.getByRole("button", { name: "Close menu", exact: true }).click();
  await page.screenshot({
    path: "../graphics/samples/training-facilities.png",
  });
  await page.reload();
  await page.waitForFunction(() => window.__gameTest);
  expect(
    await page.evaluate(() => window.__gameTest.getState().facilities.length),
  ).toBe(3);
});
test('accuracy training reduces the same seeded shot error without changing the underlying skill',()=>{
 const g=course('pro-shop',false);openHole(g);advance(g,1.2);
 const v=g.guests[0];v.skills.accuracy=true;v.phase='address';v.pos={...v.ball};
 const trained=restore(serialize(g)),learner=trained.guests[0];expect(completeTraining(learner,'pro-shop')).toBe(true);
 const target={x:v.ball.x+8,z:v.ball.z};takeShot(g,v,target);takeShot(trained,learner,target);
 const error=p=>Math.hypot(p.shot.landing.x-target.x,p.shot.landing.z-target.z);
 expect(error(learner)).toBeLessThan(error(v));expect(learner.skills).toEqual(v.skills);
});
