// Regional substitutions listed in the supplied manual, printed page 19.
export const ENVIRONMENTS = Object.freeze({
  parklands: { name: "Parklands", scenery: "Leafy trees, lush grass and a traditional clubhouse", recreation: "tennis-court" },
  links: { name: "Links", scenery: "Open, windswept grassland, low gorse and stone buildings", recreation: "stable" },
  desert: { name: "Desert", scenery: "Dry ground and sparse desert scrub", recreation: "spa" },
  tropical: { name: "Tropical", scenery: "Palms, turquoise water, pale shores and thatched timber buildings", recreation: "swim-club" },
});
const recreation = new Set(
  Object.values(ENVIRONMENTS).map((e) => e.recreation),
);
export function validateEnvironment(environment) {
  if (
    environment !== undefined &&
    environment !== null &&
    (typeof environment !== "string" ||
      !Object.hasOwn(ENVIRONMENTS, environment))
  )
    throw Error("Invalid course environment.");
}
export function availableInEnvironment(g, tool) {
  if (tool === "church" && g.environment != null)
    return g.environment === "links";
  // Old prototype saves retain their mixed catalogs and placed buildings.
  return (
    g.environment == null ||
    !recreation.has(tool) ||
    ENVIRONMENTS[g.environment]?.recreation === tool
  );
}
