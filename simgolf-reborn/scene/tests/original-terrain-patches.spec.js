import { createHash } from "node:crypto";
import { test, expect } from "@playwright/test";
import { originalTerrainPatches } from "../src/simulation/original-terrain-patches.js";
const setup = { slot: 0, environment: "parkland", tableIndex: 0, seed: 1 };
test("original terrain patches preserve environment codes and source table exception", () => {
  const normal = originalTerrainPatches(setup);
  // Independently calculated with a Python integer reference.
  expect(createHash("sha256").update(normal.terrain).digest("hex")).toBe("86b28eea847d8d60ee0b21f6e1174296c2f5ca10ef9be829097cf6e18174161e");
  expect(normal).toMatchObject({rngState:4287422715,draws:4110,totalWrites:1362,walks:12});
  expect(new Set(normal.terrain)).toEqual(new Set([4, 13, 14]));
  const pines = originalTerrainPatches({ ...setup, tableIndex: 9 });
  expect(new Set(pines.terrain)).toEqual(new Set([4, 14]));
  expect(pines.draws).toBe(normal.draws);
  expect(originalTerrainPatches({ ...setup, slot: 8 }).baseCode).toBe(5);
  expect(originalTerrainPatches({ ...setup, slot: 12 }).baseCode).toBe(11);
  expect(
    originalTerrainPatches({ ...setup, slot: 12, environment: "desert" })
      .baseCode,
  ).toBe(12);
  expect(
    originalTerrainPatches({ ...setup, slot: 12, originalFlags: 0x1000000 })
      .baseCode,
  ).toBe(4);
});
test("patch random walks replay every paint and preserve unrelated flag bits", () => {
  for (const environment of ["parkland", "desert", "tropical", "links"]) {
    const result = originalTerrainPatches({ ...setup, environment });
    expect(result).toEqual(originalTerrainPatches({ ...setup, environment }));
    expect(result.terrain).toHaveLength(2500);
    expect(result.walks).toBeLessThanOrEqual(16);
    expect(result.draws).toBe(2 * result.walks + 3 * result.totalWrites);
    for (let i = 0; i < 2500; i++) {
      expect(result.flagSetBits[i] & result.flagClearBits[i]).toBe(0);
      expect((result.flagSetBits[i] | result.flagClearBits[i]) & ~0x2100).toBe(
        0,
      );
    }
  }
  expect(() => originalTerrainPatches({ ...setup, tableIndex: 16 })).toThrow();
});
