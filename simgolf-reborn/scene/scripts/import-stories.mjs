import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { parseStory } from "../src/stories/script.js";
const source = new URL(
  "../../../resources/sim golf/Sid Meier's SimGolf/Themes/Standard/",
  import.meta.url,
);
const decoder = new TextDecoder("windows-1252");
const stories = readdirSync(source)
  .filter((f) => /^[a-z]{8}.+\.txt$/i.test(f))
  .sort()
  .map((filename) => {
    const bytes = readFileSync(new URL(filename, source));
    return {
      ...parseStory(filename, decoder.decode(bytes)),
      sourceSha256: createHash("sha256").update(bytes).digest("hex"),
    };
  });
writeFileSync(
  new URL("../src/stories/standard.json", import.meta.url),
  JSON.stringify(stories, null, 2) + "\n",
);
console.log(`Imported ${stories.length} original standard stories.`);
