import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { beginStory, replyToStory } from "../src/stories/progression.js";
const scripts = JSON.parse(
  readFileSync(
    new URL("../src/stories/standard.json", import.meta.url),
    "utf8",
  ),
);
test("negative replies retry the chapter; four positive replies complete once", () => {
  const script = scripts.find((s) => s.title === "The Goldfish Story");
  let state = beginStory(script);
  const rejected = replyToStory(script, state, 1, "Gilbert");
  expect(rejected.positive).toBe(false);
  expect(rejected.happyEnding).toBe(false);
  expect(rejected.state.chapter).toBe(0);
  expect(state.attempts).toBe(0);
  state = JSON.parse(JSON.stringify(rejected.state));
  for (let i = 0; i < 4; i++) {
    const result = replyToStory(script, state, 0, "Gilbert");
    expect(result.happyEnding).toBe(i === 3);
    state = result.state;
  }
  expect(state.complete).toBe(true);
  expect(state.attempts).toBe(5);
  expect(() => replyToStory(script, state, 0, "Gilbert")).toThrow();
  expect(() =>
    replyToStory(
      script,
      { ...beginStory(script), scriptId: "other" },
      0,
      "Gilbert",
    ),
  ).toThrow();
});
