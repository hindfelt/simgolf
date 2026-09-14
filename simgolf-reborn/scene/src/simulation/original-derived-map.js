import {
  originalCornerHeight,
  originalHeightExtrema,
  originalDirectionalHeightStage,
} from "./original-corner-height.js";
import { originalSurfacePropagation } from "./original-surface-propagation.js";

// 0x42ec10–0x42ed0a. The extrema call is retained although its values are unused.
export function originalEdgeMask({
  row,
  column,
  readTerrain,
  readHeight,
  cornerHeight,
}) {
  originalHeightExtrema(row, column, readHeight);
  const offsets = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];
  let mask = 0;
  for (let side = 0; side < 4; side++) {
    const [dr, dc] = offsets[side],
      r = row + dr,
      c = column + dc,
      direction = side * 2 - 1;
    if (r < 0 || r >= 50 || c < 0 || c >= 50 || readTerrain(r, c) === 20)
      continue;
    const neighborFirst = cornerHeight(r, c, direction + 6);
    const ownFirst = cornerHeight(row, column, direction);
    if (ownFirst < neighborFirst) mask |= 1 << (side * 2);
    const neighborSecond = cornerHeight(r, c, direction + 4);
    const ownSecond = cornerHeight(row, column, direction + 2);
    if (ownSecond < neighborSecond) mask |= 1 << (side * 2);
  }
  return mask;
}

// Complete 0x42ee80–0x42f01f rebuild. Source height and runtime metadata
// readers remain explicit; this does not assume startup metadata stays fixed.
export function originalDerivedMap({
  terrain,
  ownership,
  readHeight,
  metadata,
  originalFlags,
}) {
  if (
    !(terrain instanceof Uint8Array) ||
    terrain.length !== 2500 ||
    !(ownership instanceof Uint8Array) ||
    ownership.length !== 2500 ||
    typeof readHeight !== "function" ||
    typeof metadata !== "function" ||
    !Number.isInteger(originalFlags) ||
    originalFlags < 0 ||
    originalFlags > 0xffffffff
  )
    throw Error("Original map rebuild requires explicit map data and flags.");
  const readTerrain = (r, c) => terrain[r * 50 + c];
  const readMetadataFlags = (r, c) => metadata(readTerrain(r, c)).flags;
  const first = originalDirectionalHeightStage({
    readHeight,
    readMetadataFlags,
  });
  const propagated = originalSurfacePropagation({
    terrain,
    ownership,
    surfaceHeights: first.surfaceHeights,
    metadata,
  });
  const cornerHeight = (row, column, direction) =>
    originalCornerHeight({
      row,
      column,
      direction,
      readHeight,
      readMetadataFlags,
      readSurfaceHeight: (r, c) => propagated.surfaceHeights[r * 50 + c],
    });
  const edgeMasks = new Uint8Array(2500);
  for (let row = 0; row < 50; row++)
    for (let column = 0; column < 50; column++)
      edgeMasks[row * 50 + column] = originalEdgeMask({
        row,
        column,
        readTerrain,
        readHeight,
        cornerHeight,
      });
  edgeMasks[0] = (edgeMasks[0] & ~2) | 8;
  return {
    surfaceHeights: propagated.surfaceHeights,
    directionHeights: first.directionHeights,
    edgeMasks,
    originalFlags: (originalFlags & ~0x40000) >>> 0,
    invalidatedIndex: -1,
    propagationPasses: propagated.passes,
  };
}
