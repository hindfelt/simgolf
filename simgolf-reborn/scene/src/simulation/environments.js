// Regional substitutions listed in the supplied manual, printed page 19.
export const ENVIRONMENTS = Object.freeze({
  parklands: { name: "Parklands", recreation: "tennis-court" },
  links: { name: "Links", recreation: "stable" },
  desert: { name: "Desert", recreation: "spa" },
  tropical: { name: "Tropical", recreation: "swim-club" },
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
