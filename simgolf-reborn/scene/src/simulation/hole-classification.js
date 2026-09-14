// golf.exe 0x44f486–0x44f499, 0x44f7ff–0x44f97f, 0x44fff9–0x45001e.
// Live reports use par-seeded exact cohorts; legacy callers may pass means.
// See sga-evaluation-executable.md for adapter assumptions.
export function classifyHole(report, {difficulty = 1} = {}) {
  if (!Number.isInteger(difficulty) || difficulty < 0 || difficulty > 3)
    throw Error('Invalid course classification difficulty.');
  const ratings = ['length', 'accuracy', 'imagination'].map(
    skill => report.skills.find(r => r.skill === skill)?.advantage,
  );
  if (ratings.some(v => !Number.isFinite(v)))
    return {name: null, reason: 'Awaiting golfers with and without each skill.'};
  const threshold = difficulty === 0 ? 0.25 : 0.5;
  let mask = 0, minimum = 1, weakest = 0;
  ratings.forEach((rating, i) => {
    const bit = 1 << i;
    if (rating >= threshold) mask |= bit;
    // Strict comparison preserves the first skill in a tie.
    if (rating < minimum) {minimum = rating; weakest = bit;}
  });
  if (minimum < 1) mask &= ~weakest;
  const names = ['Breather', 'Freeway', 'Precise', 'Challenge', 'Creative', 'Heroic', 'Strategic', 'Classic'];
  return {name: names[mask], reason: mask === 7
    ? 'All three skill advantages reach 1.00.'
    : `Skills qualify at ${threshold.toFixed(2)}; the weakest is excluded below 1.00. ${report.original ? 'Ratings use par-seeded skill groups.' : 'Ratings use observed golfer averages.'}`};
}
