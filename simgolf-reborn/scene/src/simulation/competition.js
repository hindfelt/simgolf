import { originalProfessionalSkills } from "./roster-opponent.js";
import { validateAppearance } from "./appearance.js";
import { canonical, RULESET_VERSION, PROTOCOL_VERSION, PRE_TENNIS_RULESET, compatibleGolfRuleset } from "./protocol.js";
import { importCourse, coursePractice } from "./course-package.js";
import { validateGolferPackage, loadGolfer } from "./golfer-package.js";
import { startPractice } from "./game.js";
import { createSession } from "./session.js";

// The caller is a trusted host adapter. Identity and earned career eligibility are
// supplied by that adapter; a local JSON profile does not prove ownership or merit.
export async function createCompetition({
  id,
  course,
  entrants,
  rounds = 1,
  seed = 2002,
}) {
  if (
    typeof id !== "string" ||
    !/^[a-zA-Z0-9_-]{1,64}$/.test(id) ||
    !Number.isInteger(rounds) ||
    rounds < 1 ||
    rounds > 4 ||
    !Number.isInteger(seed) ||
    seed < 0 ||
    seed > 0xffffffff ||
    !Array.isArray(entrants) ||
    entrants.length < 2 ||
    entrants.length > 64
  )
    throw Error("Invalid competition setup.");
  const ids = new Set();
  // Snapshot before awaiting course validation, so callers cannot race profile edits.
  const players = entrants.map((p) => {
    if (
      !p ||
      typeof p.id !== "string" ||
      !/^[a-zA-Z0-9_-]{1,64}$/.test(p.id) ||
      ids.has(p.id) ||
      typeof p.name !== "string" ||
      !p.name.trim() ||
      p.name.length > 40 ||
      /[\u0000-\u001f]/.test(p.name)
    )
      throw Error("Invalid competition entrant.");
    ids.add(p.id);
    validateGolferPackage(p.golfer);
    if (p.professional !== undefined) originalProfessionalSkills(p.professional);
    return {
      id: p.id,
      name: p.name,
      profile: structuredClone(p.golfer),
      professional: p.professional ?? null,
      appearance:
        p.appearance === undefined
          ? null
          : structuredClone(validateAppearance(p.appearance)),
      results: [],
      game: null,
      session: null,
    };
  });
  const pkg = await importCourse(JSON.stringify(course));
  const journal = [];
  let recordedTicks = 0;
  const config = {
    id,
    course: pkg,
    rounds,
    seed,
    entrants: players.map((p) => ({
      id: p.id,
      name: p.name,
      golfer: p.profile,
      ...(p.professional ? { professional: p.professional } : {}),
      ...(p.appearance ? { appearance: p.appearance } : {}),
    })),
  };
  const capacity = () => {
    if (journal.length >= 10000)
      throw Error("Competition recording capacity reached.");
  };
  function begin(p) {
    p.game = coursePractice(
      pkg,
      (seed + Math.imul(p.results.length, 2654435761)) >>> 0,
    );
    loadGolfer(p.game, p.profile);
    const result = startPractice(p.game, p.game.holes[0].id);
    if (!result.ok) throw Error(result.message);
    if (p.professional) p.game.pro.proSkills = originalProfessionalSkills(p.professional);
    p.game.pro.ownerId = p.id;
    p.game.pro.name = p.name;
    if (p.appearance) p.game.pro.appearance = structuredClone(p.appearance);
    p.session = createSession(p.game, { courseLocked: true });
  }
  players.forEach(begin);
  const done = () => players.every((p) => p.results.length === rounds);
  function collect(p) {
    if (p.results.length === rounds || p.game.pro.phase !== "finished") return;
    const v = p.game.pro;
    if (
      v.scorecard.length !== pkg.content.holes.length ||
      v.scorecard.some(
        (s, i) => s.holeId !== pkg.content.holes[i].id || s.fee !== 0,
      )
    )
      throw Error("Incomplete competition scorecard.");
    p.results.push({
      round: p.results.length + 1,
      scorecard: structuredClone(v.scorecard),
      strokes: v.scorecard.reduce((sum, s) => sum + s.strokes, 0),
    });
    if (p.results.length < rounds) begin(p);
  }
  const find = (id) => players.find((p) => p.id === id);
  return Object.freeze({
    nextCommand(playerId, type, payload = {}) {
      const p = find(playerId);
      if (!p) throw Error("Unknown entrant.");
      return {
        eventId: id,
        round: p.results.length + 1,
        command: p.session.nextCommand(playerId, type, payload),
      };
    },
    execute(request, principal) {
      const p = find(principal?.id);
      const fail = (message) => ({ ok: false, message });
      if (!p || !["owner", "golfer"].includes(principal?.role))
        return fail("This player is not an entrant.");
      if (
        !request ||
        request.eventId !== id ||
        request.round !== p.results.length + 1
      )
        return fail("This command belongs to another event or round.");
      if (p.results.length === rounds)
        return fail("This golfer has completed the event.");
      if (!["shot", "use-ballwasher"].includes(request.command?.type))
        return fail("Competition course and golfer setup are fixed.");
      const c = request.command;
      const recordedRequest = {
        eventId: request.eventId,
        round: request.round,
        command: {
          version: c.version,
          actorId: c.actorId,
          sequence: c.sequence,
          expectedRevision: c.expectedRevision,
          type: c.type,
          payload: c.payload,
        },
      };
      let clean;
      try {
        const json = canonical(recordedRequest);
        if (json.length > 4096) return fail("Command is too large.");
        clean = JSON.parse(json);
      } catch {
        return fail("Invalid command data.");
      }
      capacity();
      const identity = { id: principal.id, role: principal.role };
      const result = p.session.execute(clean.command, identity);
      journal.push({
        type: "command",
        request: clean,
        principal: identity,
        result: structuredClone(result),
      });
      return result;
    },
    stepTicks(count = 1) {
      if (!Number.isSafeInteger(count) || count < 0 || count > 1200)
        throw Error("Invalid competition tick count.");
      if (!count || done()) return;
      if (recordedTicks + count > 1000000)
        throw Error("Competition recording tick limit reached.");
      const previous = journal.at(-1);
      if (previous?.type === "ticks" && previous.count + count <= 1200)
        previous.count += count;
      else {
        capacity();
        journal.push({ type: "ticks", count });
      }
      recordedTicks += count;
      for (let i = 0; i < count && !done(); i++)
        for (const p of players) {
          if (p.results.length === rounds) continue;
          p.session.stepTicks();
          collect(p);
        }
    },
    save() {
      return JSON.stringify({
        format: "simgolf-reborn-competition",
        version: 1,
        ruleset: RULESET_VERSION,
        config,
        journal,
      });
    },
    roundSnapshot(playerId) {
      const p = find(playerId);
      if (!p) throw Error("Unknown entrant.");
      return structuredClone(p.game);
    },
    snapshot() {
      const complete = done();
      const standings = players.map((p) => {
        const completed = p.results.flatMap((r) => r.scorecard),
          live = p.results.length === rounds ? [] : p.game.pro.scorecard,
          cards = [...completed, ...live];
        return {
          id: p.id,
          name: p.name,
          roundsCompleted: p.results.length,
          holesCompleted: cards.length,
          strokes: cards.reduce((sum, s) => sum + s.strokes, 0),
          relativeToPar: cards.reduce((sum, s) => sum + s.strokes - s.par, 0),
          results: structuredClone(p.results),
          rank: null,
        };
      });
      if (complete) {
        standings.sort(
          (a, b) =>
            a.strokes - b.strokes || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
        );
        standings.forEach(
          (p, i) =>
            (p.rank =
              i && p.strokes === standings[i - 1].strokes
                ? standings[i - 1].rank
                : i + 1),
        );
      }
      return {
        id,
        courseDigest: pkg.digest,
        rounds,
        status: complete ? "complete" : "playing",
        standings,
      };
    },
  });
}

