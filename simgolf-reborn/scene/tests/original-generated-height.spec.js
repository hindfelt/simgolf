import { test, expect } from "@playwright/test";
import { createOriginalGeneratedHeight } from "../src/simulation/original-generated-height.js";
import { createOriginalElevationNoise } from "../src/simulation/original-elevation.js";
const base = {
  slot: 12,
  relief: "hilly",
  environment: "parkland",
  originalMinimumHeightFlag: false,
};
const cell = { row: 20, column: 20, terrainCode: 0, nextRowTerrainCode: 0 };

test("generated elevations clamp noise and honor original terrain overrides", () => {
  const high = createOriginalGeneratedHeight({
    ...base,
    noise: { sample: () => 512 },
  });
  expect(high(cell)).toBe(15);
  for (const terrainCode of [17, 18, 19])
    expect(high({ ...cell, terrainCode })).toBe(3);
  expect(high({ ...cell, nextRowTerrainCode: 17 })).toBe(3);
  expect(high({ ...cell, row: 50 })).toBe(3);
  expect(
    createOriginalGeneratedHeight({
      ...base,
      noise: { sample: () => 0 },
      originalMinimumHeightFlag: true,
    })(cell),
  ).toBe(4);
  expect(
    createOriginalGeneratedHeight({
      ...base,
      noise: { sample: () => 512 },
      originalFlags: 1,
    })(cell),
  ).toBe(3);
});

test("desert adjustment uses signed division by six before height division", () => {
  const make = (environment) =>
    createOriginalGeneratedHeight({
      ...base,
      environment,
      noise: { sample: () => 120 },
    });
  const desert = make("desert"),
    park = make("parkland");
  expect(park({ ...cell, column: 0 })).toBe(11);
  expect(desert({ ...cell, column: 0 })).toBe(8);
  expect(desert({ ...cell, column: 15 })).toBe(10);
  expect(desert({ ...cell, column: 16 })).toBe(11);
});

test("complete generated sample maps are deterministic and distinguish relief", () => {
  const noise = createOriginalElevationNoise(1);
  const maps = ["flat", "rolling", "hilly"].map((relief) => {
    const height = createOriginalGeneratedHeight({ ...base, relief, noise });
    return Array.from({ length: 2500 }, (_, i) =>
      height({ ...cell, row: Math.floor(i / 50), column: i % 50 }),
    );
  });
  expect(maps[0]).not.toEqual(maps[1]);
  expect(maps[1]).not.toEqual(maps[2]);
  expect(maps.flat().every((v) => v >= 3 && v <= 15)).toBe(true);
  const again = createOriginalGeneratedHeight({
    ...base,
    relief: "hilly",
    noise: createOriginalElevationNoise(1),
  });
  expect(
    Array.from({ length: 2500 }, (_, i) =>
      again({ ...cell, row: Math.floor(i / 50), column: i % 50 }),
    ),
  ).toEqual(maps[2]);
  expect(() =>
    createOriginalGeneratedHeight({
      ...base,
      noise,
      originalMinimumHeightFlag: undefined,
    }),
  ).toThrow();
});
