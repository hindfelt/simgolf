import scripts from "./standard.json" with { type: "json" };
import { beginStory, replyToStory } from "./progression.js";
import { storyLine } from "./script.js";
const opening = scripts.find((s) => s.id === "GxxxxxxxOpeningDay");
// Original positive/retry semantics; proximity, timing and mood cutoff provisional.
export function stepOpeningStory(g) {
  if (g.openingStory === undefined) {
    const a = g.guests.find((v) => !v.paid),
      b =
        a &&
        g.guests.find((v) => v.id !== a.id && v.pair === a.pair && !v.paid);
    if (!b) return;
    g.openingStory = {
      version: 1,
      partners: [a.id, b.id],
      names: [a.name, b.name],
      progress: beginStory(opening),
      phase: "prompt",
      nextAt: g.time + 2,
      lines: [],
      status: "active",
    };
  }
  const s = g.openingStory;
  const [a, b] = s.partners.map((id) => g.guests.find((v) => v.id === id));
  if (s.status === "unfinished" && s.progress.attempts < 128) {
    // Visitor IDs persist across visits. Resume only the same returning pair;
    // a different partner must never inherit this conversation or its reward.
    if (!a || !b || a.paid || b.paid || a.pair !== b.pair) return;
    s.status = "active";
    s.nextAt = g.time + 2;
  }
  if (s.status !== "active") return;
  if (!a || !b || a.paid || b.paid) {
    s.status = "unfinished";
    return;
  }
  if (
    g.time < s.nextAt ||
    a.shot ||
    b.shot ||
    Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z) > 7
  )
    return;
  if (s.progress.attempts >= 128) {
    s.status = "unfinished";
    return;
  }
  if (s.phase === "prompt") {
    s.lines.push({
      speaker: a.id,
      text: storyLine(opening, s.progress.chapter, null, s.names[1]),
      at: g.time,
    });
    s.phase = "reply";
    s.nextAt = g.time + 3;
  } else {
    const replies = opening.stages[s.progress.chapter].replies;
    const reply =
      b.mood >= 60 ? 0 : 1 + (s.progress.attempts % (replies.length - 1));
    const result = replyToStory(opening, s.progress, reply, s.names[0]);
    s.lines.push({ speaker: b.id, text: result.text, at: g.time });
    s.progress = result.state;
    s.phase = "prompt";
    s.nextAt = g.time + 9;
    if (result.happyEnding) s.status = "happy-ending";
  }
}
export function storyGolfers(g) {
  const line = g.openingStory?.lines.at(-1);
  return g.guests.map((v) =>
    line && line.speaker === v.id && g.time - line.at < 6
      ? { ...v, comment: line.text }
      : v,
  );
}
export function validateOpeningStory(g) {
  const s = g.openingStory;
  if (s === undefined) return;
  const p = s?.progress;
  if (
    !s ||
    (s.rewardFacilityId !== undefined &&
      (s.status !== "happy-ending" ||
        !Number.isSafeInteger(s.rewardFacilityId) ||
        s.rewardFacilityId < 1 ||
        s.rewardFacilityId >= g.nextId)) ||
    s.version !== 1 ||
    !["active", "unfinished", "happy-ending"].includes(s.status) ||
    !Array.isArray(s.partners) ||
    s.partners.length !== 2 ||
    new Set(s.partners).size !== 2 ||
    !s.partners.every(Number.isSafeInteger) ||
    !Array.isArray(s.names) ||
    s.names.length !== 2 ||
    !s.names.every((n) => typeof n === "string" && n.length <= 80) ||
    !["prompt", "reply"].includes(s.phase) ||
    !Number.isFinite(s.nextAt) ||
    s.nextAt < 0 ||
    !p ||
    p.scriptId !== opening.id ||
    !Number.isInteger(p.chapter) ||
    p.chapter < 0 ||
    p.chapter > 4 ||
    !Number.isInteger(p.attempts) ||
    p.attempts < 0 ||
    p.attempts > 128 ||
    p.complete !== (p.chapter === 4) ||
    (s.status === "happy-ending") !== p.complete ||
    !Array.isArray(s.lines) ||
    s.lines.length > 256 ||
    s.lines.some(
      (l) =>
        !s.partners.includes(l.speaker) ||
        typeof l.text !== "string" ||
        l.text.length > 1200 ||
        !Number.isFinite(l.at) ||
        l.at < 0 ||
        l.at > g.time,
    ) ||
    (s.status === "active" &&
      !s.partners.every((id) => g.guests.some((v) => v.id === id)))
  )
    throw Error("Invalid saved SimStory.");
  let derived = beginStory(opening),
    previousTime = -1;
  for (const [index, line] of s.lines.entries()) {
    if (
      derived.complete ||
      line.at < previousTime ||
      line.speaker !== s.partners[index % 2]
    )
      throw Error("Invalid story transcript order.");
    previousTime = line.at;
    if (index % 2 === 0) {
      if (line.text !== storyLine(opening, derived.chapter, null, s.names[1]))
        throw Error("Invalid story prompt.");
    } else {
      const reply = opening.stages[derived.chapter].replies.findIndex(
        (_, n) =>
          storyLine(opening, derived.chapter, n, s.names[0]) === line.text,
      );
      if (reply < 0) throw Error("Invalid story reply.");
      derived = replyToStory(opening, derived, reply, s.names[0]).state;
    }
  }
  if (
    derived.chapter !== p.chapter ||
    derived.attempts !== p.attempts ||
    derived.complete !== p.complete ||
    s.phase !== (s.lines.length % 2 ? "reply" : "prompt") ||
    s.nextAt < previousTime
  )
    throw Error("Story progress does not match its transcript.");
}
