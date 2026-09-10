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

// 0x426b39–0x426b6f clamps the recorded signed score to 0..9 and
// selects a histogram row with the low FOUR bits of the golfer's flags.
// Rows 8..15 are outside the eight groups consumed by the SGA calculation.
export function originalScoreSlot(score, golferFlags) {
  if (!Number.isInteger(score) || score < -128 || score > 127 ||
      !Number.isInteger(golferFlags) || golferFlags < 0 || golferFlags > 255)
    throw Error('Invalid original golfer score.');
  const row = golferFlags & 15;
  const bin = Math.max(0, Math.min(9, score));
  return {row, bin, includedInSga: row < 8 && bin > 0};
}

// Read the eight report groups directly from an original 520-byte hole record.
// No gameplay-state mapping or assumptions about the original flags are made.
export function originalHoleRecordObservations(record, options) {
  if (!(record instanceof Uint8Array) || record.byteLength !== 520)
    throw Error('Invalid original hole record.');
  const view = new DataView(record.buffer, record.byteOffset, record.byteLength);
  const histogram = Array.from({length:8}, (_,mask) =>
    Array.from({length:9}, (_,score) => view.getInt16(0x28 + 22 * mask + 2 * (score + 1), true)));
  return originalHoleObservations({...options, par:view.getInt8(0), histogram});
}
