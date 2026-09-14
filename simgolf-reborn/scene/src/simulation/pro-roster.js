import { PRO_SKILLS } from "./pro-skills.js";
// Documented field order in the supplied progolfers.dta header.
// Trailing numbers have no header definition, so preserve them without assigning meaning.
export function parseProRoster(source, { onMalformed } = {}) {
  if (typeof source !== "string" || source.length > 128000)
    throw Error("Invalid professional roster.");
  const roster = [],
    names = new Set();
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("*")) continue;
    const parts = line.split(",").map((v) => v.trim());
    const skill = parts[6]?.match(/^([0-9a-f]{10})(?:\s+(\d+))?$/i);
    const appearance = parts
      .slice(1, 6)
      .map((v) => (/^\d+$/.test(v) ? Number(v) : NaN));
    if (
      parts.length !== 7 ||
      !parts[0] ||
      parts[0].length > 80 ||
      names.has(parts[0]) ||
      !skill ||
      appearance.some(
        (v, i) => !Number.isInteger(v) || v < 0 || v > [7, 3, 9, 9, 9][i],
      )
    ) {
      if (onMalformed) {
        onMalformed({
          line: raw,
          reason: "Malformed professional roster row.",
        });
        continue;
      }
      throw Error("Malformed professional roster row.");
    }
    names.add(parts[0]);
    roster.push({
      name: parts[0],
      appearance: {
        body: appearance[0],
        skin: appearance[1],
        hat: appearance[2],
        shirt: appearance[3],
        pants: appearance[4],
      },
      skillCapCode: skill[1].toUpperCase(),
      skillCaps: Object.fromEntries(
        Object.keys(PRO_SKILLS).map((key, i) => [
          key,
          parseInt(skill[1][i], 16),
        ]),
      ),
      sourceSuffix: skill[2] ?? null,
    });
  }
  if (!roster.length || roster.length > 500)
    throw Error("Invalid professional roster size.");
  return roster;
}
