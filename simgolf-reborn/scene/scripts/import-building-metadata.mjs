import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const bytes = readFileSync(
  new URL(
    "../../../resources/sim golf/Sid Meier's SimGolf/golf.exe",
    import.meta.url,
  ),
);
const sourceSha256 = createHash("sha256").update(bytes).digest("hex");
if (
  sourceSha256 !==
  "82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf"
)
  throw Error("Unrecognized original executable.");
const buildings = Array.from({ length: 16 }, (_, type) => {
  const record = bytes.subarray(0xc16a8 + type * 20, 0xc16a8 + (type + 1) * 20);
  const end = record.indexOf(0);
  if (end < 1 || end >= 16) throw Error("Invalid building name.");
  return {
    type,
    name: record.subarray(0, end).toString("ascii"),
    baseSize: record.readInt8(16),
    costUnits: record.readUInt16LE(18),
  };
});
writeFileSync(
  new URL("../src/content/original-buildings.json", import.meta.url),
  JSON.stringify(
    { sourceSha256, sourceVA: "0x4c16a8", recordSize: 20, buildings },
    null,
    2,
  ) + "\n",
);
