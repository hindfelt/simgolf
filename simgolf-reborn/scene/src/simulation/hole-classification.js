// Names/skill combinations: supplied golf.exe tutorial strings.
// 0.5 cutoff: archived fan tips; Classic >=1 in all skills: Sid Meier notes.
// Boundary behavior and minimum original sample counts remain unverified.
export function classifyHole(report) {
  const ratings = ["length", "accuracy", "imagination"].map(
    (skill) => report.skills.find((r) => r.skill === skill)?.advantage,
  );
  if (ratings.some((v) => !Number.isFinite(v)))
    return {
      name: null,
      reason: "Awaiting golfers with and without each skill.",
    };
  if (ratings.every((v) => v >= 1))
    return {
      name: "Classic",
      reason: "All three skill advantages reach 1.00.",
    };
  const mask = ratings.reduce((mask, v, i) => mask | (v > 0.5 ? 1 << i : 0), 0);
  const names = [
    "Breather",
    "Freeway",
    "Precise",
    "Challenge",
    "Creative",
    "Heroic",
    "Strategic",
  ];
  if (mask === 7)
    return {
      name: null,
      reason:
        "All three skills exceed 0.50, but not all reach the confirmed Classic target of 1.00.",
    };
  return {
    name: names[mask],
    reason:
      "Based on observed skill advantages above 0.50; threshold behavior remains provisional.",
  };
}
