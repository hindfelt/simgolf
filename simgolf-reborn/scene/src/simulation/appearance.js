// Field ranges and color names come from the original progolfers.dta header.
// Hex colors and 3D proportions are our stylized rendering interpretation.
export function validateAppearance(a) {
  const limits = { body: 7, skin: 3, hat: 9, shirt: 9, pants: 9 };
  if (
    !a ||
    Array.isArray(a) ||
    Object.keys(a).sort().join(",") !== Object.keys(limits).sort().join(",") ||
    Object.entries(limits).some(
      ([k, max]) => !Number.isInteger(a[k]) || a[k] < 0 || a[k] > max,
    )
  )
    throw Error("Invalid golfer appearance.");
  return a;
}
export function appearanceStyle(a) {
  validateAppearance(a);
  return {
    skin: [0xe5b68c, 0xc99665, 0xa66f47, 0x63412f][a.skin],
    hat: [
      0x25262a, 0x97c4e5, 0x3566b0, 0xa6c96a, 0x418447, 0xe28a32, 0xb7423b,
      0xe2ca4b, 0xece19c, 0xf0ebdd,
    ][a.hat],
    shirt: [
      0xf0ebdd, 0xe2ca4b, 0xe28a32, 0xe6af8c, 0xb7423b, 0x418447, 0x388c88,
      0x3566b0, 0x87649c, 0x25262a,
    ][a.shirt],
    pants: [
      0x25262a, 0x3566b0, 0x97c4e5, 0x418447, 0xa6c96a, 0x76573b, 0xb7423b,
      0xc7b087, 0xe2ca4b, 0xf0ebdd,
    ][a.pants],
    female: a.body >= 4,
    longSleeves: [0, 4].includes(a.body),
    shorts: [3, 5].includes(a.body),
    knickers: a.body === 1,
    skirt: a.body === 7,
    tank: a.body === 7,
  };
}

export function visitorAppearance(skills, seed) {
  let state = seed >>> 0;
  const choice = (n) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return Math.floor((state / 4294967296) * n);
  };
  const { length, accuracy, imagination } = skills;
  // Verified skill/clothing cues. Other prototype combinations use an
  // unclassified long-sleeved style; do not change skills to fit clothing.
  const body =
    length && accuracy && imagination
      ? 2
      : length && imagination
        ? 3
        : length && accuracy
          ? 1
          : accuracy && imagination
            ? 4 + choice(4)
            : 0;
  return {
    body,
    skin: choice(4),
    hat: choice(10),
    shirt: choice(10),
    pants: choice(10),
  };
}
export function ensureVisitorAppearances(g) {
  for (const p of g.visitorPool)
    p.appearance ??= visitorAppearance(
      p.profile.skills,
      g.rng ^ Math.imul(p.id, 2246822519),
    );
  for (const v of g.guests || []) {
    const p = g.visitorPool.find((p) => p.id === v.id);
    if (p && v.appearance === undefined)
      v.appearance = structuredClone(p.appearance);
  }
}

export const APPEARANCE_OPTIONS = {
  body: [
    "Long sleeves and pants",
    "Knickers",
    "Short sleeves and pants",
    "Short sleeves and shorts",
    "Women: long sleeves and pants",
    "Women: short sleeves and shorts",
    "Women: short sleeves and pants",
    "Women: tank top and skirt",
  ],
  skin: ["Light", "Golden", "Brown", "Dark"],
  hat: [
    "Black",
    "Light blue",
    "Blue",
    "Light green",
    "Green",
    "Orange",
    "Red",
    "Yellow",
    "Pale yellow",
    "White",
  ],
  shirt: [
    "White",
    "Yellow",
    "Orange",
    "Peach",
    "Red",
    "Green",
    "Teal",
    "Blue",
    "Purple",
    "Black",
  ],
  pants: [
    "Black",
    "Blue",
    "Light blue",
    "Green",
    "Light green",
    "Brown",
    "Red",
    "Tan",
    "Yellow",
    "White",
  ],
};
export function setVisitorAppearance(g, golferId, appearance) {
  const p = g.visitorPool.find((p) => p.id === golferId);
  if (!p)
    return { ok: false, message: "Choose a golfer from your visitor pool." };
  try {
    validateAppearance(appearance);
  } catch (error) {
    return { ok: false, message: error.message };
  }
  p.appearance = structuredClone(appearance);
  for (const v of g.guests)
    if (v.id === golferId) v.appearance = structuredClone(appearance);
  g.revision++;
  return { ok: true, message: p.name + "’s appearance saved." };
}
