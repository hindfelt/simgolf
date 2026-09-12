import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { parsePropertyRecords } from "../src/simulation/property-catalog.js";
const source = readFileSync(
  new URL(
    "../../../resources/sim%20golf/Sid%20Meier's%20SimGolf/golf.exe",
    import.meta.url,
  ),
);
const catalog = JSON.parse(
  readFileSync(
    new URL("../src/content/original-properties.json", import.meta.url),
    "utf8",
  ),
);
test("original property catalog reproduces the supplied executable table and unique IDs", () => {
  expect(createHash("sha256").update(source).digest("hex")).toBe(
    catalog.sha256,
  );
  expect(parsePropertyRecords(source, catalog.tableOffset)).toEqual(
    catalog.properties,
  );
  expect(
    catalog.properties.map((p) => p.originalId).sort((a, b) => a - b),
  ).toEqual(Array.from({ length: 16 }, (_, i) => i));
  expect(catalog.properties.map((p) => p.name)).toEqual([
    "Ocean's Edge",
    "Dolphin Coast",
    "Jurassic Springs",
    "Ace in the Hole",
    "Coyote Flats",
    "Flamingo Shores",
    "Island Palms",
    "Windy Point",
    "Ravenwood Farms",
    "Christmas Pines",
    "County Kincaide",
    "Harold's Keep",
    "Thistle Runes",
    "Sangria Bay",
    "Ocean Grove",
    "Scorpion Cove",
  ]);
  expect(catalog.properties.find((p) => p.originalId === 12)).toMatchObject({
    location: "Scotland",
    name: "Harold's Keep",
    bonusLabel: "Free Castle",
  });
});
test("property importer rejects truncation, duplicate identities and broken text boundaries", () => {
  expect(() =>
    parsePropertyRecords(
      source.slice(0, catalog.tableOffset + 16 * 130 - 1),
      catalog.tableOffset,
    ),
  ).toThrow();
  const duplicate = Buffer.from(source);
  duplicate[catalog.tableOffset + 130 + 24] =
    duplicate[catalog.tableOffset + 24];
  expect(() => parsePropertyRecords(duplicate, catalog.tableOffset)).toThrow(
    /ID/,
  );
  const bad = Buffer.from(source);
  bad.fill(65, catalog.tableOffset, catalog.tableOffset + 24);
  expect(() => parsePropertyRecords(bad, catalog.tableOffset)).toThrow(/text/);
});

test("extracted map coordinates place known locations and the inspector selects their source labels", async ({
  page,
}) => {
  expect(
    catalog.properties.find((p) => p.location === "Scotland").mapPoint,
  ).toEqual({ x: 266, y: 222 });
  expect(
    catalog.properties.find((p) => p.location === "San Diego").mapPoint,
  ).toEqual({ x: 53, y: 244 });
  const path = new URL(
    "../../graphics/samples/world-properties.html",
    import.meta.url,
  ).href;
  await page.goto(path);
  await expect(page.locator(".marker")).toHaveCount(16);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "County Kincaide" })
    .click();
  await expect(page.locator("#detail")).toContainText("Ireland");
  await expect(page.locator("#detail")).toContainText("Leprechauns");
  await page.screenshot({ path: "../graphics/samples/world-properties.png" });
});

test("original setup codes decode environmental labels and reject unknown values", () => {
  expect(catalog.properties.find((p) => p.location === "Oahu")).toMatchObject({
    environment: "tropical",
    geography: "island",
    relief: "flat",
  });
  expect(
    catalog.properties.find((p) => p.location === "Phoenix"),
  ).toMatchObject({
    environment: "desert",
    geography: "inland",
    relief: "flat",
  });
  for (const offset of [62, 63, 64]) {
    const invalid = Buffer.from(source);
    invalid[catalog.tableOffset + offset] = 255;
    expect(() => parsePropertyRecords(invalid, catalog.tableOffset)).toThrow(
      /setup/,
    );
  }
});
