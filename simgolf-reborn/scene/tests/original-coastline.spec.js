import {createHash} from "node:crypto";
import { test, expect } from "@playwright/test";
import { originalCoastline } from "../src/simulation/original-coastline.js";

test("coastline retains its border and consumes edge draws only when painting new water", () => {
  const terrain = new Uint8Array(2500).fill(4),
    flags = new Uint16Array(2500).fill(0xffff);
  const result = originalCoastline({ terrain, flags, seed: 1 });
  expect(result.draws).toBe(100);
  // Independent Python integer reconstruction.
  expect(result).toMatchObject({rngState:3885567453,visited:271,nextWidth:6});
  expect(createHash("sha256").update(result.terrain).digest("hex")).toBe("7fb4c0c033f523066415379a3c9da18bc34beadf254f15ad80f5ff76831912f1");
  expect(result.widths[0]).toBe(5);
  for (let row = 0; row < 50; row++) {
    expect(result.terrain[row * 50]).toBe(20);
    expect(result.terrain[row * 50 + 1]).toBe(17);
    expect(result.terrain[row * 50 + result.widths[row]]).toBe(4);
  }
  expect(terrain.every((v) => v === 4)).toBe(true);
  expect(flags.every((v) => v === 0xffff)).toBe(true);
  expect(result.flags.every((v) => (v & ~0x100) === (0xffff & ~0x100))).toBe(
    true,
  );
  const existing = originalCoastline({
    terrain: new Uint8Array(2500).fill(17),
    flags,
    seed: 1,
  });
  expect(existing.draws).toBe(50);
  expect(existing.flags).toEqual(flags);
  expect(existing.terrain[0]).toBe(20);
});

test("coastline width soft correction and RNG continuation are deterministic", () => {
  const args = {
    terrain: new Uint8Array(2500),
    flags: new Uint16Array(2500),
    seed: 1,
  };
  expect(originalCoastline(args)).toEqual(originalCoastline(args));
  let foundBeyond12 = false;
  for (let seed = 0; seed < 64; seed++) {
    const result = originalCoastline({ ...args, seed });
    foundBeyond12 ||= result.widths.some((w) => w > 12);
    expect(result.widths.every((w) => w >= 2 && w <= 50)).toBe(true);
  }
  expect(foundBeyond12).toBe(true);
  expect(() =>
    originalCoastline({ ...args, terrain: new Uint8Array(2499) }),
  ).toThrow();
});
