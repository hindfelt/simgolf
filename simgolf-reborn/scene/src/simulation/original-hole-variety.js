// golf.exe 0x42da36–0x42db3c. Two record feature fields retain their offsets
// until their original meanings are verified. Headings use the original uint32 turn.
export function originalHoleVariety(input) {
  const {holeNumber, starts, classification, previousClassification, flags, previousFlags,
    feature132, feature134, par, previousPar, heading, previousHeading, difficulty} = input;
  const integer = (n,min,max) => Number.isInteger(n) && n >= min && n <= max;
  if (!integer(holeNumber,1,18) || !integer(starts,0,0x7fffffff) ||
      ![classification,previousClassification].every(n=>integer(n,0,7)) ||
      ![flags,previousFlags,heading,previousHeading].every(n=>integer(n,0,0xffffffff)) ||
      ![feature132,feature134].every(n=>integer(n,-32768,32767)) ||
      ![par,previousPar].every(n=>integer(n,0,9)) || !integer(difficulty,0,3))
    throw Error('Invalid original hole variety inputs.');
  if (holeNumber === 1) return {penalty:0, qualifies:true, similarities:[]};
  const similarities = [];
  if (classification === previousClassification && starts >= 8) similarities.push('classification');
  if (((flags ^ previousFlags) & 0x60) === 0) similarities.push('flags60');
  if (feature132 === 0 && feature134 === 0) similarities.push('emptyFeatures');
  if (par === previousPar) similarities.push('par');
  // Subtract with int32 wrap, then arithmetic shift; floor on negative values
  // is intentional. Do not replace this with absolute floating-point degrees.
  if (Math.abs((heading - previousHeading) >> 24) < 40) similarities.push('heading');
  const penalty = Math.max(0, similarities.length - (difficulty < 2 ? 1 : 0));
  return {penalty, qualifies:penalty < 2, similarities};
}
