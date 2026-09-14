// Review fixture built through the same controls as a player, in an isolated browser.
import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  await page.goto("http://127.0.0.1:4176/");
  await page.waitForFunction(() => window.__gameTest);
  await page.locator("#pause").click();
  async function place(t, x, z) {
    await page.locator(`[data-tool="${t}"]`).click();
    const p = await page.evaluate(
      ([x, z]) => window.__gameTest.project(x, z),
      [x, z],
    );
    await page.mouse.click(p.x, p.y);
  }
  await place("tee", -29, 7);
  await place("green", 29, -23);
  await page.locator("#brush").selectOption("5");
  for (const [x, z] of [
    [-19, 3],
    [-13, 3],
    [-13, -1],
    [-5, -1],
    [-5, -5],
    [3, -5],
    [3, -9],
    [11, -9],
    [11, -13],
    [19, -13],
    [19, -17],
  ])
    await place("fairway", x, z);
  await page.locator("#brush").selectOption("3");
  await place("sand", 21, -29);
  await place("sand", 37, -17);
  await page.locator("#brush").selectOption("1");
  for (let z = -3; z <= 15; z += 2) await place("path", -37, z);
  for (let x = -35; x <= -9; x += 2) await place("path", x, 15);
  for (let x = -35; x <= -29; x += 2) await place("path", x, -5);
  await place("snack", -23, -9);
  await place("path", -27, -9);
  await page.locator("#open-hole").click();
  await page.locator("#add-hole").click();
  await place("tee", 27, -9);
  await place("green", 9, 9);
  await page.locator("#brush").selectOption("3");
  for (const [x, z] of [
    [23, -3],
    [19, 1],
    [17, 5],
    [17, 7],
  ])
    await place("firm", x, z);
  await page.locator("#open-hole").click();
  await page.locator('[data-mode="staff"]').click();
  await page.locator("#hire").click();
  await page.locator("#pause").click();
  await page.locator("#speed").click();
  await page.waitForFunction(()=>window.__gameTest.getState().rounds.length>0,{},{timeout:45000});
  await page.locator("#pause").click();
  await page.locator('[data-mode="guests"]').click();
  const samples = fileURLToPath(
    new URL("../../graphics/samples/", import.meta.url),
  );
  await page.screenshot({ path: `${samples}playable-overview.png` });
  await page.locator("#scorecard").click();
  await page.screenshot({ path: `${samples}playable-scorecards.png` });
  await page
    .getByRole("button", { name: "Close scorecards", exact: true })
    .click();
  const save = await page.evaluate(() =>
    JSON.stringify(window.__gameTest.getState()),
  );
  await writeFile(`${samples}playable-example.json`, save + "\n");
  const phone = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await phone.addInitScript(
    (save) => localStorage.setItem("simgolf-reborn.course.v1", save),
    save,
  );
  await phone.goto("http://127.0.0.1:4176/");
  await phone.waitForFunction(() => window.__gameTest);
  await phone.locator("#pause").click();
  await page.waitForTimeout(200);
  await phone.screenshot({ path: `${samples}playable-phone.png` });
  console.log(
    "Saved desktop and phone views, plus an importable example course.",
  );
} finally {
  await browser.close();
}