// Replay derives shots, receipts and standings from the original fixed setup.
// This imports local/trusted host saves, never establishes remote player identity.
export async function restoreCompetition(raw) {
  if (typeof raw !== "string" || raw.length > 64000000)
    throw Error("Competition save is too large.");
  const data = JSON.parse(raw),
    exact = (v, keys) =>
      v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      Object.keys(v).length === keys.length &&
      keys.every((k) => Object.hasOwn(v, k));
  if (
    !exact(data, ["format", "version", "ruleset", "config", "journal"]) ||
    data.format !== "simgolf-reborn-competition" ||
    data.version !== 1 ||
    !compatibleGolfRuleset(data.ruleset) ||
    !exact(data.config, ["id", "course", "rounds", "seed", "entrants"]) ||
    !Array.isArray(data.journal) ||
    data.journal.length > 10000
  )
    throw Error("Unsupported competition save.");
  let ticks = 0;
  for (const row of data.journal) {
    if (row?.type === "ticks") {
      if (
        !exact(row, ["type", "count"]) ||
        !Number.isInteger(row.count) ||
        row.count < 1 ||
        row.count > 1200 ||
        (ticks += row.count) > 1000000
      )
        throw Error("Invalid competition clock record.");
    } else if (
      row?.type !== "command" ||
      !exact(row, ["type", "request", "principal", "result"]) ||
      canonical(row.request).length > 4096
    )
      throw Error("Invalid competition command record.");
  }
  if(data.ruleset===PRE_TENNIS_RULESET){
    for(const row of data.journal) if(row.type==='command' && row.request?.command){
      const c=row.request.command;
      // Translate only the formerly valid version. A formerly rejected future
      // version must stay rejected, rather than becoming valid on upgrade.
      c.version=c.version===75?PROTOCOL_VERSION:c.version===PROTOCOL_VERSION?-1:c.version;
    }
  }
  const host = await createCompetition(data.config);
  for (const row of data.journal) {
    if (row.type === "ticks") host.stepTicks(row.count);
    else if (
      canonical(host.execute(row.request, row.principal)) !==
      canonical(row.result)
    )
      throw Error("Competition command replay differs from its record.");
  }
  return host;
}
