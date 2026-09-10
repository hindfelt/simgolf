// Original SGA input calculation, golf.exe 0x44f592–0x44f983.
// Histogram is eight original skill masks, each containing counts for scores 1..9.
// Both switches are explicit: original difficulty and global 0x59d208 bit 0x40.
export function originalHoleObservations({par, histogram, difficulty, combineContrasts}) {
  if (!Number.isInteger(par) || par < 1 || par > 9 ||
      !Number.isInteger(difficulty) || difficulty < 0 || difficulty > 3 ||
      typeof combineContrasts !== 'boolean' ||
      !Array.isArray(histogram) || histogram.length !== 8 ||
      histogram.some(row => !Array.isArray(row) || row.length !== 9 ||
        row.some(n => !Number.isInteger(n) || n < 0 || n > 32767)))
    throw Error('Invalid original hole observations.');
  // Eight virtual par scores damp the rating until actual scores accumulate.
  const groups = histogram.map(row => {
    let count = 8, strokes = par * 8;
    row.forEach((n, i) => {count += n; strokes += n * (i + 1);});
    return {count, strokes, hundredths: Math.trunc(100 * strokes / count)};
  });
  const advantages = [1, 2, 4].map(bit =>
    groups[7 ^ bit].hundredths - groups[7].hundredths +
    (combineContrasts ? groups[0].hundredths - groups[bit].hundredths : 0));
  const threshold = difficulty === 0 ? 25 : 50;
  const qualifyingSkills = advantages.map(n => n >= threshold);
  const completed = groups.reduce((n, g) => n + g.count - 8, 0);
  const strokes = groups.reduce((n, g) => n + g.strokes - par * 8, 0);
  return {groups, advantages, qualifyingSkills, completed,
    averageHundredths: completed ? Math.trunc(100 * strokes / completed) : 0};
}
