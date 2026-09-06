import { buyLand } from "./land-purchase.js";
import { renameVisitor } from "./visitor-name.js";
import { decideMembership } from "./membership.js";
import { setVisitorAppearance } from "./appearance.js";
import { setVisitorPair, clearVisitorPair } from "./visitor-pairing.js";
import { loadGolfer, validateGolferPackage } from "./golfer-package.js";
import { isFacility } from "./facilities.js";
import { allocateProSkill, PRO_SKILLS } from "./pro-skills.js";
import { reorderHoles, removeHole, demolish } from "./course-edit.js";
import {
  build,
  placeStoryReward,
  addHole,
  openHole,
  closeHole,
  hire,
  renameStaff,
  upgradeStaff,
  dismissStaff,
  repositionStaff,
  startPractice,
  useBallwasher,
  takeShot,
  update,
} from "./game.js";
import { TOOLS } from "./rules.js";
import { inBounds } from "./world.js";
import {
  canonical,
  createProtocol,
  validateProtocol,
  PROTOCOL_VERSION,
  TICK_SECONDS,
  MAX_CLIENTS,
} from "./protocol.js";

const permissions = {
  owner: new Set([
    "buy-land",
    "decide-membership",
    "rename-visitor",
    "set-visitor-appearance",
    "set-visitor-pair",
    "clear-visitor-pair",
    "place-story-reward",
    "build",
    "add-hole",
    "reorder-holes",
    "remove-hole",
    "demolish",
    "open-hole",
    "close-hole",
    "hire-marshall",
    "hire-consultant",
    "hire-celebrity",
    "hire-club-pro",
    "hire-ranger",
    "hire-vendor",
    "hire-technician",
    "hire",
    "upgrade-staff",
    "rename-staff",
    "dismiss-staff",
    "reposition-staff",
    "load-golfer",
    "allocate-pro-skill",
    "use-ballwasher",
    "start-practice",
    "shot",
  ]),
  editor: new Set([
    "decide-membership",
    "rename-visitor",
    "set-visitor-appearance",
    "set-visitor-pair",
    "clear-visitor-pair",
    "reorder-holes",
    "remove-hole",
    "demolish",
    "add-hole",
    "build",
    "open-hole",
    "close-hole",
    "hire-marshall",
    "hire-consultant",
    "hire-celebrity",
    "hire-club-pro",
    "hire-ranger",
    "hire-vendor",
    "hire-technician",
    "hire",
    "upgrade-staff",
    "rename-staff",
    "dismiss-staff",
    "reposition-staff",
  ]),
  golfer: new Set(["start-practice", "shot", "use-ballwasher"]),
  spectator: new Set(),
};
const keysMatch = (p, keys) =>
  p &&
  typeof p === "object" &&
  !Array.isArray(p) &&
  Object.keys(p).length === keys.length &&
  keys.every((k) => Object.hasOwn(p, k));
