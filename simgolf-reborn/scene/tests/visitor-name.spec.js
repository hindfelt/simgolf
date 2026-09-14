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
const owner = { id: "owner", role: "owner" };
function course() {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 22, 10);
  openHole(g);
  while (!g.guests.length) update(g, 0.05);
  return g;
}
test("renaming during a story preserves identity, future dialogue, completed rounds and return visits", () => {
  const g = course(),
    v = g.guests[0],
    s = createSession(g);
  const before = structuredClone(v);
  const cmd = s.nextCommand(owner.id, "rename-visitor", {
    golferId: v.id,
    name: "  Åsa Green  ",
  });
  const result = s.execute(cmd, owner);
  expect(result.ok).toBe(true);
  expect(v).toEqual({ ...before, name: "Åsa Green" });
  expect(s.execute(cmd, owner)).toEqual(result);
  expect(createSession(restore(serialize(g))).execute(cmd, owner)).toEqual(
    result,
  );
  for (let i = 0; i < 10000 && !v.roundFinished; i++) update(g, 0.05);
  expect(v.roundFinished).toBe(true);
  const past = structuredClone(g.rounds);
  expect(
    s.execute(
      s.nextCommand(owner.id, "rename-visitor", {
        golferId: v.id,
        name: "Åsa Brook",
      }),
      owner,
    ).ok,
  ).toBe(true);
  expect(g.rounds).toEqual(past);
  const copy = restore(serialize(g));
  let returned;
  for (let i = 0; i < 20000; i++) {
    update(g, 0.05);
    update(copy, 0.05);
    returned = g.guests.find((p) => p.id === v.id && p.roundId !== v.roundId);
    if (returned) break;
  }
  expect(returned?.name).toBe("Åsa Brook");
  expect(serialize(copy)).toBe(serialize(g));
});
test("names are bounded and edits require authority; equal names keep separate identities", () => {
  const g = course(),
    s = createSession(g),
    id = g.guests[0].id;
  for (const name of ["", " ", "x".repeat(81), "new\nname", null]) {
    const before = structuredClone(g.visitorPool);
    expect(
      s.execute(
        s.nextCommand(owner.id, "rename-visitor", { golferId: id, name }),
        owner,
      ).ok,
    ).toBe(false);
    expect(g.visitorPool).toEqual(before);
  }
  const spectator = { id: "watcher", role: "spectator" };
  expect(
    s.execute(
      s.nextCommand(spectator.id, "rename-visitor", {
        golferId: id,
        name: "X",
      }),
      spectator,
    ).ok,
  ).toBe(false);
  const second = g.visitorPool[1];
  expect(
    s.execute(
      s.nextCommand(owner.id, "rename-visitor", {
        golferId: id,
        name: second.name,
      }),
      owner,
    ).ok,
  ).toBe(true);
  expect(
    restore(serialize(g)).visitorPool.filter((p) => p.name === second.name),
  ).toHaveLength(2);
});
test("phone roster saves a literal name and reloads it without losing selection", async ({
  page,
}) => {
  const g = course(),
    id = g.visitorPool[1].id;
  await page.addInitScript((save) => {
    if (!localStorage.getItem("simgolf-reborn.course.v1"))
      localStorage.setItem("simgolf-reborn.course.v1", save);
  }, serialize(g));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForFunction(() => !!window.__gameTest);
  await page.locator("#pause").click();
  await page.keyboard.press("F9");
  await page
    .getByLabel("First golfer", { exact: true })
    .selectOption(String(id));
  await page.getByText("Customize first golfer", { exact: true }).click();
  await page.getByLabel("Visitor name", { exact: true }).fill("Åsa <Green>");
  await page.getByRole("button", { name: "Save name", exact: true }).click();
  await expect(page.getByLabel("First golfer", { exact: true })).toHaveValue(
    String(id),
  );
  await expect(
    page.getByLabel("First golfer", { exact: true }).locator("option:checked"),
  ).toHaveText("Åsa <Green>");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.reload();
  await page.waitForFunction(() => !!window.__gameTest);
  expect(
    await page.evaluate(
      (id) =>
        window.__gameTest.getState().visitorPool.find((p) => p.id === id).name,
      id,
    ),
  ).toBe("Åsa <Green>");
});
