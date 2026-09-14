import { test, expect } from "@playwright/test";
import { originalPropertyClubhouseStage } from "../src/simulation/original-property-clubhouse-stage.js";
import { originalTerrainMetadata } from "../src/simulation/original-terrain-metadata.js";
import { createOriginalStoredHeight } from "../src/simulation/original-stored-height.js";
const setup = () => ({
  records: new Uint8Array(4096).fill(255),
  ownership: new Uint8Array(2500).fill(255),
  tileMetadata: new Uint8Array(2500),
  sizeExtension: 0,
  rotationByte: 0,
  buildingMetadataByte: 4,
  metadata: originalTerrainMetadata,
  existingType: () => -1,
  createHeightReader: createOriginalStoredHeight,
});
test("all properties compose terrain and clubhouse placement before their bonus stage", () => {
  const placement = setup();
  for (const difficulty of ["Easy", "Moderate", "Difficult", "Impossible"])
    for (let tableIndex = 0; tableIndex < 16; tableIndex++) {
      const result = originalPropertyClubhouseStage(
        {
          tableIndex,
          slot: tableIndex,
          seed: 1,
          noiseSeed: 1,
          difficulty,
          terrainMemory: new Uint8Array(2601),
          initialFlags: new Uint16Array(2500),
        },
        placement,
      );
      const { row, column, index } = result.clubhouse,
        tile = row * 50 + column;
      expect(result.stage).toBe("before-property-bonuses");
      expect(index).toBe(0);
      expect(result.terrain[tile]).toBe(22);
      expect(result.flags[tile] & 0x20).toBe(0);
      expect(result.records[7] & 0x40).toBe(0x40);
      expect(result.ownership.filter((v) => v === 0)).toHaveLength(16);
      expect(result.terrainMemory.slice(50, 2550)).toEqual(result.terrain);
      expect(result.derivedMap.edgeMasks).toHaveLength(2500);
      expect(result.needsMapRebuild).toBe(false);
    }
  expect(placement.records.every((v) => v === 255)).toBe(true);
});
