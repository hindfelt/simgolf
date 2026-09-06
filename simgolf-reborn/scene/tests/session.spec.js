import { test, expect } from "@playwright/test";
import { createGame, serialize, restore } from "../src/simulation/game.js";
import { createSession } from "../src/simulation/session.js";
const owner = { id: "owner", role: "owner" },
  editor = { id: "editor", role: "editor" };
const tee = { tool: "tee", c: 7, r: 20, brush: 1, holeId: "hole-1" },
  green = { tool: "green", c: 36, r: 5, brush: 1, holeId: "hole-1" };
const send = (s, p, type, payload = {}) =>
  s.execute(
    s.nextCommand(
      p.id,
      type,
      ["open-hole", "close-hole", "start-practice"].includes(type)
        ? { holeId: "hole-1", ...payload }
        : payload,
    ),
    p,
  );

test("retried purchases and shots execute once, including after save/reload", () => {
  const g = createGame(),
    s = createSession(g),
    cmd = s.nextCommand(owner.id, "build", tee);
  const result = s.execute(cmd, owner),
    cash = g.cash;
  expect(result.ok).toBe(true);
  expect(s.execute(cmd, owner)).toEqual(result);
  expect(g.cash).toBe(cash);
  const saved = restore(serialize(g)),
    resumed = createSession(saved);
  expect(resumed.execute(cmd, owner)).toEqual(result);
  expect(saved.cash).toBe(cash);
  expect(send(resumed, owner, "build", green).ok).toBe(true);
  expect(send(resumed, owner, "start-practice").ok).toBe(true);
  const shot = resumed.nextCommand(owner.id, "shot", {
    x: -9,
    z: 1,
    technique: "straight",
  });
  const hit = resumed.execute(shot, owner);
  expect(hit.ok).toBe(true);
  resumed.stepTicks(20);
  expect(resumed.execute(shot, owner)).toEqual(hit);
  expect(saved.pro.strokes).toBe(1);
});
test("two editors cannot apply purchases against the same old revision", () => {
  const g = createGame(),
    s = createSession(g),
    first = s.nextCommand(owner.id, "build", tee),
    stale = s.nextCommand(editor.id, "build", green);
  expect(s.execute(first, owner).ok).toBe(true);
  const cash = g.cash;
  expect(s.execute(stale, editor).code).toBe("conflict");
  expect(g.cash).toBe(cash);
  expect(g.holes[0].green).toBeNull();
  expect(send(s, editor, "build", green).ok).toBe(true);
  const builtCash = g.cash;
  // A cached rejection stays rejected even though the world subsequently changed.
  expect(s.execute(stale, editor).code).toBe("out-of-order");
  expect(g.cash).toBe(builtCash);
});
test("permission checks, identity, sequence reuse and malformed payloads reject without mutation", () => {
  const g = createGame(),
    s = createSession(g),
    before = serialize(g);
  const spectator = { id: "viewer", role: "spectator" };
  expect(send(s, spectator, "build", tee).code).toBe("forbidden");
  expect(s.execute(s.nextCommand(owner.id, "build", tee), editor).code).toBe(
    "invalid-command",
  );
  for (const payload of [
    { ...tee, brush: 100 },
    { ...tee, c: NaN },
    { ...tee, c: 9999 },
    { ...tee, cash: 999999 },
  ])
    expect(send(s, owner, "build", payload).code).toBe("invalid-payload");
  expect(send(s, owner, "set-cash", { cash: 999999 }).code).toBe("forbidden");
  expect(serialize(g)).toBe(before);
  const cmd = s.nextCommand(owner.id, "build", tee);
  s.execute(cmd, owner);
  expect(s.execute({ ...cmd, payload: green }, owner).code).toBe(
    "sequence-reused",
  );
  expect(
    s.execute({ ...s.nextCommand(owner.id, "hire"), sequence: 40 }, owner).code,
  ).toBe("out-of-order");
});
test("commands and fixed ticks replay the same economy, golfers and weeds", () => {
  const g = createGame(19),
    s = createSession(g),
    tape = [];
  function command(type, payload = {}) {
    const c = s.nextCommand(
      owner.id,
      type,
      ["open-hole", "close-hole", "start-practice"].includes(type)
        ? { holeId: "hole-1", ...payload }
        : payload,
    );
    tape.push({ command: c });
    expect(s.execute(c, owner).ok).toBe(true);
  }
  function ticks(n) {
    tape.push({ ticks: n });
    s.stepTicks(n);
  }
  command("build", tee);
  command("build", green);
  command("open-hole");
  ticks(400);
  command("hire");
  ticks(1200);
  ticks(1200);
  expect(g.stats.rounds).toBeGreaterThan(0);
  expect(g.stats.removed).toBeGreaterThan(0);
  const replay = createGame(19),
    host = createSession(replay);
  for (const item of tape) {
    if (item.command) host.execute(item.command, owner);
    else host.stepTicks(item.ticks);
  }
  expect(serialize(replay)).toBe(serialize(g));
});
test("a golfer cannot submit a shot for another player’s pro", () => {
  const g = createGame(),
    s = createSession(g);
  send(s, owner, "build", tee);
  send(s, owner, "build", green);
  send(s, owner, "start-practice");
  expect(
    send(s, { id: "rival", role: "golfer" }, "shot", {
      x: 0,
      z: 0,
      technique: "straight",
    }).code,
  ).toBe("forbidden");
  expect(g.pro.strokes).toBe(0);
});
test("legacy saves migrate; damaged or incompatible command state rejects", () => {
  const g = createGame();
  expect(g.protocol).toBeUndefined();
  const migrated = restore(serialize(g));
  createSession(migrated);
  expect(migrated.protocol.revision).toBe(0);
  for (const field of ["tick", "revision", "version", "ruleset", "clients"]) {
    const broken = structuredClone(migrated);
    delete broken.protocol[field];
    expect(() => restore(serialize(broken))).toThrow();
  }
});
