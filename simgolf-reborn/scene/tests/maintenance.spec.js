import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  addHole,
  hire,
  update,
  serialize,
  restore,
} from "../src/simulation/game.js";
import { key, center } from "../src/simulation/world.js";
import { RULES } from "../src/simulation/rules.js";
import { createSession } from "../src/simulation/session.js";
function sixHoles() {
  const g = createGame();
  const layout = [
    [13, 2, 20, 2],
    [24, 2, 24, 9],
    [27, 2, 34, 2],
    [30, 2, 30, 9],
    [38, 2, 38, 9],
    [16, 4, 16, 11],
  ];
  for (const [i, [tc, tr, gc, gr]] of layout.entries()) {
    if (i) expect(addHole(g).ok).toBe(true);
    expect(build(g, "tee", tc, tr, 1, g.holes[i].id).ok).toBe(true);
    expect(build(g, "green", gc, gr, 1, g.holes[i].id).ok).toBe(true);
  }
  return g;
}
const advance = (g, seconds) => {
  for (let i = 0; i < seconds / 0.05; i++) update(g, 0.05);
};
function neglected() {
  const g = sixHoles();
  g.weeds = [];
  g.nextWeed = 10000;
  g.tiles[key(10, 17)] = { type: "fairway", wear: 4 };
  return g;
}
test("technician gate rejects a small course, charges once at six complete holes", () => {
  const small = createGame();
  expect(hire(small, "technician").ok).toBe(false);
  expect(small.staff).toHaveLength(0);
  const g = sixHoles(),
    h = createSession(g),
    owner = { id: "owner", role: "owner" },
    cash = g.cash;
  const c = h.nextCommand(owner.id, "hire-technician");
  expect(h.execute(c, owner).ok).toBe(true);
  expect(h.execute(c, owner).ok).toBe(true);
  expect(g.staff).toHaveLength(1);
  expect(g.cash).toBe(cash - RULES.technicianHireCost);
});
test("neglected wear grows crabgrass; a basic groundskeeper never repairs it", () => {
  const g = neglected();
  expect(hire(g).ok).toBe(true);
  advance(g, 62);
  expect(g.tiles[key(10, 17)].crabgrass).toBe(true);
  expect(g.staff[0].repaired).toBe(0);
  expect(restore(serialize(g)).tiles[key(10, 17)]).toEqual(
    g.tiles[key(10, 17)],
  );
});
test("technician walks then repairs, and mid-work reload preserves exact outcomes and wages", () => {
  const g = neglected();
  advance(g, 62);
  hire(g, "technician");
  const t = g.tiles[key(10, 17)];
  advance(g, 0.1);
  expect(g.staff[0].phase).toBe("walking");
  expect(t.crabgrass).toBe(true);
  for (let i = 0; i < 1000 && g.staff[0].phase !== "repairing"; i++)
    update(g, 0.05);
  expect(g.staff[0].phase).toBe("repairing");
  advance(g, 1);
  expect(t.crabgrass).toBe(true);
  const resumed = restore(serialize(g));
  advance(g, 65);
  advance(resumed, 65);
  expect(serialize(resumed)).toBe(serialize(g));
  expect(t.wear).toBeUndefined();
  expect(t.crabgrass).toBeUndefined();
  expect(g.staff[0].repaired).toBe(4);
  expect(g.staff[0].crabgrassRemoved).toBe(1);
  expect(
    g.ledger.some(
      (x) =>
        x.reason === "Maintenance wages" && x.amount === -RULES.technicianWage,
    ),
  ).toBe(true);
});
test("two technicians cannot claim the same turf job; removed turf cancels work", () => {
  const g = neglected();
  hire(g, "technician");
  hire(g, "technician");
  advance(g, 0.1);
  expect(
    g.staff.filter((s) => s.targetKind === "turf" && s.target === key(10, 17)),
  ).toHaveLength(1);
  delete g.tiles[key(10, 17)];
  advance(g, 25);
  expect(g.staff.reduce((a, s) => a + s.repaired, 0)).toBe(0);
  const bad = JSON.parse(serialize(g));
  bad.staff[0].role = "groundskeeper";
  bad.staff[0].phase = "repairing";
  expect(() => restore(JSON.stringify(bad))).toThrow();
});
test('staff controls unlock from a six-hole import and show completed turf work',async({page})=>{
 test.setTimeout(30000);
 await page.goto('/');await page.waitForFunction(()=>window.__gameTest);
 await page.locator('[data-mode="staff"]').click();await expect(page.locator('#hire-technician')).toBeDisabled();
 const g=neglected();advance(g,62);
 await page.locator('#import').setInputFiles({name:'maintenance.json',mimeType:'application/json',buffer:Buffer.from(serialize(g))});
 await page.waitForFunction(()=>window.__gameTest?.getState().holes.length===6);
 await page.locator('[data-mode="staff"]').click();await expect(page.locator('#hire-technician')).toBeEnabled();
 await page.locator('#hire-technician').click();
 await expect.poll(()=>page.evaluate(()=>window.__gameTest.getState().staff[0]?.repaired),{timeout:20000}).toBe(4);
 await expect(page.locator('#live-details')).toContainText('4 divots repaired');
 await page.screenshot({path:'../graphics/samples/turf-technician.png'});
 await page.locator('#menu-button').click(); await page.locator('#new').click(); await page.locator('#confirm-new').click();
 await page.waitForFunction(()=>window.__gameTest?.getState().holes.length===1);
 expect(await page.evaluate(()=>window.__gameTest.getState().staff.length)).toBe(0);
});
