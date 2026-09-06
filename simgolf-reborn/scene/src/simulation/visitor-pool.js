import { ensureVisitorAppearances, validateAppearance } from "./appearance.js";
import { ensurePersonalities, validatePersonality } from "./personality.js";
// Original initial population size. Invitation-driven expansion remains pending.
export const INITIAL_VISITORS = 12;
const NAMES = [
  "Alice",
  "Ben",
  "Clara",
  "David",
  "Eddie",
  "Frances",
  "George",
  "Hazel",
  "Iris",
  "Jack",
  "Kit",
  "Luigi",
];
export function initializeVisitorPool(g) {
  g.visitorPool = (g.guestRoster || [])
    .filter((p) => p.profile)
    .map((p) => ({
      id: p.id,
      name: p.name,
      profile: structuredClone(p.profile),
    }));
  // Independent seed: preparing identities must not consume live shot RNG.
  let seed = g.rng >>> 0;
  const roll = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  while (g.visitorPool.length < INITIAL_VISITORS) {
    const index = g.visitorPool.length;
    g.visitorPool.push({
      id: g.nextId++,
      name: NAMES[index],
      profile: {
        skills: {
          length: roll() > 0.5,
          accuracy: roll() > 0.5,
          imagination: roll() > 0.5,
        },
        trained: {},
      },
    });
  }
  ensurePersonalities(g);
  ensureVisitorAppearances(g);
}
export function eligibleVisitors(g) {
  return g.visitorPool
    .map((p) => {
      const record = g.guestRoster.find((r) => r.id === p.id);
      return {
        ...p,
        profile: record?.profile || p.profile,
        record,
        availableAt: record ? record.nextVisitAt : 0,
      };
    })
    .filter(
      (p) =>
        p.availableAt !== null &&
        p.availableAt <= g.time &&
        !g.guests.some((v) => v.id === p.id),
    )
    .sort((a, b) => a.availableAt - b.availableAt || a.id - b.id);
}
export function validateVisitorPool(g) {
  if (
    !Array.isArray(g.visitorPool) ||
    g.visitorPool.length < INITIAL_VISITORS ||
    g.visitorPool.length > 100000
  )
    throw Error("Invalid visitor pool.");
  const ids = new Set();
  for (const p of g.visitorPool) {
    const record = g.guestRoster.find((r) => r.id === p?.id);
    if (
      !p ||
      !Number.isSafeInteger(p.id) ||
      p.id < 1 ||
      p.id >= g.nextId ||
      ids.has(p.id) ||
      typeof p.name !== "string" ||
      !p.name.length ||
      p.name.length > 80 ||
      !p.profile?.skills ||
      Object.keys(p.profile.skills).sort().join(",") !==
        "accuracy,imagination,length" ||
      Object.values(p.profile.skills).some((v) => typeof v !== "boolean") ||
      !p.profile.trained ||
      Object.entries(p.profile.trained).some(
        ([k, v]) =>
          !["length", "accuracy", "imagination"].includes(k) ||
          v !== true ||
          !p.profile.skills[k],
      ) ||
      (record && record.name !== p.name)
    )
      throw Error("Invalid visitor pool record.");
    validatePersonality(p.personality);
    validateAppearance(p.appearance);
    ids.add(p.id);
  }
  for (const v of g.guests) validateAppearance(v.appearance);
  if (g.guests.some((v) => !ids.has(v.id)))
    throw Error("Visitor is missing from the pool.");
}

export function inviteVisitor(g, memberId, tier) {
  const id = g.nextId++,
    index = g.visitorPool.length;
  let seed = (g.rng ^ Math.imul(id, 2654435761)) >>> 0;
  const roll = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const surnames = [
    "Reed",
    "Brooks",
    "Morgan",
    "Wells",
    "Bennett",
    "Hayes",
    "Parker",
    "Ellis",
    "Miller",
    "Cooper",
    "Ward",
    "Lane",
  ];
  const p = {
    id,
    name:
      NAMES[index % NAMES.length] +
      " " +
      surnames[Math.floor(index / NAMES.length - 1) % surnames.length],
    profile: {
      skills: {
        length: roll() > 0.5,
        accuracy: roll() > 0.5,
        imagination: roll() > 0.5,
      },
      trained: {},
    },
    invitation: { memberId, tier },
  };
  g.visitorPool.push(p);
  ensurePersonalities(g);
  ensureVisitorAppearances(g);
  return p;
}
