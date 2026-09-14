import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
const source = fileURLToPath(
  new URL(
    "../../../resources/sim golf/Sid Meier's SimGolf/golf.exe",
    import.meta.url,
  ),
);
const bytes = readFileSync(source);
const sha256 = createHash("sha256").update(bytes).digest("hex");
if (
  sha256 !== "82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf"
)
  throw Error("Unrecognized original executable.");
// 0x40f2d3 copies 0x114 dwords from 0x4c0a38 to 0x576da0.
// In this pinned PE the source VA maps to raw offset 0xc0a38.
const terrain = Array.from({ length: 23 }, (_, code) => {
  const record = bytes.subarray(0xc0a38 + code * 48, 0xc0a38 + (code + 1) * 48);
  const end = record.indexOf(0);
  if (end < 1 || end >= 32) throw Error("Invalid original terrain name.");
  return {
    code,
    name: record.subarray(0, end).toString("ascii"),
    clearanceCost: record.readInt8(36),
    category: record.readInt8(38),
    rawMetadata: Array.from(record.subarray(32)),
  };
});
writeFileSync(
  new URL("../src/content/original-terrain-metadata.json", import.meta.url),
  JSON.stringify(
    { sourceSha256: sha256, sourceVA: "0x4c0a38", recordSize: 48, terrain },
    null,
    2,
  ) + "\n",
);
