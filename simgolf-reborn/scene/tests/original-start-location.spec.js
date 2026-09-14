import { test, expect } from "@playwright/test";
import { originalStartLocation } from "../src/simulation/original-start-location.js";
import { originalTerrainMetadata } from "../src/simulation/original-terrain-metadata.js";
import { originalPropertyEdgeStage } from "../src/simulation/original-property-edge-stage.js";
const base = {
  terrain: new Uint8Array(2500).fill(4),
  flags: new Uint16Array(2500),
  baseCode: 4,
  seed: 1,
  terrainMetadata: originalTerrainMetadata,
  existingType: () => -1,
};
test("starting selection consumes two draws per attempt and retries invalid footprints", () => {
  const first = originalStartLocation(base);
  expect([first.row, first.column, first.draws, first.clearanceCost]).toEqual([
    23, 17, 2, 0,
  ]);
  const flags = base.flags.slice();
  flags[first.row * 50 + first.column] = 0x8000;
  const retry = originalStartLocation({ ...base, flags });
  expect(retry.attempts).toBeGreaterThan(1);
  expect(retry.draws).toBe(retry.attempts * 2);
  expect([retry.row, retry.column]).not.toEqual([first.row, first.column]);
  expect(originalStartLocation({ ...base, flags })).toEqual(retry);
  expect(base.terrain.every((v) => v === 4)).toBe(true);
});
test("all generated property identities can select their original starting footprint", () => {
  for (const difficulty of ["Easy", "Moderate", "Difficult", "Impossible"]) {
    for (let tableIndex = 0; tableIndex < 16; tableIndex++) {
      const stage = originalPropertyEdgeStage({
        tableIndex,
        slot: tableIndex,
        seed: 1,
        noiseSeed: 1,
        difficulty,
        terrainMemory: new Uint8Array(2601),
        initialFlags: new Uint16Array(2500),
      });
      const location = originalStartLocation({
        ...base,
        terrain: stage.terrain,
        flags: stage.flags,
        baseCode: stage.baseCode,
        seed: stage.rngState,
      });
      expect(stage.terrain[location.row * 50 + location.column]).toBe(
        stage.baseCode,
      );
      expect(location.row).toBeGreaterThanOrEqual(15);
      expect(location.row).toBeLessThanOrEqual(31);
      expect(location.column).toBeGreaterThanOrEqual(15);
      expect(location.column).toBeLessThanOrEqual(31);
      expect(location.clearanceCost).toBeGreaterThanOrEqual(0);
    }
  }
});
