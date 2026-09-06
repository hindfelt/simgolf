// Original facility purposes; prices, dimensions and training strength are provisional.
export const FACILITIES = {
  "building-lot": { name: "Building Lot", radius: 1 },
  home: { name: "Home", radius: 1 },
  marina: { name: "Marina", radius: 3, radiusX: 3, radiusZ: 2 },
  church: { name: "Church", radius: 2 },
  helipad: { name: "Helipad", radius: 2 },
  airstrip: { name: "Airstrip", radius: 15, radiusX: 15, radiusZ: 3 },
  "cart-garage": { name: "Cart Garage", radius: 1 },
  "tennis-court": { name: "Tennis Court", radius: 3, recreation: true },
  stable: { name: "Stable", radius: 3, recreation: true },
  spa: { name: "Spa", radius: 3, recreation: true },
  "swim-club": { name: "Swim Club", radius: 3, recreation: true },
  hotel: { name: "Resort Hotel", radius: 2 },
  flowerbed: { name: "Flowerbed", radius: 0, scenery: true },
  ballwasher: { name: "Ballwasher", radius: 0 },
  bench: { name: "Bench", radius: 0 },
  snack: { name: "Snack bar", radius: 1 },
  "pro-shop": { name: "Pro Shop", radius: 1, skill: "accuracy" },
  "driving-range": { name: "Driving Range", radius: 2, skill: "length" },
  "putting-green": { name: "Putting Green", radius: 2, skill: "imagination" },
};
export const TRAINING_FACILITIES = [
  "pro-shop",
  "driving-range",
  "putting-green",
];
export const isFacility = (type) => Object.hasOwn(FACILITIES, type);
export const facilityRadius = (type) => FACILITIES[type]?.radius ?? 0;
export function wantsTraining(v, type) {
  const skill = FACILITIES[type]?.skill;
  return (
    !!skill && !v.pro && !v.paid && !!v.skills[skill] && !v.trained?.[skill]
  );
}
export function completeTraining(v, type) {
  if (!wantsTraining(v, type)) return false;
  const skill = FACILITIES[type].skill;
  v.trained ??= {};
  v.trained[skill] = true;
  v.comment = `The ${FACILITIES[type].name} helped my ${skill}.`;
  return true;
}

// Cleaning is temporary equipment care, not an additional golfer skill.
export function wantsBallwash(v) {
  return (
    !v.paid &&
    (v.pro || v.strokes === 0) &&
    v.cleanedHoleId !== v.holeId &&
    !v.scorecard.some((s) => s.holeId === v.holeId)
  );
}
export function completeBallwash(v) {
  if (!wantsBallwash(v)) return false;
  v.cleanedHoleId = v.holeId;
  v.comment = "A clean ball should help my accuracy on this hole.";
  return true;
}

export function facilityExtents(type, rotation = 0) {
  const f = FACILITIES[type],
    x = f?.radiusX ?? f?.radius ?? 0,
    z = f?.radiusZ ?? f?.radius ?? 0;
  return rotation % 2 ? { x: z, z: x } : { x, z };
}
export function facilityContains(f, c, r, margin = 0) {
  const extent = facilityExtents(f.type, f.rotation || 0);
  return (
    Math.abs(f.c - c) <= extent.x + margin &&
    Math.abs(f.r - r) <= extent.z + margin
  );
}
export function marinaWaterCell(f, c, r) {
  const x = c - f.c,
    z = r - f.r;
  const localZ = [z, x, -z, -x][f.rotation || 0];
  return localZ >= 0;
}
