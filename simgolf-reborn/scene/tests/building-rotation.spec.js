import {test,expect} from "@playwright/test";
import {createGame,build,serialize,restore} from "../src/simulation/game.js";
import {exportCourse,coursePractice} from "../src/simulation/course-package.js";
test("quarter turns survive resort saves and portable courses",async()=>{
 const g=createGame();
 build(g,"tee",7,20);build(g,"green",36,5);
 expect(build(g,"snack",22,14,1,g.holes[0].id,3).ok).toBe(true);
 expect(restore(serialize(g)).facilities[0].rotation).toBe(3);
 const pkg=await exportCourse(g);
 expect(coursePractice(pkg).facilities[0].rotation).toBe(3);
 const before=serialize(g);
 expect(build(g,"bench",25,14,1,g.holes[0].id,4).ok).toBe(false);
 expect(serialize(g)).toBe(before);
});
test("place a rotated building from the construction controls",async({page})=>{
 await page.goto("/");
 await page.waitForFunction(()=>!!window.__gameTest);
 await page.locator("#pause").click();
 await page.locator("#building-rotation").selectOption("1");
 await page.locator('[data-tool="snack"]').click();
 const p=await page.evaluate(()=>window.__gameTest.project(1,-5));
 await page.mouse.click(p.x,p.y);
 const facilities=await page.evaluate(()=>window.__gameTest.getState().facilities);
 expect(facilities).toHaveLength(1);
 expect(facilities[0].rotation).toBe(1);
 await page.locator("#menu-button").click();await page.locator("#save").click();
 await page.reload();await page.waitForFunction(()=>!!window.__gameTest);
 expect((await page.evaluate(()=>window.__gameTest.getState().facilities))[0].rotation).toBe(1);
 await page.screenshot({path:"../graphics/samples/rotated-building.png"});
});

test("hover previews cost nothing and Tab rotates before placement", async ({page}) => {
 await page.goto("/");
 await page.waitForFunction(()=>!!window.__gameTest);
 await page.locator("#pause").click();
 await page.locator('[data-tool="snack"]').click();
 const before=await page.evaluate(()=>window.__gameTest.getState());
 const p=await page.evaluate(()=>window.__gameTest.project(1,-5));
 await page.mouse.move(p.x,p.y);
 await page.keyboard.press("Tab");
 await expect(page.locator("#building-rotation")).toHaveValue("1");
 expect(await page.evaluate(()=>window.__gameTest.getState())).toEqual(before);
 await page.screenshot({path:"../graphics/samples/building-preview.png"});
 await page.mouse.click(p.x,p.y);
 expect((await page.evaluate(()=>window.__gameTest.getState().facilities))[0].rotation).toBe(1);
});