function validPayload(type, p) {
  switch (type) {
    case "buy-land":
      return keysMatch(p, []);
    case "decide-membership":
      return (
        keysMatch(p, ["golferId", "accept"]) &&
        Number.isSafeInteger(p.golferId) &&
        p.golferId > 0 &&
        typeof p.accept === "boolean"
      );
    case "rename-visitor":
      return (
        keysMatch(p, ["golferId", "name"]) &&
        Number.isSafeInteger(p.golferId) &&
        p.golferId > 0 &&
        typeof p.name === "string"
      );
    case "set-visitor-appearance":
      return (
        keysMatch(p, ["golferId", "appearance"]) &&
        Number.isSafeInteger(p.golferId) &&
        p.golferId > 0
      );
    case "set-visitor-pair":
      return (
        keysMatch(p, ["firstId", "secondId"]) &&
        [p.firstId, p.secondId].every(
          (id) => Number.isSafeInteger(id) && id > 0,
        )
      );
    case "clear-visitor-pair":
      return (
        keysMatch(p, ["golferId"]) &&
        Number.isSafeInteger(p.golferId) &&
        p.golferId > 0
      );
    case "place-story-reward":
      return keysMatch(p, ["c", "r"]) && inBounds(p.c, p.r);
    case "build":
      return (
        (keysMatch(p, ["tool", "c", "r", "brush", "holeId"]) ||
          (keysMatch(p, ["tool", "c", "r", "brush", "holeId", "rotation"]) &&
            [0, 1, 2, 3].includes(p.rotation) &&
            isFacility(p.tool))) &&
        typeof p.holeId === "string" &&
        TOOLS.includes(p.tool) &&
        p.tool !== "inspect" &&
        inBounds(p.c, p.r) &&
        [1, 3, 5].includes(p.brush) &&
        (!(["tee", "cup"].includes(p.tool) || isFacility(p.tool)) ||
          p.brush === 1)
      );
    case "load-golfer":
      try {
        return keysMatch(p, ["golfer"]) && !!validateGolferPackage(p.golfer);
      } catch {
        return false;
      }
    case "allocate-pro-skill":
      return (
        keysMatch(p, ["skill", "delta"]) &&
        Object.hasOwn(PRO_SKILLS, p.skill) &&
        [-1, 1].includes(p.delta)
      );
    case "rename-staff":
      return (
        keysMatch(p, ["staffId", "name"]) &&
        Number.isSafeInteger(p.staffId) &&
        p.staffId > 0 &&
        typeof p.name === "string" &&
        p.name.length <= 40
      );
    case "upgrade-staff":
    case "dismiss-staff":
      return (
        keysMatch(p, ["staffId"]) &&
        Number.isSafeInteger(p.staffId) &&
        p.staffId > 0
      );
    case "reposition-staff":
      return (
        keysMatch(p, ["staffId", "c", "r"]) &&
        Number.isSafeInteger(p.staffId) &&
        p.staffId > 0 &&
        inBounds(p.c, p.r)
      );
    case "shot":
      return (
        keysMatch(p, ["x", "z", "technique"]) &&
        Number.isFinite(p.x) &&
        Number.isFinite(p.z) &&
        Math.abs(p.x) < 200 &&
        Math.abs(p.z) < 200 &&
        ["straight", "draw", "fade", "backspin", "punch"].includes(p.technique)
      );
    case "reorder-holes":
      return (
        keysMatch(p, ["holeIds"]) &&
        Array.isArray(p.holeIds) &&
        p.holeIds.length <= 18 &&
        p.holeIds.every((id) => typeof id === "string")
      );
    case "demolish":
      return keysMatch(p, ["c", "r"]) && inBounds(p.c, p.r);
    case "remove-hole":
    case "open-hole":
    case "close-hole":
    case "start-practice":
      return keysMatch(p, ["holeId"]) && typeof p.holeId === "string";
    case "use-ballwasher":
    case "hire-marshall":
    case "hire-consultant":
    case "hire-celebrity":
    case "hire-club-pro":
    case "hire-ranger":
    case "hire-vendor":
    case "hire-technician":
    case "hire":
    case "add-hole":
      return keysMatch(p, []);
    default:
      return false;
  }
}

/** Transport-independent host. The principal is supplied by a trusted adapter,
 * never inferred from the client command. There is no network/auth service yet. */
