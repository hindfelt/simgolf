import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import catalog from "../src/content/original-terrain-metadata.json" with { type: "json" };
import { originalTerrainMetadata } from "../src/simulation/original-terrain-metadata.js";
import { originalPlacementCheck } from "../src/simulation/original-placement-check.js";

test("extracted terrain records match the supplied executable byte for byte", () => {
  const bytes = readFileSync(
    new URL(
      "../../../resources/sim golf/Sid Meier's SimGolf/golf.exe",
      import.meta.url,
    ),
  );
  expect(catalog.terrain).toHaveLength(23);
  for (const entry of catalog.terrain) {
    const raw = bytes.subarray(
      0xc0a38 + entry.code * 48,
      0xc0a38 + (entry.code + 1) * 48,
    );
    expect(entry.rawMetadata).toEqual(Array.from(raw.subarray(32)));
    expect(entry.clearanceCost).toBe(raw.readInt8(36));
    expect(entry.category).toBe(raw.readInt8(38));
    expect(originalTerrainMetadata(entry.code).kind).toBe(raw.readInt8(38));
    expect(originalTerrainMetadata(entry.code).shotClass).toBe(raw.readInt8(34));
    expect(entry.name).toBe(raw.subarray(0, raw.indexOf(0)).toString("ascii"));
  }
  expect(() => originalTerrainMetadata(23)).toThrow(/Unknown/);
});
test("original clearance values drive building checks", () => {
  for (const [code, cost] of [
    [4, 0],
    [12, 5],
    [13, 5],
    [16, 10],
    [17, 10],
    [18, 50],
    [19, 100],
  ]) {
    const result = originalPlacementCheck({
      row: 20,
      column: 20,
      size: 4,
      type: 15,
      readTerrain: (r, c) =>
        r >= 20 && r < 24 && c >= 20 && c < 24 ? code : 4,
      readFlags: () => 0,
      existingType: () => -1,
      terrainMetadata: originalTerrainMetadata,
    });
    expect(result).toBe(cost * 16);
  }
  expect(originalTerrainMetadata(18).name).toBe("wetlands");
});
