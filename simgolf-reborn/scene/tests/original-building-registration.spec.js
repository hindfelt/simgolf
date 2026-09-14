import { test, expect } from "@playwright/test";
import { originalBuildingRegistration } from "../src/simulation/original-building-registration.js";
const make = () => {
  const records = new Uint8Array(4096).fill(0xaa);
  const view = new DataView(records.buffer);
  for (let i = 0; i < 256; i++) view.setInt16(i * 16, -1, true);
  return {
    row: 20,
    column: 20,
    type: 15,
    baseSize: 4,
    sizeExtension: 0,
    placementFlags: 0x60,
    rotationByte: 7,
    records,
    flags: new Uint16Array(2500).fill(0x160),
    ownership: new Uint8Array(2500).fill(255),
  };
};
test("registration writes first free record and preserves original type-index byte clear", () => {
  const input = make(),
    result = originalBuildingRegistration(input);
  const view = new DataView(result.records.buffer);
  expect(result.index).toBe(0);
  expect([0, 2, 4].map((o) => view.getInt16(o, true))).toEqual([15, 20, 20]);
  expect(view.getUint8(6)).toBe(3);
  expect(view.getUint8(7)).toBe(0xaa);
  expect(view.getUint8(15 * 16 + 7)).toBe(0);
  expect(view.getUint32(8, true)).toBe(0);
  expect(view.getUint32(12, true)).toBe(0);
  expect(result.flags[20 * 50 + 20]).toBe(0x470);
  expect(result.ownership.filter((v) => v === 0)).toHaveLength(16);
  expect(result.flags[19 * 50 + 20]).toBe(0x160);
  expect(input.ownership.every((v) => v === 255)).toBe(true);
  expect(input.records[15 * 16 + 7]).toBe(0xaa);
});
test("slot reuse, footprint extension and skipped registration retain original ordering", () => {
  const input = make(),
    view = new DataView(input.records.buffer);
  view.setInt16(0, 6, true);
  const result = originalBuildingRegistration({ ...input, sizeExtension: 1 });
  expect(result.index).toBe(1);
  expect(result.ownership.filter((v) => v === 1)).toHaveLength(25);
  expect(result.needsMapRebuild).toBe(true);
  const skip = originalBuildingRegistration({ ...input, placementFlags: -1 });
  expect(skip.records).toEqual(input.records);
  expect(skip.flags).toEqual(input.flags);
  expect(skip.needsMapRebuild).toBe(false);
  for (let i = 0; i < 256; i++) view.setInt16(i * 16, 6, true);
  const full = originalBuildingRegistration(input);
  expect(full.capacityExceeded).toBe(true);
  expect(full.flags[20 * 50 + 20]).toBe(0x170);
  expect(full.records).toEqual(input.records);
  expect(full.ownership).toEqual(input.ownership);
});
