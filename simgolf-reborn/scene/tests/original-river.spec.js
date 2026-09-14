import { test, expect } from "@playwright/test";
import { originalRiver } from "../src/simulation/original-river.js";
import { createOriginalElevationNoise } from "../src/simulation/original-elevation.js";

function fixture(overrides = {}) {
  const terrain = new Map(),
    flags = new Map();
  const index = (r, c) => r * 50 + c;
  const input = {
    geography: "inland",
    environment: "parkland",
    seed: 1,
    noise: { sample: () => 0 },
    readTerrain: (r, c) => terrain.get(index(r, c)) ?? 4,
    writeTerrain: (r, c, v) => terrain.set(index(r, c), v),
    updateFlags: (r, c, set, clear) =>
      flags.set(
        index(r, c),
        ((flags.get(index(r, c)) ?? 0xffff) & ~clear) | set,
      ),
    height: () => 3,
    ...overrides,
  };
  return { input, terrain, flags };
}
test("river ties choose the first neighbor and islands consume no draws", () => {
  const f = fixture();
  const result = originalRiver(f.input);
  expect(result.path[0]).toEqual({ row: 24, column: 49 });
  expect(result.path).toHaveLength(25);
  expect(result.path.at(-1)).toEqual({ row: 0, column: 49 });
  expect(result.draws).toBe(51);
  expect(f.terrain.get(24 * 50 + 49)).toBe(17);
  const island = fixture({ geography: "island" });
  expect(originalRiver(island.input)).toEqual({
    path: [],
    rngState: 1,
    draws: 0,
  });
  expect(island.terrain.size).toBe(0);
});
test("river direction reversals advance a column instead of revisiting the previous tile", () => {
  const f = fixture({ noise: { sample: (x) => Math.abs(x - 24 * 128) } });
  const result = originalRiver(f.input);
  expect(result.path.slice(0, 3)).toEqual([
    { row: 24, column: 49 },
    { row: 24, column: 48 },
    { row: 24, column: 47 },
  ]);
  expect(result.path).toHaveLength(50);
  expect(result.draws).toBe(101);
});
test("desert channels use original dry terrain codes with explicit boundary memory", () => {
  const f = fixture({ environment: "desert" });
  originalRiver(f.input);
  expect(f.terrain.get(24 * 50 + 49)).toBe(11);
  expect([...f.terrain.values()]).toContain(10);
  expect([...f.flags.values()].every((v) => (v & 0x1000) !== 0)).toBe(true);
  const noise = createOriginalElevationNoise(1);
  expect(Number.isInteger(noise.sample(-128, 0))).toBe(true);
  expect(() => noise.sample(-256, 0)).toThrow();
});

test("river runs against reconstructed noise and avoids immediate backtracking",()=>{
 const make=()=>fixture({noise:createOriginalElevationNoise(1)});
 const a=make(),b=make();
 const first=originalRiver(a.input),second=originalRiver(b.input);
 expect(first).toEqual(second);
 expect(first.path.length).toBeGreaterThan(1);
 expect(first.draws).toBe(1+2*first.path.length);
 for(let i=2;i<first.path.length;i++)expect(first.path[i]).not.toEqual(first.path[i-2]);
});
