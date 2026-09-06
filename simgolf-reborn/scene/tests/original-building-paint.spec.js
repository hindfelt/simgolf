import { test, expect } from "@playwright/test";
import { originalBuildingPaint } from "../src/simulation/original-building-paint.js";
import { originalBuildingRegistration } from "../src/simulation/original-building-registration.js";
const make = () => ({
  row: 20,
  column: 20,
  type: 15,
  baseSize: 4,
  sizeExtension: 0,
  placementFlags: 0x60,
  environmentCode: 0,
  buildingMetadataByte: 4,
  seed: 1,
  terrain: new Uint8Array(2500).fill(4),
  heights: Uint8Array.from({ length: 2601 }, (_, i) => (i % 13) + 3),
  flags: new Uint16Array(2500).fill(0xffff),
  ownership: new Uint8Array(2500).fill(9),
  tileMetadata: new Uint8Array(2500),
});
test("painting flattens original vertices, resets ownership and composes with registration", () => {
  const input = make(),
    paint = originalBuildingPaint(input),
    origin = 20 * 51 + 20;
  expect(paint.terrain.filter((v) => v === 22)).toHaveLength(16);
  expect(paint.heights[origin + 3]).toBe(input.heights[origin + 3]);
  expect(paint.heights[origin + 51 + 3]).toBe(input.heights[origin]);
  expect(paint.flags[1020]).toBe(0xecff);
  expect(paint.tileMetadata[1020]).toBe(4);
  expect(paint.ownership[1020]).toBe(255);
  expect(paint.anchor).toEqual({ row: 21, column: 21 });
  const records = new Uint8Array(4096).fill(255);
  const registered = originalBuildingRegistration({
    ...input,
    ...paint,
    records,
    rotationByte: 0,
  });
  expect(registered.ownership.filter((v) => v === 0)).toHaveLength(16);
  expect(registered.flags[1020] & 0x400).toBe(0x400);
  expect(input.terrain.every((v) => v === 4)).toBe(true);
});
test("special type patterns and negative flags retain footprint rules", () => {
  for (const [type, code] of [
    [5, 21],
    [6, 1],
    [12, 17],
  ]) {
    const result = originalBuildingPaint({ ...make(), type });
    expect(result.terrain[1021]).toBe(code);
    expect(result.terrain[1020]).toBe(type === 5 ? 21 : 22);
  }
  expect(
    originalBuildingPaint({ ...make(), placementFlags: -2, sizeExtension: 1 })
      .size,
  ).toBe(6);
  expect(
    originalBuildingPaint({ ...make(), type: 5, sizeExtension: 2 }).size,
  ).toBe(4);
  const special = originalBuildingPaint({ ...make(), type: 10, baseSize: 5 });
  expect(special.draws).toBe(8);
  expect(special.terrain[24 * 50 + 21]).toBe(5);
  expect(special.terrain.filter((v) => v === 7)).toHaveLength(1);
  expect(originalBuildingPaint({ ...make(), type: 10, baseSize: 5 })).toEqual(
    special,
  );
});
