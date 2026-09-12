import { test, expect } from "@playwright/test";
import { originalPropertyStage } from "../src/simulation/original-property-stage.js";
const setup = {
  slot: 0,
  seed: 1,
  noiseSeed: 1,
  difficulty: "Easy",
  terrainMemory: new Uint8Array(2600),
  initialFlags: new Uint16Array(2500),
};

test("all original property identities compose through the vertex-height pass", () => {
  const outputs = [];
  for (let tableIndex = 0; tableIndex < 16; tableIndex++) {
    const result = originalPropertyStage({ ...setup, tableIndex });
    expect(result.stage).toBe("before-scenery");
    expect(result.terrain).toHaveLength(2500);
    expect(result.heights).toHaveLength(2601);
    expect(result.heights.every((h) => h >= 3 && h <= 15)).toBe(true);
    expect(result.flags.every((f) => (f & 0x1000) === 0)).toBe(true);
    for (let i = 0; i < 51; i++) {
      expect(result.heights[50 * 51 + i]).toBe(3);
      expect(result.heights[i * 51 + 50]).toBe(3);
    }
    expect(originalPropertyStage({ ...setup, tableIndex })).toEqual(result);
    outputs.push(result);
  }
  expect(new Set(outputs.map((o) => o.originalId)).size).toBe(16);
  expect(outputs[6].riverPath).toHaveLength(0); // Island Palms.
  expect(outputs[0].riverPath.length).toBeGreaterThan(0);
  expect(setup.terrainMemory.every((v) => v === 0)).toBe(true);
  expect(setup.initialFlags.every((v) => v === 0)).toBe(true);
});

test("surrounding terrain bytes affect last-row height without guessed defaults", () => {
  const terrainMemory = new Uint8Array(2600);
  terrainMemory.fill(17, 2550);
  const result = originalPropertyStage({
    ...setup,
    tableIndex: 2,
    slot: 12,
    terrainMemory,
  });
  expect(result.heights.slice(49 * 51, 50 * 51).every((h) => h === 3)).toBe(
    true,
  );
  expect(() =>
    originalPropertyStage({
      ...setup,
      tableIndex: 0,
      terrainMemory: undefined,
    }),
  ).toThrow();
  expect(() => originalPropertyStage({ ...setup, tableIndex: 16 })).toThrow();
});
