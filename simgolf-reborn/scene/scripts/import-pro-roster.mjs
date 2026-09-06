import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { parseProRoster } from "../src/simulation/pro-roster.js";
const bytes = readFileSync(
  new URL(
    "../../../resources/sim golf/Sid Meier's SimGolf/Themes/Standard/progolfers.dta",
    import.meta.url,
  ),
);
const unparsedRows = [];
const golfers = parseProRoster(new TextDecoder("windows-1252").decode(bytes), {
  onMalformed: (row) => unparsedRows.push(row),
});
const data = {
  source: "Themes/Standard/progolfers.dta",
  sourceSha256: createHash("sha256").update(bytes).digest("hex"),
  golfers,
  unparsedRows,
};
writeFileSync(
  new URL("../src/simulation/pro-roster.json", import.meta.url),
  JSON.stringify(data, null, 2) + "\n",
);
console.log(`Imported ${data.golfers.length} professional roster entries.`);
