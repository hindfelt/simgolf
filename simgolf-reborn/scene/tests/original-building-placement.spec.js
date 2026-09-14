import { test, expect } from "@playwright/test";
import { originalBuildingPlacement } from "../src/simulation/original-building-placement.js";
import { createOriginalStoredHeight } from "../src/simulation/original-stored-height.js";
import { originalTerrainMetadata } from "../src/simulation/original-terrain-metadata.js";
const input = () => ({
  row: 20,
  column: 20,
  type: 15,
  baseSize: 4,
  sizeExtension: 0,
  placementFlags: 0x60,
  environmentCode: 0,
  buildingMetadataByte: 4,
  seed: 1,
  rotationByte: 2,
  originalFlags: 0x40000,
  terrain: new Uint8Array(2500).fill(4),
  heights: new Uint8Array(2601).fill(8),
  flags: new Uint16Array(2500),
  ownership: new Uint8Array(2500).fill(255),
  tileMetadata: new Uint8Array(2500),
  records: new Uint8Array(4096).fill(255),
  metadata: originalTerrainMetadata,
  createHeightReader: createOriginalStoredHeight,
});
test("placement paints and registers before rebuilding against the resulting map", () => {
  const options = input();
  options.heights[20 * 51 + 23] = 12;
  const result = originalBuildingPlacement(options);
  expect(result.index).toBe(0);
  expect(result.terrain[1020]).toBe(22);
  expect(result.ownership[1020]).toBe(0);
  expect(result.flags[1020]).toBe(0x470);
  expect(result.derivedMap.surfaceHeights[1020]).toBe(12);
  expect(result.derivedMap.surfaceHeights[1023]).toBe(12);
  expect(result.needsMapRebuild).toBe(false);
  expect(result.originalFlags).toBe(0);
  expect(result.anchor).toEqual({ row: 21, column: 21 });
  expect(result.draws).toBe(0);
  expect(options.terrain[1020]).toBe(4);
  expect(options.records.every((v) => v === 255)).toBe(true);
});
test("negative placement flags paint without registration or derived-map recalculation", () => {
  const options = {
    ...input(),
    placementFlags: -2,
    createHeightReader: () => {
      throw Error("Unexpected recalculation");
    },
  };
  const result = originalBuildingPlacement(options);
  expect(result.size).toBe(5);
  expect(result.terrain.filter((v) => v === 22)).toHaveLength(25);
  expect(result.index).toBe(null);
  expect(result.derivedMap).toBe(null);
  expect(result.originalFlags).toBe(0x40000);
  expect(result.records).toEqual(options.records);
});
