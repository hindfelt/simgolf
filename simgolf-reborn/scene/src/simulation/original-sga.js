// golf.exe 0x44f440 and 0x450985–0x4527c6. See source observation notes.
// Inputs are original report measurements, NOT raw browser simulation totals.
const clamp = n => Math.max(0, Math.min(10, n));
function integer(value, name, min = 0, max = 1000000) {
  if (!Number.isSafeInteger(value) || value < min || value > max)
    throw Error(`Invalid SGA ${name}.`);
  return value;
}
export function originalSgaTargets(holes) {
  integer(holes, 'hole count', 1, 18);
  const category = holes <= 5 ? 0 : holes <= 9 ? 1 : holes <= 17 ? 2 : 3;
  const desiredHoles = [5, 9, 17, 18][category];
  const qualityHoles = category === 2 ? holes : desiredHoles;
  const length = Math.trunc(100 * desiredHoles / 18) * (57 + 5 * category);
  return {category, desiredHoles, qualityHoles, length,
    minimumLength: length - (holes === 18 ? 1000 : Math.trunc(10 * length / (20 + 5 * category))),
    holePenalty: 4 - category, facilities: Math.trunc(qualityHoles / 2) + 1};
}
export function originalSgaReport(measurements) {
  const m = measurements;
  const targets = originalSgaTargets(m.holes);
  for (const key of ['length', 'minutes', 'variety', 'scenic', 'lengthHoles', 'accuracyHoles', 'imaginationHoles', 'facilities'])
    integer(m[key], key);
  integer(m.funPercent, 'fun percentage', -1000000);
  const t = targets;
  let timeGrade = 10 - Math.trunc((m.minutes - 235) / 6);
  if (timeGrade === 0 && m.minutes <= 300) timeGrade++;
  const grades = {
    length: clamp(t.category === 3 ? 10 - Math.trunc((t.length - m.length) / 100) :
      10 + Math.trunc(5 * (m.length - t.length) * (t.category + 4) / t.length)),
    holes: clamp(10 - Math.abs(t.desiredHoles - m.holes) * t.holePenalty),
    time: clamp(timeGrade),
    fun: clamp(10 + Math.trunc((m.funPercent - 109) / 10)),
  };
  for (const key of ['variety', 'scenic', 'lengthHoles', 'accuracyHoles', 'imaginationHoles'])
    grades[key] = clamp(m[key] - t.qualityHoles + 10);
  grades.facilities = clamp(2 * (m.facilities - (t.facilities - 1)) + 8);
  const unacceptable = Object.keys(grades).filter(key => grades[key] === 0);
  const score = unacceptable.length ? 0 : Object.values(grades).reduce((a,b) => a+b, 0);
  const names = ['SGA Qualifying School', 'Jr. Tour Event', 'Jr. Tour Championship!',
    'SGA Amateur Championship', 'Senior SGA Tour Event', 'Senior SGA Championship',
    'SGA Tour Event', 'SGA Players Championship', 'SGA Championship!'];
  const index = Math.trunc((score - 40) / 5) - 1;
  const recommendation = score === 0 ? 'Improvement Required.' : index >= 9 && index <= 11 ?
    (m.holes === 18 ? 'Grand Slam Championship!' : 'Mini Slam Championship!') : names[index] ?? 'Jr. Qualifying School';
  return {targets, grades, unacceptable, score, recommendation};
}
