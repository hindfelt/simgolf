import catalog from "../content/original-properties.json" with { type: "json" };
import { originalPropertyEdgeStage } from "./original-property-edge-stage.js";
import { originalStartLocation } from "./original-start-location.js";
import { originalBuildingPlacement } from "./original-building-placement.js";

// Composition through 0x470e26. Caller supplies the still-unresolved companion
// state at placement entry, runtime metadata, extensions and height mode.
export function originalPropertyClubhouseStage(options, placementState) {
  const stage = originalPropertyEdgeStage(options);
  const location = originalStartLocation({
    terrain: stage.terrain,
    flags: stage.flags,
    baseCode: stage.baseCode,
    seed: stage.rngState,
    terrainMetadata: placementState.metadata,
    existingType: placementState.existingType,
  });
  const placed = originalBuildingPlacement({
    ...placementState,
    terrain: stage.terrain,
    flags: stage.flags,
    heights: stage.heights,
    row: location.row,
    column: location.column,
    type: 15,
    baseSize: location.size,
    placementFlags: 0x60,
    seed: location.rngState,
    originalFlags: options.originalFlags ?? 0,
    environmentCode: ["parkland", "desert", "tropical", "links"].indexOf(
      catalog.properties[options.tableIndex].environment,
    ),
  });
  // The caller updates record zero literally, even if allocation chose another.
  placed.records[7] |= 0x40;
  placed.flags[location.row * 50 + location.column] &= ~0x20;
  const terrainMemory = stage.terrainMemory.slice();
  terrainMemory.set(placed.terrain, 50);
  return {
    ...stage,
    ...placed,
    terrainMemory,
    stage: "before-property-bonuses",
    draws: stage.draws + location.draws + placed.draws,
    clubhouse: {
      row: location.row,
      column: location.column,
      index: placed.index,
    },
    placementSearch: location,
    // Original coordinate writes at 0x470df8–0x470e21, semantics pending.
    originalCoordinates: {
      at576ba8: [location.row, location.column],
      at576ba0: [location.row, location.column],
      at4c1b98: [location.row + 6, location.column - 4],
    },
  };
}
