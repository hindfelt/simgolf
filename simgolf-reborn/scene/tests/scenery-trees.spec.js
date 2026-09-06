import { test, expect } from "@playwright/test";
import {
  createGame,
  build,
  serialize,
  restore,
} from "../src/simulation/game.js";
import { demolish } from "../src/simulation/course-edit.js";
import {
  sceneryTrees,
  sceneryTreeAt,
} from "../src/simulation/scenery-trees.js";
import { ownsLand } from "../src/simulation/land-purchase.js";
import { key } from "../src/simulation/world.js";
import {
  exportCourse,
  coursePractice,
} from "../src/simulation/course-package.js";
test("every owned scenery tree can be raised, lowered and removed with persistent clearing", async () => {
  const g = createGame();
  const trees = sceneryTrees().filter((t) => ownsLand(g, t.c, t.r));
  expect(trees.length).toBeGreaterThan(3);
  for (const t of trees) {
    expect(build(g, "raise", t.c, t.r).ok).toBe(true);
    expect(build(g, "lower", t.c, t.r).ok).toBe(true);
    expect(demolish(g, t.c, t.r).ok).toBe(true);
    expect(sceneryTreeAt(g, t.c, t.r)).toBe(false);
  }
  expect(restore(serialize(g)).removedTrees).toEqual(g.removedTrees);
  build(g, "tee", 7, 20);
  build(g, "green", 22, 10);
  expect(coursePractice(await exportCourse(g)).removedTrees).toEqual(
    g.removedTrees,
  );
  expect(build(g, "raise", 7, 5).ok).toBe(false);
});
test("browser removes a scenery tree by clicking its visible trunk and retains removal after reload", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#loading").waitFor({ state: "hidden" });
  await page.locator("#pause").click();
  await page.locator('[data-tool="demolish"]').click();
  // The natural tree at (-11,-31) is on owned land, previously fixed scenery.
  const p = await page.evaluate(() => window.__gameTest.project(-11, -31, 3));
  await page.mouse.click(p.x, p.y);
  await expect(page.locator("#remove-dialog")).toBeVisible();
  await page.locator("#confirm-removal").click();
  expect(
    await page.evaluate(() => window.__gameTest.getState().removedTrees),
  ).toEqual({ [key(16, 1)]: true });
  await page.reload();
  await page.locator("#loading").waitFor({ state: "hidden" });
  expect(
    await page.evaluate(() => window.__gameTest.getState().removedTrees),
  ).toEqual({ [key(16, 1)]: true });
  await page.screenshot({ path: "/tmp/simgolf-tree-removed.png" });
});

test('scenery trunk rendering follows raised ground without changing its location',async({page})=>{
 await page.goto('/');await page.locator('#loading').waitFor({state:'hidden'});
 const delta=await page.evaluate(async()=>{
  const THREE=await import('/node_modules/three/build/three.module.js');
  const {buildFlora}=await import('/src/flora.js');
  const {setLandscapeState}=await import('/src/landscape.js');
  const {createGame,build}=await import('/src/simulation/game.js');
  const g=createGame();setLandscapeState(g);const scene=new THREE.Scene(),flora=buildFlora(scene,{editableWater:true});flora.update(g);
  const mesh=scene.children.find(m=>m.geometry?.type==='CylinderGeometry'&&m.userData.transforms?.some(t=>t.tree?.x===-11));
  const i=mesh.userData.transforms.findIndex(t=>t.tree?.x===-11&&t.tree?.z===-31),matrix=new THREE.Matrix4();mesh.getMatrixAt(i,matrix);const before=matrix.elements[13];
  build(g,'raise',16,1);flora.update(g);mesh.getMatrixAt(i,matrix);return matrix.elements[13]-before;
 });expect(delta).toBeCloseTo(.5,4);
});
