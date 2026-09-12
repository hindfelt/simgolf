import catalog from "../content/original-properties.json" with { type: "json" };
import { originalPropertyFeatureStage } from "./original-property-feature-stage.js";
import { originalSceneryFlags } from "./original-scenery-flags.js";
import { originalEdgeHeights } from "./original-edge-heights.js";

// Composition through 0x470d69. Placement, bonuses and acreage trimming follow.
export function originalPropertyEdgeStage(options) {
  // Includes 50 bytes before terrain and 51 after it. The earlier passes need
  // only 50 trailing bytes; the edge pass also reads tile address 2550.
  if (
    !(options.terrainMemory instanceof Uint8Array) ||
    options.terrainMemory.length < 2601
  )
    throw Error(
      "Original edge stage requires 50 leading and 51 trailing terrain bytes.",
    );
  const stage = originalPropertyFeatureStage(options);
  const scatter = originalSceneryFlags({
    terrain: stage.terrain,
    flags: stage.flags,
    seed: stage.rngState,
    difficulty: options.difficulty,
    environment: catalog.properties[options.tableIndex].environment,
  });
  const edges = originalEdgeHeights({
    heights: stage.heights,
    seed: scatter.rngState,
    readTerrain: (row, column) => {
      const index = 50 + row * 50 + column;
      if (index < 0 || index >= stage.terrainMemory.length)
        throw Error("Original edge stage accessed unresolved terrain memory.");
      return stage.terrainMemory[index];
    },
  });
  return {
    ...stage,
    stage: "before-placement",
    flags: scatter.flags,
    heights: edges.heights,
    rngState: edges.rngState,
    draws: stage.draws + scatter.draws + edges.draws,
    scatterSelections: scatter.selections,
    edgeChanges: edges.changes,
  };
}
