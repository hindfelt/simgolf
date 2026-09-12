export const PERSONALITY_TRAITS = [
  "neat",
  "outgoing",
  "active",
  "playful",
  "nice",
];
// Trait names are verified in the retail executable. Scale and compatibility
// thresholds are provisional, pending original-runtime measurement.
export function createPersonality(seed) {
  let state = seed >>> 0;
  return Object.fromEntries(
    PERSONALITY_TRAITS.map((trait) => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return [trait, Math.floor((state / 4294967296) * 11)];
    }),
  );
}
export function ensurePersonalities(g) {
  for (const p of g.visitorPool)
    p.personality ??= createPersonality(g.rng ^ Math.imul(p.id, 2654435761));
}
export function validatePersonality(p) {
  if (
    !p ||
    Array.isArray(p) ||
    Object.keys(p).sort().join(",") !==
      [...PERSONALITY_TRAITS].sort().join(",") ||
    Object.values(p).some((n) => !Number.isInteger(n) || n < 0 || n > 10)
  )
    throw Error("Invalid visitor personality.");
}
export function compatibility(a, b) {
  return (
    1 - PERSONALITY_TRAITS.reduce((n, k) => n + Math.abs(a[k] - b[k]), 0) / 50
  );
}
export function compatibilityHappiness(a, b) {
  const score = compatibility(a, b);
  return score >= 0.7 ? 1 : score <= 0.3 ? -1 : 0;
}
