import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { originalBuildingMetadata } from "../src/simulation/original-building-metadata.js";
test("building names precede their size and cost in the original records", () => {
  const bytes = readFileSync(
    new URL(
      "../../../resources/sim golf/Sid Meier's SimGolf/golf.exe",
      import.meta.url,
    ),
  );
  for (let type = 0; type < 16; type++) {
    const record = bytes.subarray(
        0xc16a8 + type * 20,
        0xc16a8 + (type + 1) * 20,
      ),
      entry = originalBuildingMetadata(type);
    expect(entry.name).toBe(
      record.subarray(0, record.indexOf(0)).toString("ascii"),
    );
    expect(entry.baseSize).toBe(record.readInt8(16));
    expect(entry.costUnits).toBe(record.readUInt16LE(18));
  }
  expect(originalBuildingMetadata(15)).toEqual({
    type: 15,
    name: "Clubhouse",
    baseSize: 4,
    costUnits: 200,
  });
  expect(originalBuildingMetadata(10).name).toBe("Driving Range");
  expect(originalBuildingMetadata(12).name).toBe("Marina");
  expect(() => originalBuildingMetadata(16)).toThrow(/Unknown/);
});
