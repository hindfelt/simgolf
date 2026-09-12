import { originalGreenTurnStep } from "./original-putting.js";

const int32 = n => Number.isInteger(n) && n >= -0x80000000 && n <= 0x7fffffff;

// 0x42c13a–0x42c275. Called after position movement in the original
// ground branch. Slope inputs are outputs of 0x40c140, not browser gradients.
export function originalGroundResponse({
  speed, heading, angularOffset, terrainCode, originTerrainCode,
  rollCoefficient, forwardSlope, crossSlope, boundaryFlags, phaseCounter, seed,
}) {
  if (!Number.isInteger(heading) || heading < 0 || heading > 0xffffffff ||
      ![speed, forwardSlope, crossSlope, boundaryFlags].every(int32) ||
      !Number.isInteger(rollCoefficient) || rollCoefficient < -128 || rollCoefficient > 127 ||
      !Number.isInteger(originTerrainCode) || originTerrainCode < -128 || originTerrainCode > 127)
    throw Error("Invalid original ground response fields.");
  let resistance = Math.max(0, Math.min(99, (rollCoefficient - forwardSlope) | 0));
  if (resistance < 2 && boundaryFlags !== 0) resistance = 2;
  // Origin (0x577fcc/d0) is checked separately from the current ball cell.
  // A shot originating on green ignores these directional slope responses.
  if (originTerrainCode === 1) {
    resistance = rollCoefficient;
    crossSlope = 0;
  }
  const slopeTurn = Math.trunc((crossSlope << 26) / 2);
  const adjustedHeading = (heading - slopeTurn) >>> 0;
  speed = resistance < 5
    ? (speed - Math.trunc((speed >> resistance) / 2)) | 0
    : (speed + Math.trunc((64 - (speed >> 5)) / 2)) | 0;
  const turn = originalGreenTurnStep({
    heading: adjustedHeading, angularOffset, terrainCode, phaseCounter, seed,
  });
  return { ...turn, speed, resistance };
}

// 0x42ca6c–0x42ca97, after bounce/collision processing. A small horizontal
// speed alone is insufficient: both vertical fields must be exactly zero.
export function originalBallStopped({ speed, height, verticalSpeed }) {
  if (![speed, height, verticalSpeed].every(int32))
    throw Error("Invalid original ball stop fields.");
  return speed < 64 && height === 0 && verticalSpeed === 0;
}
