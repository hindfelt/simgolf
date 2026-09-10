import {originalHoleRecordObservations} from './original-hole-observations.js';
import {originalSgaReport} from './original-sga.js';

// Composition of 0x44f480's record loop and report. Inputs are original records,
// not browser time/mood/building counts. See sga-evaluation-executable.md.
export function originalSgaFromRecords({records, holeCount, facilityMask, difficulty, combineContrasts}) {
  if (!Array.isArray(records) || records.length !== 18 ||
      !Number.isInteger(facilityMask) || facilityMask < 0 || facilityMask > 0xffffffff)
    throw Error('Invalid original SGA records.');
  const holes = [];
  for (const record of records) {
    if (!(record instanceof Uint8Array) || record.byteLength !== 520)
      throw Error('Invalid original hole record.');
    const view = new DataView(record.buffer, record.byteOffset, record.byteLength);
    if (view.getInt8(0) === 0) continue;
    const ratings = originalHoleRecordObservations(record, {difficulty, combineContrasts});
    const count = view.getInt32(0x20, true);
    const extra = view.getInt32(0x24, true);
    const time = view.getInt32(0x1ec, true);
    const length = view.getInt16(4, true);
    if ([count, extra, time, length].some(n => n < 0)) throw Error('Invalid original hole totals.');
    holes.push({length, ratings,
      minutes: count ? Math.trunc(Math.trunc(time / count) / 40) : 0,
      funPercent: count ? Math.trunc(100 * view.getInt16(0x158, true) / (count + Math.trunc(extra / 2) + 4)) : 0,
      scenic: view.getInt16(0xee, true) + Math.trunc(view.getInt16(0x104, true) / 2) + view.getInt16(0x110, true) >= 8,
      variety: view.getInt32(0x1fc, true) < 2,
    });
  }
  if (!holes.length) throw Error('Original SGA evaluation needs an active hole.');
  const sum = key => holes.reduce((n,h) => n + h[key],0);
  const measurements = {holes:holeCount, length:sum('length'), minutes:sum('minutes'),
    funPercent:Math.trunc(sum('funPercent') / holes.length),
    scenic:sum('scenic'), variety:sum('variety'),
    lengthHoles:holes.filter(h=>h.ratings.qualifyingSkills[0]).length,
    accuracyHoles:holes.filter(h=>h.ratings.qualifyingSkills[1]).length,
    imaginationHoles:holes.filter(h=>h.ratings.qualifyingSkills[2]).length,
    facilities:Array.from({length:14},(_,i)=>(facilityMask >>> (i+6)) & 1).reduce((a,b)=>a+b,0)};
  return {measurements, holes, report:originalSgaReport(measurements)};
}
