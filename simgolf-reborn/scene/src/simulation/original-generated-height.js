import { originalElevationSettings } from "./original-elevation.js";

// Generated-height branch of 0x40be60 (the stored/edited-height branch is separate).
// Callers provide both terrain bytes, including the adjacent row's byte at map edges.
export function createOriginalGeneratedHeight({
  slot,
  relief,
  environment,
  originalFlags = 0,
  originalMinimumHeightFlag,
  noise,
}) {
  const settings = originalElevationSettings(slot, relief, originalFlags);
  if (!["parkland", "desert", "tropical", "links"].includes(environment))
    throw Error("Invalid original environment.");
  if (typeof originalMinimumHeightFlag !== "boolean")
    throw Error("Original minimum-height flag must be explicit.");
  if (!noise || typeof noise.sample !== "function")
    throw Error("Original noise sampler required.");
  return ({ row, column, terrainCode, nextRowTerrainCode }) => {
    if (![row, column].every(Number.isInteger))
      throw Error("Integer tile coordinates required.");
    if (originalFlags & 1 || row < 0 || row >= 50 || column < 0 || column >= 50)
      return 3;
    if (
      ![terrainCode, nextRowTerrainCode].every(
        (v) => Number.isInteger(v) && v >= 0 && v <= 255,
      )
    )
      throw Error("Original terrain bytes required.");
    if ([17, 18, 19].includes(terrainCode) || nextRowTerrainCode === 17)
      return 3;
    let value = noise.sample(
      row * settings.coordinateScale,
      column * settings.coordinateScale,
    );
    if (!Number.isInteger(value) || value < 0 || value > 512)
      throw Error("Invalid original noise sample.");
    if (environment === "desert" && column < 16)
      value += Math.trunc(-((16 - column) * settings.divisor) / 6);
    return Math.max(
      originalMinimumHeightFlag ? 4 : 3,
      Math.min(15, Math.trunc(value / settings.divisor) + 1),
    );
  };
}
