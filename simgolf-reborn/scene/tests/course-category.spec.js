import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  addHole,
  startPractice,
  restore,
  serialize,
} from "../src/simulation/game.js";
import { courseCategory } from "../src/simulation/course-category.js";
import { allocateProSkill } from "../src/simulation/pro-skills.js";
import { exportGolfer, loadGolfer } from "../src/simulation/golfer-package.js";
const layout = [
  [13, 2, 20, 2],
  [24, 2, 24, 9],
  [27, 2, 34, 2],
  [30, 2, 30, 9],
  [38, 2, 38, 9],
  [16, 4, 16, 11],
  [15, 7, 10, 12],
  [34, 7, 34, 14],
  [42, 7, 42, 14],
  [20, 9, 20, 16],
  [3, 10, 3, 17],
  [34, 10, 29, 15],
  [20, 12, 15, 17],
  [3, 13, 8, 18],
  [25, 13, 25, 20],
  [38, 15, 33, 20],
  [25, 16, 20, 21],
  [37, 18, 37, 25],
];
test("categories change at six, ten and eighteen completed holes, including closed holes", () => {
  const g = createGame();
  expect(courseCategory(g).holes).toBe(0);
  for (const [i, [tc, tr, gc, gr]] of layout.entries()) {
    if (i) expect(addHole(g).ok).toBe(true);
    const id = g.holes[i].id;
    expect(build(g, "tee", tc, tr, 1, id).ok).toBe(true);
    expect(courseCategory(g).holes).toBe(i);
    expect(build(g, "green", gc, gr, 1, id).ok).toBe(true);
    const category = courseCategory(g),
      n = i + 1;
    expect(category.skillCap).toBe(
      n < 6 ? 6 : n < 10 ? 8 : n < 18 ? 10 : Infinity,
    );
    expect(category.name).toBe(
      n < 6
        ? "Municipal Course"
        : n < 10
          ? "Golf Course"
          : n < 18
            ? "Country Club"
            : "Championship Course",
    );
  }
  expect(courseCategory(restore(serialize(g)))).toEqual(courseCategory(g));
});
test("course cap limits new allocation and active skills without destroying an imported profile", () => {
  const donor = createGame();
  donor.proProfile.skills.power = 10;
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 36, 5);
  expect(loadGolfer(g, exportGolfer(donor)).ok).toBe(true);
  expect(startPractice(g).ok).toBe(true);
  expect(g.pro.proSkills.power).toBe(6);
  expect(g.proProfile.skills.power).toBe(10);
  expect(exportGolfer(g).profile.skills.power).toBe(10);
  expect(restore(serialize(g)).pro.proSkills.power).toBe(6);
  const fresh = createGame();
  for (let i = 0; i < 6; i++)
    expect(allocateProSkill(fresh, "power", 1).ok).toBe(true);
  expect(allocateProSkill(fresh, "power", 1).message).toContain("60%");
  expect(allocateProSkill(fresh, "irons", 1).ok).toBe(true);
});
test("skills dialog explains the municipal cap and stops allocation at sixty percent", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__gameTest);
  await expect(page.locator(".club h1")).toHaveText("Willow Brook MC");
  await page.locator('[data-mode="play"]').click();
  await page.locator("#pro-skills").click();
  await expect(page.locator("#course-skill-limit")).toContainText(
    "60% maximum",
  );
  const increase = page.getByRole("button", {
    name: "Increase Power Hitter",
    exact: true,
  });
  for (let i = 0; i < 6; i++) await increase.click();
  await expect(increase).toBeDisabled();
  await expect(page.locator("#skill-points")).toHaveText(
    "4 skill points available",
  );
  await page
    .getByRole("button", { name: "Decrease Power Hitter", exact: true })
    .click();
  await expect(increase).toBeEnabled();
});
