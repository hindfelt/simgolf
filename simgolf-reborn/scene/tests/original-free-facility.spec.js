import { test, expect } from "@playwright/test";
import { originalFreeFacility } from "../src/simulation/original-free-facility.js";
import { originalTerrainMetadata } from "../src/simulation/original-terrain-metadata.js";
import { createOriginalStoredHeight } from "../src/simulation/original-stored-height.js";
import { originalPropertyClubhouseStage } from "../src/simulation/original-property-clubhouse-stage.js";
const input = () => ({
  connectionOptions: {
    flagMemory: new Uint16Array(2601),
    difficulty: "Moderate",
  },
  clubhouse: { row: 20, column: 20 },
  state: {
    terrain: new Uint8Array(2500).fill(4),
    terrainMemory: new Uint8Array(2601),
    heights: new Uint8Array(2601).fill(8),
    flags: new Uint16Array(2500),
    ownership: new Uint8Array(2500).fill(255),
    tileMetadata: new Uint8Array(2500),
    records: new Uint8Array(4096).fill(255),
    originalFlags: 0,
    rngState: 1,
    draws: 100,
  },
  placementOptions: {
    sizeExtensions: new Int32Array(16),
    environmentCode: 0,
    buildingMetadataByte: 4,
    rotationByte: 0,
    metadata: originalTerrainMetadata,
    createHeightReader: createOriginalStoredHeight,
  },
});
test("five property branches place original facility types alongside clubhouse", () => {
  for (const [tableIndex, type] of [
    [9, 6],
    [14, 8],
    [2, 13],
    [11, 14],
    [4, 9],
  ]) {
    const options = input(),
      result = originalFreeFacility({ ...options, tableIndex });
    expect(result.freeFacility).toEqual({
      type,
      row: 19,
      column: 24,
      index: 0,
    });
    expect(result.draws).toBe(100);
    expect(result.rngState).toBe(1);
    for (const c of [22, 23, 24])
      expect(result.flags[1000 + c] & 0x20).toBe(0x20);
    expect(result.terrainMemory.slice(50, 2550)).toEqual(result.terrain);
    expect(options.state.terrain.every((v) => v === 4)).toBe(true);
  }
});
test("terrain20 on the right chooses the original left-hand placement", () => {
  const options = input();
  options.state.terrain[1025] = 20;
  const result = originalFreeFacility({ ...options, tableIndex: 9 });
  expect(result.freeFacility.column).toBe(15);
  for (const c of [17, 18, 19])
    expect(result.flags[1000 + c] & 0x20).toBe(0x20);
  expect(result.needsConnectionUpdate).toBe(false);
  expect(() => originalFreeFacility({ ...options, tableIndex: 0 })).toThrow(
    /branch/,
  );
});

test("generated clubhouse and bonus facility share the original connected network", () => {
  for (const tableIndex of [9, 14, 2, 11, 4]) {
    const fixture = input();
    const state = originalPropertyClubhouseStage(
      {
        tableIndex,
        slot: 0,
        seed: 1,
        noiseSeed: 1,
        difficulty: "Moderate",
        terrainMemory: new Uint8Array(2601),
        initialFlags: new Uint16Array(2500),
      },
      {
        ...fixture.state,
        ...fixture.placementOptions,
        sizeExtension: 0,
        existingType: () => -1,
      },
    );
    const result = originalFreeFacility({
      ...fixture,
      tableIndex,
      state,
      clubhouse: state.clubhouse,
    });
    expect(result.freeFacility.index).toBe(1);
    expect(result.records[7] & 0x40).toBe(0x40);
    expect(result.records[23] & 0x40).toBe(0x40);
    expect(result.needsConnectionUpdate).toBe(false);
    expect(result.flagMemory.slice(50, 2550)).toEqual(result.flags);
  }
});
