import { test, expect } from "@playwright/test";
import { coastalBanks } from "../src/rendering/coastal-style.js";

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
