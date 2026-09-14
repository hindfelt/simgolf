import { test, expect } from "@playwright/test";
import {
  createOriginalWorldOffers,
  ORIGINAL_SLOT_COSTS,
} from "../src/simulation/world-offers.js";

test("original world setup preserves draw order, rejections and final RNG state", () => {
  // Independently calculated with Python integer arithmetic from the decoded routine.
  const world = createOriginalWorldOffers(1);
  expect(world.offers.map((o) => o.tableIndex)).toEqual([
    1, 6, 5, 12, 10, 13, 2, 14, 9, 3, 7, 0, 8, 4, 15, 11,
  ]);
  expect(world.rngState).toBe(2207819405);
  expect(world.draws).toBe(52);
  expect(world.offers.map((o) => o.acres)).toEqual([
    40, 40, 60, 60, 100, 90, 120, 110, 140, 150, 140, 150, 180, 190, 200, 190,
  ]);
  expect(world.offers.map((o) => o.costUnits)).toEqual(ORIGINAL_SLOT_COSTS);
  // Table index 1 identifies Dolphin Coast, whose original ID is 4.
  expect(world.offers[0]).toMatchObject({ tableIndex: 1, originalId: 4 });
});

test("world seeds retain every property once and constrained starting/final slots", () => {
  for (const seed of [
    0,
    0xffffffff,
    ...Array.from({ length: 256 }, (_, i) => i),
  ]) {
    const world = createOriginalWorldOffers(seed);
    expect(new Set(world.offers.map((o) => o.originalId)).size).toBe(16);
    expect(world.offers[0].groupCode).toBe(0);
    expect(new Set(world.offers.slice(12).map((o) => o.groupCode)).size).toBe(
      4,
    );
    expect(createOriginalWorldOffers(seed)).toEqual(world);
  }
});

test("original acreage override preserves property shuffle and rejects lossy seeds", () => {
  const normal = createOriginalWorldOffers(1);
  const override = createOriginalWorldOffers(1, { originalFlags: 0x1000000 });
  expect(override.offers.every((o) => o.acres === 250)).toBe(true);
  expect(override.offers.map((o) => o.tableIndex)).toEqual(
    normal.offers.map((o) => o.tableIndex),
  );
  expect(override.rngState).toBe(normal.rngState);
  for (const value of [-1, 2 ** 32, 1.5, NaN, "1", undefined]) {
    expect(() => createOriginalWorldOffers(value)).toThrow();
    expect(() =>
      createOriginalWorldOffers(1, {
        originalFlags: value === undefined ? null : value,
      }),
    ).toThrow();
  }
});

test("original display prices and terrain labels follow assigned properties", () => {
  const world = createOriginalWorldOffers(1);
  expect(world.offers.map((o) => o.priceSimoleons)).toEqual([
    50000, 60000, 70000, 80000, 120000, 150000, 200000, 250000, 300000, 400000,
    500000, 600000, 700000, 800000, 900000, 1000000,
  ]);
  expect(world.offers[0]).toMatchObject({
    environment: "parkland",
    geography: "coastal",
    relief: "flat",
  });
  expect(world.offers.find((o) => o.originalId === 14)).toMatchObject({
    environment: "links",
    geography: "inland",
    relief: "hilly",
  });
});
