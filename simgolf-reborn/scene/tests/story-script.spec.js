import { test, expect } from "@playwright/test";
import { readFileSync, readdirSync } from "node:fs";
import { parseStory, storyLine } from "../src/stories/script.js";
const root = new URL(
  "../../../resources/sim golf/Sid Meier's SimGolf/Themes/Standard/",
  import.meta.url,
);
test("original standard stories retain prompt and reply ordering and pairing metadata", () => {
  const files = readdirSync(root).filter((f) => /^[a-z]{8}.+\.txt$/i.test(f));
  expect(files.length).toBeGreaterThan(5);
  for (const file of files) {
    const script = parseStory(
      file,
      readFileSync(new URL(file, root), "latin1"),
    );
    expect(script.stages.length).toBeGreaterThan(0);
    expect(script.pairingCode).toBe(file.slice(0, 8));
  }
  const opening = parseStory(
    "GxxxxxxxOpeningDay.txt",
    readFileSync(new URL("GxxxxxxxOpeningDay.txt", root), "latin1"),
  );
  expect(opening.title).toBe("Opening Day");
  expect(opening.stages).toHaveLength(4);
  expect(opening.stages.map((s) => s.replies.length)).toEqual([2, 5, 4, 6]);
  expect(storyLine(opening, 0, null, "Sam")).toContain("Sam, our friendship");
  expect(storyLine(opening, 0, 0, "$&")).toContain("$&,");
  expect(() => storyLine(opening, 0, 99, "Sam")).toThrow();
});
test("malformed scripts reject instead of fabricating dialogue", () => {
  expect(() => parseStory("GxxxxxxxBad.txt", "Title\n\nPrompt only")).toThrow();
  expect(() => parseStory("../bad.txt", "Title\n\nPrompt\n Reply")).toThrow();
  expect(() => parseStory("GxxxxxxxBad.txt", "\0")).toThrow();
});

test("indentation defines chapters even without blank separators", () => {
  const script = parseStory(
    "GxxxxxxxTest.txt",
    "Title\n\nQuestion one\n Positive\n\n Negative\nQuestion two\n Positive\n Negative",
  );
  expect(script.stages.map((s) => s.replies.length)).toEqual([2, 2]);
  expect(script.stages[1].prompt).toBe("Question two");
});