export function createSession(game, { courseLocked = false } = {}) {
  game.protocol ??= createProtocol();
  validateProtocol(game.protocol);
  function execute(command, principal) {
    const state = game.protocol;
    const fail = (code, message) => ({
      ok: false,
      code,
      message,
      revision: state.revision,
    });
    if (
      !principal ||
      typeof principal.id !== "string" ||
      !/^[a-zA-Z0-9_-]{1,64}$/.test(principal.id) ||
      !Object.hasOwn(permissions, principal.role)
    )
      return fail("unauthorized", "A trusted player identity is required.");
    if (
      !command ||
      command.version !== PROTOCOL_VERSION ||
      command.actorId !== principal.id ||
      !Number.isSafeInteger(command.sequence) ||
      command.sequence < 1 ||
      !Number.isSafeInteger(command.expectedRevision) ||
      command.expectedRevision < 0
    )
      return fail("invalid-command", "Invalid command envelope.");
    if (
      courseLocked &&
      ![
        "start-practice",
        "shot",
        "use-ballwasher",
        "load-golfer",
        "allocate-pro-skill",
      ].includes(command.type)
    )
      return fail(
        "course-locked",
        "This published course is fixed for practice.",
      );
    if (!permissions[principal.role].has(command.type))
      return fail("forbidden", "This player cannot perform that action.");
    if (!validPayload(command.type, command.payload))
      return fail("invalid-payload", "Invalid action parameters.");
    // Extra envelope fields are never interpreted as state or permissions.
    const fingerprint = canonical({
      version: command.version,
      actorId: command.actorId,
      sequence: command.sequence,
      expectedRevision: command.expectedRevision,
      type: command.type,
      payload: command.payload,
    });
    let client = state.clients.find((c) => c.id === principal.id);
    if (client && command.sequence === client.sequence)
      return fingerprint === client.fingerprint
        ? structuredClone(client.result)
        : fail(
            "sequence-reused",
            "This command number was already used for a different action.",
          );
    if (command.sequence !== (client?.sequence || 0) + 1)
      return fail("out-of-order", "Resynchronize before sending this command.");
    if (!client && state.clients.length >= MAX_CLIENTS)
      return fail("capacity", "This session has reached its player limit.");
    let result;
    if (command.expectedRevision !== state.revision)
      result = fail(
        "conflict",
        "The course changed. Refresh this action before trying again.",
      );
    else {
      const p = command.payload;
      switch (command.type) {
        case "decide-membership":
          result = decideMembership(game, p.golferId, p.accept);
          break;
        case "rename-visitor":
          result = renameVisitor(game, p.golferId, p.name);
          break;
        case "set-visitor-appearance":
          result = setVisitorAppearance(game, p.golferId, p.appearance);
          break;
        case "set-visitor-pair":
          result = setVisitorPair(game, p.firstId, p.secondId);
          break;
        case "clear-visitor-pair":
          result = clearVisitorPair(game, p.golferId);
          break;
        case "load-golfer":
          result = loadGolfer(game, p.golfer);
          break;
        case "allocate-pro-skill":
          result = allocateProSkill(game, p.skill, p.delta);
          break;
        case "reorder-holes":
          result = reorderHoles(game, p.holeIds);
          break;
        case "remove-hole":
          result = removeHole(game, p.holeId);
          break;
        case "demolish":
          result = demolish(game, p.c, p.r);
          break;
        case "place-story-reward":
          result = placeStoryReward(game, p.c, p.r);
          break;
        case "buy-land":
          result = buyLand(game);
          break;
        case "build":
          result = build(game, p.tool, p.c, p.r, p.brush, p.holeId, p.rotation);
          break;
        case "open-hole":
          result = openHole(game, p.holeId);
          if (result.ok) game.revision++;
          break;
        case "close-hole":
          result = closeHole(game, p.holeId);
          if (result.ok) game.revision++;
          break;
        case "add-hole":
          result = addHole(game);
          break;
        case "hire-marshall":
          result = hire(game, "marshall");
          break;
        case "hire-consultant":
          result = hire(game, "consultant");
          break;
        case "hire-celebrity":
          result = hire(game, "celebrity");
          break;
        case "hire-club-pro":
          result = hire(game, "club-pro");
          break;
        case "hire-ranger":
          result = hire(game, "ranger");
          break;
        case "hire-vendor":
          result = hire(game, "vendor");
          break;
        case "hire-technician":
          result = hire(game, "technician");
          break;
        case "upgrade-staff":
          result = upgradeStaff(game, p.staffId);
          break;
        case "rename-staff":
          result = renameStaff(game, p.staffId, p.name);
          break;
        case "dismiss-staff":
          result = dismissStaff(game, p.staffId);
          break;
        case "reposition-staff":
          result = repositionStaff(game, p.staffId, p.c, p.r);
          break;
        case "hire":
          result = hire(game);
          break;
        case "start-practice":
          result = startPractice(game, p.holeId);
          if (result.ok) game.pro.ownerId = principal.id;
          break;
        case "use-ballwasher":
          result =
            game.pro?.ownerId && game.pro.ownerId !== principal.id
              ? fail("forbidden", "This golfer belongs to another player.")
              : useBallwasher(game);
          break;
        case "shot":
          result = !game.pro
            ? fail("not-ready", "Start a practice round first.")
            : game.pro.ownerId && game.pro.ownerId !== principal.id
              ? fail("forbidden", "This golfer belongs to another player.")
              : takeShot(game, game.pro, { x: p.x, z: p.z }, p.technique);
          break;
      }
      if (result.ok) state.revision++;
      result = { ...result, revision: state.revision };
    }
    // Persist both accepted and rule-rejected commands. A transport retry must
    // not later turn a previously rejected action into a purchase or a shot.
    if (!client) {
      client = { id: principal.id };
      state.clients.push(client);
    }
    Object.assign(client, {
      sequence: command.sequence,
      fingerprint,
      result: structuredClone(result),
    });
    return result;
  }
  return Object.freeze({
    execute,
    // Only the host drives the clock. There is deliberately no client 'tick',
    // 'set-cash', 'set-score' or 'replace-state' command.
    stepTicks(count = 1) {
      if (!Number.isSafeInteger(count) || count < 0 || count > 1200)
        throw Error("Invalid tick count.");
      for (let i = 0; i < count; i++) {
        update(game, TICK_SECONDS, !courseLocked);
        game.protocol.tick++;
      }
    },
    nextCommand(actorId, type, payload = {}) {
      return {
        version: PROTOCOL_VERSION,
        actorId,
        sequence:
          (game.protocol.clients.find((c) => c.id === actorId)?.sequence || 0) +
          1,
        expectedRevision: game.protocol.revision,
        type,
        payload,
      };
    },
  });
}
