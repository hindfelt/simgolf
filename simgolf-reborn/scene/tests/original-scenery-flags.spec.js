import { test, expect } from "@playwright/test";
import { originalSceneryFlags } from "../src/simulation/original-scenery-flags.js";
import { originalPropertyFeatureStage } from "../src/simulation/original-property-feature-stage.js";
const base = {
  terrain: new Uint8Array(2500).fill(12),
  flags: new Uint16Array(2500),
  seed: 1,
  environment: "parkland",
};
test("difficulty controls accepted selections and duplicates retain original RNG order", () => {
  for (const [difficulty, count] of [
    ["Easy", 36],
    ["Moderate", 27],
    ["Difficult", 18],
    ["Impossible", 9],
  ]) {
    const result = originalSceneryFlags({ ...base, difficulty });
    expect(result.selections).toHaveLength(count);
    expect(result.draws).toBe(count * 2);
    expect(result.selections[0]).toEqual({ row: 25, column: 10 });
  }
  const terrain = new Uint8Array(2500).fill(20);
  terrain[25 * 50 + 10] = 12;
  const only = originalSceneryFlags({
    ...base,
    terrain,
    difficulty: "Impossible",
  });
  expect(only.selections).toHaveLength(9);
  expect(only.flags.filter((v) => v === 0x100)).toHaveLength(1);
  expect(base.flags.every((v) => v === 0)).toBe(true);
});
test("scatter excludes original terrain codes and works after feature composition", () => {
  for (const code of [20, 21, 22, 4, 18, 10]) {
    expect(() =>
      originalSceneryFlags({
        ...base,
        terrain: new Uint8Array(2500).fill(code),
        difficulty: "Easy",
      }),
    ).toThrow(/eligible/);
  }
  const stage = originalPropertyFeatureStage({
    slot: 0,
    seed: 1,
    noiseSeed: 1,
    tableIndex: 0,
    difficulty: "Easy",
    terrainMemory: new Uint8Array(2600),
    initialFlags: new Uint16Array(2500),
  });
  const result = originalSceneryFlags({
    ...base,
    terrain: stage.terrain,
    flags: stage.flags,
    seed: stage.rngState,
    difficulty: "Easy",
  });
  expect(result.selections).toHaveLength(36);
  expect(result.draws).toBe(result.attempts * 2);
  expect(
    result.selections.every(
      (p) => p.row >= 2 && p.row <= 47 && p.column >= 2 && p.column <= 47,
    ),
  ).toBe(true);
});
