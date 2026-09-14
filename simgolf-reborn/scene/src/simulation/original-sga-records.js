import {originalHoleVarietyFromRecords} from "./original-hole-variety.js";
import {originalHoleRecordObservations} from './original-hole-observations.js';
import {originalSgaReport} from './original-sga.js';

// Composition of 0x44f480's record loop and report. Inputs are original records,
// not browser time/mood/building counts. See sga-evaluation-executable.md.
export function originalSgaFromRecords({records, holeCount, facilityMask, difficulty, combineContrasts, classifications}) {
  if (!Array.isArray(records) || records.length !== 18 ||
      !Number.isInteger(facilityMask) || facilityMask < 0 || facilityMask > 0xffffffff)
    throw Error('Invalid original SGA records.');
  if (classifications !== undefined && (!Array.isArray(classifications) || classifications.length !== 18 ||
      classifications.some(n => !Number.isInteger(n) || n < 0 || n > 7)))
    throw Error('Invalid original course classifications.');
  const holes = [];
  let previousClassification = 0;
  for (const [index, record] of records.entries()) {
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
    const varietyPenalty = classifications === undefined ? view.getInt32(0x1fc, true) :
      originalHoleVarietyFromRecords({record, previousRecord:index ? records[index-1] : new Uint8Array(520),
        holeNumber:index+1, classification:classifications[index], previousClassification, difficulty}).penalty;
    if (classifications) previousClassification = classifications[index];
    holes.push({length, ratings, varietyPenalty,
      minutes: count ? Math.trunc(Math.trunc(time / count) / 40) : 0,
      funPercent: count ? Math.trunc(100 * view.getInt16(0x158, true) / (count + Math.trunc(extra / 2) + 4)) : 0,
      scenic: view.getInt16(0xee, true) + Math.trunc(view.getInt16(0x104, true) / 2) + view.getInt16(0x110, true) >= 8,
      variety: varietyPenalty < 2,
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
