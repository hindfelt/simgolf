import { originalRandom } from "./original-rng.js";

// Reconstructed from golf.exe 0x41fa4c–0x41fa65. The normal green terrain
// code remains 1; the alternate selection writes the tile's variant byte.
export function originalGreenVariant(selection) {
  if (!Number.isInteger(selection) || selection < 0 || selection > 0x7fffffff)
    throw Error("Invalid original green selection.");
  return selection & 1 ? 0xff : 0;
}

// 0x4240fe–0x42414a and the putter branch 0x42429e–0x42438c.
// Inputs deliberately expose original fields. Mapping current browser golfer
// profiles and tournament flags to these values is not established yet.
export function originalPuttingAim({
  distanceYards,
  windowBeforeGreen,
  greenVariant = 0,
  ability,
  doubleDistanceFlag = false,
  seed,
}) {
  if (!Number.isInteger(distanceYards) || distanceYards < 0 || distanceYards > 10000 ||
      !Number.isInteger(windowBeforeGreen) || windowBeforeGreen < 10 || windowBeforeGreen > 1024 ||
      !Number.isInteger(greenVariant) || greenVariant < 0 || greenVariant > 255 ||
      !Number.isInteger(ability) || ability < -128 || ability > 127 ||
      typeof doubleDistanceFlag !== "boolean")
    throw Error("Invalid original putting fields.");
  const rng = originalRandom(seed);
  let window = windowBeforeGreen - (greenVariant & 0x80 ? 10 : 0);
  if (ability < 2) window = Math.trunc(window / 2);
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
