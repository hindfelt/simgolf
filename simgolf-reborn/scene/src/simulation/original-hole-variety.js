import {originalHeading} from "./original-heading.js";
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

// 0x413768–0x413814: dogleg side from tee→green minus bend→green heading.
// The original 0x071c71c6 threshold is about ten degrees, strictly exceeded.
export function originalDoglegFlags({flags, teeToGreenHeading, bendToGreenHeading, bendAtGreen}) {
  if (![flags,teeToGreenHeading,bendToGreenHeading].every(n=>Number.isInteger(n) && n >= 0 && n <= 0xffffffff) ||
      typeof bendAtGreen !== 'boolean') throw Error('Invalid original dogleg inputs.');
  const turn = bendAtGreen ? 0 : (teeToGreenHeading - bendToGreenHeading) | 0;
  let result = (flags & ~0x60) >>> 0;
  if (turn > 0x071c71c6) result = (result | 0x20) >>> 0;
  if (turn < -0x071c71c6) result = (result | 0x40) >>> 0;
  return result;
}

export function originalDoglegFromPoints({tee, bend, green, flags = 0}) {
  if (![tee,bend,green].every(p => p && [p.x,p.z].every(n =>
      Number.isInteger(n) && n >= -0x80000000 && n <= 0x7fffffff)))
    throw Error('Invalid original course points.');
  const teeToGreenHeading = originalHeading((green.x-tee.x)|0, (green.z-tee.z)|0);
  const bendToGreenHeading = originalHeading((green.x-bend.x)|0, (green.z-bend.z)|0);
  return {teeToGreenHeading, bendToGreenHeading,
    flags: originalDoglegFlags({flags,teeToGreenHeading,bendToGreenHeading,
      bendAtGreen:bend.x===green.x && bend.z===green.z})};
}

export function originalHoleVarietyFromRecords({record, previousRecord, holeNumber,
  classification, previousClassification, difficulty}) {
  const read = bytes => {
    if (!(bytes instanceof Uint8Array) || bytes.byteLength !== 520)
      throw Error('Invalid original variety record.');
    return new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  };
  const current = read(record), previous = read(previousRecord);
  const heading = v => originalHeading((v.getInt32(24,true)-v.getInt32(8,true))|0,
    (v.getInt32(28,true)-v.getInt32(12,true))|0);
  return originalHoleVariety({holeNumber,classification,previousClassification,difficulty,
    starts:current.getInt32(32,true), flags:current.getUint32(512,true),
    previousFlags:previous.getUint32(512,true), feature132:current.getInt16(306,true),
    feature134:current.getInt16(308,true), par:current.getInt8(0),previousPar:previous.getInt8(0),
    heading:heading(current),previousHeading:heading(previous)});
}
