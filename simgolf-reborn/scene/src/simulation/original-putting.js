import { originalRandom } from "./original-rng.js";

// Reconstructed from golf.exe 0x41fa4c–0x41fa65. The normal green terrain
// code remains 1; the alternate selection writes the tile's variant byte.
export function originalGreenVariant(selection) {
  if (!Number.isInteger(selection) || selection < 0 || selection > 0x7fffffff)
    throw Error("Invalid original green selection.");
  return selection & 1 ? 0xff : 0;
}

// UI at 0x41ae5f–0x41aee5 labels golfer byte 0x577f3e as attitude.
// The upper two jump-table entries both select "invincible".
export function originalAttitudeLabel(attitude) {
  if (!Number.isInteger(attitude) || attitude < -128 || attitude > 127)
    throw Error("Invalid original attitude.");
  return ["furious", "mad", "upset", "worried", "calm", "determined",
    "pumped", "invincible", "invincible"][Math.max(-4, Math.min(4, attitude)) + 4];
}

// Upstream ECX calculation at 0x424071–0x4240db. These are raw executable
// fields, not browser difficulty or happiness. Supported adjustment levels
// are 0..3; wider original runtime values have not been established.
export function originalPuttingWindow({
  stateFlags, adjustmentLevel, golferFlags, golferType, skillFlags, puttingSkill,
}) {
  const byte = n => Number.isInteger(n) && n >= 0 && n <= 255;
  if (!Number.isInteger(stateFlags) || stateFlags < -0x80000000 || stateFlags > 0xffffffff ||
      !Number.isInteger(adjustmentLevel) || adjustmentLevel < 0 || adjustmentLevel > 3 ||
      ![golferFlags, golferType, skillFlags, puttingSkill].every(byte))
    throw Error("Unsupported original putting window fields.");
  let window = stateFlags & 1 ? 10 : 20;
  if ((golferFlags & 4) && adjustmentLevel && (golferType & 0xe0) !== 0x20)
    window += Math.trunc(window / (4 - adjustmentLevel));
  if (skillFlags & 0x10)
    window += Math.trunc(window * puttingSkill / 8);
  return window;
}

// 0x4240fe–0x42414a and the putter branch 0x42429e–0x42438c.
// Inputs deliberately expose original fields. Mapping current browser golfer
// profiles and tournament flags to these values is not established yet.
export function originalPuttingAim({
  distanceYards,
  windowBeforeGreen,
  greenVariant = 0,
  attitude,
  doubleDistanceFlag = false,
  seed,
}) {
  if (!Number.isInteger(distanceYards) || distanceYards < 0 || distanceYards > 10000 ||
      !Number.isInteger(windowBeforeGreen) || windowBeforeGreen < 10 || windowBeforeGreen > 1315 ||
      !Number.isInteger(greenVariant) || greenVariant < 0 || greenVariant > 255 ||
      !Number.isInteger(attitude) || attitude < -128 || attitude > 127 ||
      typeof doubleDistanceFlag !== "boolean")
    throw Error("Invalid original putting fields.");
  const rng = originalRandom(seed);
  let window = windowBeforeGreen - (greenVariant & 0x80 ? 10 : 0);
  if (attitude < 2) window = Math.trunc(window / 2);
  const halfWindow = Math.trunc(window / 2);
  // The original bounded draw consumes RNG even for bound zero.
  const draw = rng.next(Math.max(1, halfWindow));
  const toleranceYards = 4 + halfWindow + (halfWindow ? draw : 0);
  const deviates = distanceYards * (doubleDistanceFlag ? 2 : 1) > toleranceYards;
  let angularOffset = 0;
  if (deviates) {
    const sign = rng.next(2) === 0 ? 1 : -1;
    angularOffset = sign * (150 + rng.next(150)) * 2 ** 18;
    if (distanceYards <= 5) angularOffset = 0;
    if (distanceYards > 15) angularOffset = Math.trunc(angularOffset / 2);
    if (distanceYards > 25) angularOffset = Math.trunc(angularOffset / 2);
    if (distanceYards > 35) angularOffset = Math.trunc(angularOffset / 2);
  }
  return { toleranceYards, angularOffset, deviates, rngState: rng.state, draws: rng.draws };
}

// Ground-motion branch 0x42c230–0x42c275, after movement/friction/slope.
// This is one original update, not a browser frame or a complete putt.
// The putting calculation's angularOffset is persistent curvature state:
// it is added in halves each green update, not once at shot launch.
export function originalGreenTurnStep({ heading, angularOffset, terrainCode, phaseCounter, seed }) {
  const uint32 = n => Number.isInteger(n) && n >= 0 && n <= 0xffffffff;
  if (!uint32(heading) || !uint32(phaseCounter) ||
      !Number.isInteger(angularOffset) || angularOffset < -0x80000000 || angularOffset > 0x7fffffff ||
      !Number.isInteger(terrainCode) || terrainCode < -128 || terrainCode > 127)
    throw Error("Invalid original green turn state.");
  const rng = originalRandom(seed);
  if (terrainCode === 1) {
    heading = (heading + Math.trunc(angularOffset / 2)) >>> 0;
    // Draw even when curvature is zero. The global phase is shared, so it
    // must not reset to zero separately for each golfer or saved shot.
    if ((phaseCounter & 7) === 0 && rng.next(8) === 0)
      angularOffset = -angularOffset | 0;
  }
  return { heading, angularOffset, rngState: rng.state, draws: rng.draws };
}
