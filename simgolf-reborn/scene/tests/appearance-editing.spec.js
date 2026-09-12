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
const owner = { id: "owner", role: "owner" },
  appearance = { body: 7, skin: 2, hat: 9, shirt: 8, pants: 6 };
function course() {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 36, 5);
  openHole(g);
  while (!g.guests.length) update(g, 0.05);
  return g;
}
test("customization changes only appearance, saves a copy, and retries safely after reload", () => {
  const g = course(),
    s = createSession(g),
    v = g.guests[0],
    before = structuredClone(v),
    cash = g.cash,
    rng = g.rng;
  const payload = { golferId: v.id, appearance: structuredClone(appearance) };
  const cmd = s.nextCommand(owner.id, "set-visitor-appearance", payload),
    result = s.execute(cmd, owner);
  expect(result.ok).toBe(true);
  expect(v).toEqual({ ...before, appearance });
  expect(g.cash).toBe(cash);
  expect(g.rng).toBe(rng);
  expect(g.visitorPool.find((p) => p.id === v.id).appearance).toEqual(
    appearance,
  );
  expect(s.execute(cmd, owner)).toEqual(result);
  const loaded = restore(serialize(g));
  expect(createSession(loaded).execute(cmd, owner)).toEqual(result);
  payload.appearance.shirt = 0;
  expect(v.appearance.shirt).toBe(8);
});
test("invalid styles and unauthorized edits cannot change a visitor", () => {
  const g = course(),
    s = createSession(g),
    id = g.guests[0].id,
    before = structuredClone(g.visitorPool);
  for (const a of [
    { ...appearance, body: 8 },
    { ...appearance, hat: -1 },
    { ...appearance, extra: 1 },
  ])
    expect(
      s.execute(
        s.nextCommand(owner.id, "set-visitor-appearance", {
          golferId: id,
          appearance: a,
        }),
        owner,
      ).ok,
    ).toBe(false);
  const spectator = { id: "watcher", role: "spectator" };
  expect(
    s.execute(
      s.nextCommand(spectator.id, "set-visitor-appearance", {
        golferId: id,
        appearance,
      }),
      spectator,
    ).ok,
  ).toBe(false);
  expect(g.visitorPool).toEqual(before);
});
test("phone editing updates the active model and keeps the selected golfer after saving and reloading", async ({
  page,
}) => {
  const g = course();
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
    .selectOption({ label: "Ben" });
  await page.getByText("Customize first golfer", { exact: true }).click();
  for (const [key, value] of Object.entries(appearance))
    await page
      .getByLabel("Visitor " + key, { exact: true })
      .selectOption(String(value));
  const id = g.visitorPool.find((p) => p.name === "Ben").id;
  expect(
    await page.evaluate(
      (id) =>
        window.__gameTest.getState().visitorPool.find((p) => p.id === id)
          .appearance,
      id,
    ),
  ).not.toEqual(appearance);
  await page
    .getByRole("button", { name: "Save appearance", exact: true })
    .click();
  await expect(page.getByLabel("First golfer", { exact: true })).toHaveValue(
    String(id),
  );
  await expect
    .poll(() =>
      page.evaluate(
        (id) =>
          window.__gameTest.getVisibleActors().find((p) => p.id === id)
            ?.appearance,
        id,
      ),
    )
    .toEqual(appearance);
  await page.getByText("Customize first golfer", { exact: true }).click();
  await expect(page.getByLabel("Visitor body", { exact: true })).toHaveValue(
    "7",
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "../graphics/samples/appearance-editor-phone.png",
  });
  await page.reload();
  await page.waitForFunction(() => !!window.__gameTest);
  expect(
    await page.evaluate(
      (id) =>
        window.__gameTest.getState().visitorPool.find((p) => p.id === id)
          .appearance,
      id,
    ),
  ).toEqual(appearance);
});
