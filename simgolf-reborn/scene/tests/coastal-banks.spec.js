import { test, expect } from "@playwright/test";
import { coastalBanks } from "../src/rendering/coastal-style.js";
import { createGame, serialize } from "../src/simulation/game.js";
import { key } from "../src/simulation/world.js";

test("raised island preview renders without browser errors", async ({
  page,
}) => {
  const g = createGame(1234, "coast", "links");
  for (let r = 11; r <= 19; r++)
    for (let c = 36; c <= 42; c++)
      if (g.tiles[key(c, r)]?.type !== "water") g.elevation[key(c, r)] = 2;
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(
    (save) => localStorage.setItem("simgolf-reborn.course.v1", save),
    serialize(g),
  );
  await page.goto("/");
  await page.locator("#loading").waitFor({ state: "hidden" });
  await page.screenshot({ path: "/tmp/simgolf-raised-coast.png" });
  expect(errors).toEqual([]);
});

test("raised coastal banks grow rock faces and lowering restores the original bank", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#loading").waitFor({ state: "hidden" });
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/three/build/three.module.js");
    const { buildOcean } = await import("/src/rendering/ocean.js");
    const { key } = await import("/src/simulation/world.js");
    const g = {
      landscapeStyle: "coast",
      tiles: { [key(20, 20)]: { type: "water" } },
      elevation: {},
      bridges: {},
      revision: 0,
    };
    const scene = new THREE.Scene();
    const ocean = buildOcean(scene);
    ocean.update(g);
    const mesh = scene.getObjectByName("coastal-stone-banks");
    const matrix = new THREE.Matrix4();
    const read = () => {
      mesh.getMatrixAt(1, matrix);
      return { y: matrix.elements[13], height: matrix.elements[5] };
    };
    const before = read();
    g.elevation[key(21, 20)] = 4;
    g.revision++;
    ocean.update(g);
    const raised = read();
    delete g.elevation[key(21, 20)];
    g.revision++;
    ocean.update(g);
    return { before, raised, lowered: read() };
  });
  expect(result.raised.height).toBeGreaterThan(result.before.height + 0.5);
  expect(result.raised.y).toBeGreaterThan(result.before.y + 0.5);
  expect(result.lowered).toEqual(result.before);
});

test("stone banks follow edited islands and leave bridge crossings unobstructed", () => {
  const grid = { width: 3, height: 3 };
  const g = { landscapeStyle: "coast", tiles: {}, bridges: {} };
  for (let id = 0; id < 9; id++) if (id !== 4) g.tiles[id] = { type: "water" };
  expect(coastalBanks(g, grid)).toHaveLength(4);
  g.bridges[1] = true;
  expect(coastalBanks(g, grid)).toHaveLength(3);
  g.tiles[4] = { type: "water" };
  expect(coastalBanks(g, grid)).toEqual([]);
  delete g.tiles[4];
  g.landscapeStyle = "river";
  expect(coastalBanks(g, grid)).toEqual([]);
});

test("coastal conifer crowns move with land and disappear with their scenery tree", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#loading").waitFor({ state: "hidden" });
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/three/build/three.module.js");
    const { buildFlora } = await import("/src/flora.js");
    const { createGame } = await import("/src/simulation/game.js");
    const { setLandscapeState } = await import("/src/landscape.js");
    const { inBounds, key, GRID } = await import("/src/simulation/world.js");
    const g = createGame(1234, "coast");
    setLandscapeState(g);
    const scene = new THREE.Scene();
    const flora = buildFlora(scene, { editableWater: true, coastal: true });
    flora.update(g);
    const crown = scene.getObjectByName("coastal-conifers");
    const index = crown.userData.transforms.findIndex(({ tree }) =>
      inBounds(
        Math.floor((tree.x - GRID.minX) / 2),
        Math.floor((tree.z - GRID.minZ) / 2),
      ),
    );
    const tree = crown.userData.transforms[index].tree;
    const c = Math.floor((tree.x - GRID.minX) / 2),
      r = Math.floor((tree.z - GRID.minZ) / 2);
    const matrix = new THREE.Matrix4();
    crown.getMatrixAt(index, matrix);
    const before = matrix.elements[13];
    // Lift the surrounding patch uniformly to verify terrain-following at an
    // arbitrary non-centred scenery position, not just the tile centre.
    for (let dc = -1; dc <= 1; dc++)
      for (let dr = -1; dr <= 1; dr++) g.elevation[key(c + dc, r + dr)] = 1;
    g.revision++;
    flora.update(g);
    crown.getMatrixAt(index, matrix);
    const rise = matrix.elements[13] - before;
    (g.removedTrees ??= {})[tree.k] = true;
    g.revision++;
    flora.update(g);
    crown.getMatrixAt(index, matrix);
    return { count: crown.count, rise, determinant: matrix.determinant() };
  });
  expect(result.count).toBeGreaterThan(0);
  expect(result.rise).toBeCloseTo(1, 4);
  expect(result.determinant).toBe(0);
});
