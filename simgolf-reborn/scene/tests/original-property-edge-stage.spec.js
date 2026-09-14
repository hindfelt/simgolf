import { test, expect } from "@playwright/test";
import { originalPropertyEdgeStage } from "../src/simulation/original-property-edge-stage.js";
import { originalPropertyFeatureStage } from "../src/simulation/original-property-feature-stage.js";
import { originalSceneryFlags } from "../src/simulation/original-scenery-flags.js";
import { originalEdgeHeights } from "../src/simulation/original-edge-heights.js";
import catalog from "../src/content/original-properties.json" with { type: "json" };

const input = {
  slot: 0,
  seed: 1,
  noiseSeed: 1,
  terrainMemory: new Uint8Array(2601),
  initialFlags: new Uint16Array(2500),
};
test("all properties and difficulties continue through scatter and edge shaping", () => {
  for (const [code, difficulty] of [
    "Easy",
    "Moderate",
    "Difficult",
    "Impossible",
  ].entries()) {
    for (let tableIndex = 0; tableIndex < 16; tableIndex++) {
      const options = { ...input, tableIndex, difficulty };
      const result = originalPropertyEdgeStage(options);
      const previous = originalPropertyFeatureStage(options);
      const scatter = originalSceneryFlags({
        terrain: previous.terrain,
        flags: previous.flags,
        seed: previous.rngState,
        difficulty,
        environment: catalog.properties[tableIndex].environment,
      });
      const edges = originalEdgeHeights({
        heights: previous.heights,
        seed: scatter.rngState,
        readTerrain: (r, c) => previous.terrainMemory[50 + r * 50 + c],
      });
      expect(result.stage).toBe("before-placement");
      expect(result.flags).toEqual(scatter.flags);
      expect(result.heights).toEqual(edges.heights);
      expect(result.rngState).toBe(edges.rngState);
      expect(result.draws).toBe(previous.draws + scatter.draws + edges.draws);
      expect(result.scatterSelections).toHaveLength((4 - code) * 9);
      expect(result.terrain).toEqual(previous.terrain);
      expect(result.terrainMemory.slice(50, 2550)).toEqual(result.terrain);
      expect(result.heights.every((h) => h >= 3 && h <= 16)).toBe(true);
    }
  }
  expect(input.terrainMemory.every((v) => v === 0)).toBe(true);
  expect(input.initialFlags.every((v) => v === 0)).toBe(true);
});
test("explicit padding survives the pipeline and missing final byte is rejected", () => {
  const options = { ...input, tableIndex: 0, difficulty: "Easy" };
  expect(() =>
    originalPropertyEdgeStage({
      ...options,
      terrainMemory: new Uint8Array(2600),
    }),
  ).toThrow(/51 trailing/);
  const memory = input.terrainMemory.slice();
  memory[2600] = 18;
  const first = originalPropertyEdgeStage({
    ...options,
    terrainMemory: memory,
  });
  expect(first.terrainMemory[2600]).toBe(18);
  expect(
    originalPropertyEdgeStage({ ...options, terrainMemory: memory }),
  ).toEqual(first);
});
