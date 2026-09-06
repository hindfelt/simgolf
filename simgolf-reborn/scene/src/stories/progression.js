import { storyLine } from "./script.js";
export function beginStory(script) {
  return { scriptId: script.id, chapter: 0, attempts: 0, complete: false };
}
// Caller supplies an authoritative response decision. Timing, golfer matching
// and mood thresholds belong to the future relationship simulation adapter.
export function replyToStory(script, state, reply, partnerName) {
  if (
    !state ||
    state.scriptId !== script.id ||
    state.complete ||
    !Number.isSafeInteger(state.attempts) ||
    state.attempts < 0 ||
    state.attempts >= 1000000
  )
    throw Error("Invalid or completed story progress.");
  const text = storyLine(script, state.chapter, reply, partnerName);
  if (reply === null) throw Error("A reply is required.");
  const positive = reply === 0,
    chapter = state.chapter + (positive ? 1 : 0);
  const complete = chapter === script.stages.length;
  return {
    text,
    positive,
    happyEnding: complete,
    state: {
      scriptId: script.id,
      chapter,
      attempts: state.attempts + 1,
      complete,
    },
  };
}
