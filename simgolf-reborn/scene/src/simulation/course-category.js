// Official SimGolf hints (31 January 2002), preserved by Backswing.
export function courseCategory(g) {
  const holes = g.holes.filter((h) => h.tee && h.green).length;
  if (holes < 6)
    return { name: "Municipal Course", abbreviation: "MC", skillCap: 6, holes };
  if (holes < 10)
    return { name: "Golf Course", abbreviation: "GC", skillCap: 8, holes };
  if (holes < 18)
    return { name: "Country Club", abbreviation: "CC", skillCap: 10, holes };
  return {
    name: "Championship Course",
    abbreviation: "CC",
    skillCap: Infinity,
    holes,
  };
}
export function effectiveProSkills(g, profile) {
  const { skillCap } = courseCategory(g);
  return Object.fromEntries(
    Object.entries(profile.skills).map(([key, value]) => [
      key,
      Math.min(value, skillCap),
    ]),
  );
}
