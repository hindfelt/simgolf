import catalog from "../content/original-properties.json" with { type: "json" };
import { originalPropertyStage } from "./original-property-stage.js";
import { originalFeaturePatches } from "./original-feature-patches.js";
import { originalRandom } from "./original-rng.js";

// Extends the decoded pipeline through 0x470b84. Scenery/bonuses follow later.
export function originalPropertyFeatureStage(options) {
  const stage = originalPropertyStage(options);
  const property = catalog.properties[options.tableIndex];
  const address = (row, column, stride, length) => {
    const i = row * stride + column;
    if (!Number.isInteger(i) || i < 0 || i >= length)
      throw Error("Original feature access outside reconstructed array.");
    return i;
  };
  const tile = (r, c) => address(r, c, 50, 2500);
  const vertex = (r, c) => address(r, c, 51, 2601);
  const features = originalFeaturePatches({
    seed: stage.rngState,
    environment: property.environment,
    tableIndex: options.tableIndex,
    difficulty: options.difficulty,
    readHeight: (r, c) => stage.heights[vertex(r, c)],
    readFlags: (r, c) => stage.flags[tile(r, c)],
    writeTerrain: (r, c, value) => {
      const i = tile(r, c);
      stage.terrain[i] = value;
      stage.terrainMemory[50 + i] = value;
    },
    setFlags: (r, c, bits) => {
      stage.flags[tile(r, c)] |= bits;
    },
    writeHeight: (r, c, value) => {
      stage.heights[vertex(r, c)] = value;
    },
  });
  const rng = originalRandom(features.rngState);
  // 0x470b13 sets sixteen random flag bits. The following full-map cleanup
  // clears the same bit, but those 32 random draws must still be consumed.
  for (let i = 0; i < 16; i++) {
    const column = rng.next(42) + 4,
      row = rng.next(42) + 4;
    stage.flags[tile(row, column)] |= 0x100;
  }
  for (let i = 0; i < 2500; i++) {
    stage.flags[i] &= ~0x100;
    if (stage.terrain[i] === 16) {
      stage.terrain[i] = 13;
      stage.terrainMemory[50 + i] = 13;
    }
  }
  return {
    ...stage,
    stage: "before-scenery-scatter",
    rngState: rng.state,
    draws: stage.draws + features.draws + rng.draws,
    featurePatches: features.patches,
  };
}
