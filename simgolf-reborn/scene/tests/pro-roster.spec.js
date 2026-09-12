import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseProRoster } from "../src/simulation/pro-roster.js";
const source = readFileSync(
  new URL(
    "../../../resources/sim golf/Sid Meier's SimGolf/Themes/Standard/progolfers.dta",
    import.meta.url,
  ),
  "latin1",
);
test("imports supplied names, appearance fields and caps without spending player points", () => {
  const issues = [];
  const roster = parseProRoster(source, {
    onMalformed: (row) => issues.push(row),
  });
  expect(issues).toHaveLength(1);
  expect(issues[0].line).toContain("Brad Fiction");
  expect(roster.length).toBeGreaterThan(20);
  expect(roster.find((p) => p.name === "Sid Amateur").skillCapCode).toBe(
    "1111111111",
  );
  const specialist = roster.find((p) => p.name === "Iron Hands Hacker");
  expect(specialist.skillCaps.driver).toBe(10);
  expect(specialist.skillCaps.power).toBe(0);
  const tiger = roster.find((p) => p.name === "Tiger Forest");
  expect(tiger.appearance).toEqual({
    body: 0,
    skin: 3,
    hat: 0,
    shirt: 4,
    pants: 0,
  });
  expect(tiger.skillCapCode).toBe("BE7AAFBF7F");
  expect(tiger.sourceSuffix).toBe("115");
});
test("invalid and duplicated rows reject", () => {
  expect(() => parseProRoster("No,9,0,0,0,0,1111111111")).toThrow();
  expect(() => parseProRoster("No,0,0,0,0,0,111")).toThrow();
  const row = "No,0,0,0,0,0,1111111111";
  expect(() => parseProRoster(row + "\n" + row)).toThrow();
});
