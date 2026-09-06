import { originalBuildingMetadata } from "./original-building-metadata.js";
import { originalBuildingPlacement } from "./original-building-placement.js";
import { originalConnections } from "./original-connections.js";

// The five free-facility branches at 0x470e33–0x470ec7. Other property
// bonuses use different branches and must not be silently treated as absent.
const types = new Map([
  [9, 6],
  [14, 8],
  [2, 13],
  [11, 14],
  [4, 9],
]);
export function originalFreeFacility({
  tableIndex,
  clubhouse,
  state,
  placementOptions,
  connectionOptions,
}) {
  if (!types.has(tableIndex))
    throw Error("Property does not use the original free-facility branch.");
  const type = types.get(tableIndex),
    { row, column } = clubhouse;
  const rightAvailable =
    row >= 0 &&
    row < 50 &&
    column + 5 >= 0 &&
    column + 5 < 50 &&
    state.terrain[row * 50 + column + 5] !== 20;
  const placed = originalBuildingPlacement({
    ...placementOptions,
    ...state,
    row: row - 1,
    column: column + (rightAvailable ? 4 : -5),
    type,
    baseSize: originalBuildingMetadata(type).baseSize,
    sizeExtension: placementOptions.sizeExtensions[type],
    placementFlags: 0,
    seed: state.rngState,
  });
  for (const offset of rightAvailable ? [2, 3, 4] : [-1, -2, -3])
    placed.flags[row * 50 + column + offset] |= 0x20;
  const terrainMemory = state.terrainMemory.slice();
  terrainMemory.set(placed.terrain, 50);
  if (
    !(connectionOptions?.flagMemory instanceof Uint16Array) ||
    connectionOptions.flagMemory.length !== terrainMemory.length
  )
    throw Error(
      "Free facility requires explicit surrounding connection flags.",
    );
  const flagMemory = connectionOptions.flagMemory.slice();
  flagMemory.set(placed.flags, 50);
  const connected = originalConnections({
    terrainMemory,
    flagMemory,
    records: placed.records,
    baseSize: (type) => originalBuildingMetadata(type).baseSize,
    sizeExtension: (type) => placementOptions.sizeExtensions[type],
    terrainSpreadValue: (code) =>
      placementOptions.metadata(code).connectionSpread,
    difficulty: connectionOptions.difficulty,
    originalFlags: placed.originalFlags,
  });
  return {
    ...state,
    ...placed,
    ...connected,
    terrainMemory,
    draws: state.draws + placed.draws,
    stage: "after-free-facility-connection-update",
    needsConnectionUpdate: false,
    freeFacility: {
      type,
      row: row - 1,
      column: column + (rightAvailable ? 4 : -5),
      index: placed.index,
    },
  };
}
