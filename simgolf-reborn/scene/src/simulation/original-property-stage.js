import { originalDifficulty } from "./original-difficulty.js";
import catalog from "../content/original-properties.json" with { type: "json" };
import { originalTerrainPatches } from "./original-terrain-patches.js";
import { originalRiver } from "./original-river.js";
import { originalCoastline } from "./original-coastline.js";
import { createOriginalElevationNoise } from "./original-elevation.js";
import { createOriginalGeneratedHeight } from "./original-generated-height.js";

// Composition through 0x4708b8, before scenery and final acreage boundaries.
// Caller explicitly supplies entry RNG states and surrounding memory; these are
// not inferred from the world-shuffle seed or silently replaced with zeroes.
export function originalPropertyStage({
  tableIndex,
  slot,
  seed,
  noiseSeed,
  originalFlags = 0,
  difficulty,
  terrainMemory,
  initialFlags,
}) {
  if (
    !(terrainMemory instanceof Uint8Array) ||
    terrainMemory.length < 2600 ||
    !(initialFlags instanceof Uint16Array) ||
    initialFlags.length !== 2500
  )
    throw Error(
      "Original stage requires explicit terrain padding and initial flags.",
    );
  const difficultySettings = originalDifficulty(difficulty);
  const property = catalog.properties[tableIndex];
  if (!property) throw Error("Unknown original property.");
  const patches = originalTerrainPatches({
    tableIndex,
    slot,
    seed,
    originalFlags,
    environment: property.environment,
  });
  const memory = terrainMemory.slice();
  memory.set(patches.terrain, 50);
  let flags = initialFlags.map(
    (value, i) => (value & ~patches.flagClearBits[i]) | patches.flagSetBits[i],
  );
  const address = (row, column) => {
    const index = 50 + row * 50 + column;
    if (index < 0 || index >= memory.length)
      throw Error("Original stage accessed unresolved surrounding memory.");
    return index;
  };
  const readTerrain = (r, c) => memory[address(r, c)];
  const writeTerrain = (r, c, value) => {
    memory[address(r, c)] = value;
  };
  const noise = createOriginalElevationNoise(noiseSeed);
  const sampleHeight = createOriginalGeneratedHeight({
    slot,
    relief: property.relief,
    environment: property.environment,
    originalFlags,
    originalMinimumHeightFlag: difficultySettings.code !== 0,
    noise,
  });
  const height = (row, column) => {
    if (row < 0 || row >= 50 || column < 0 || column >= 50) return 3;
    return sampleHeight({
      row,
      column,
      terrainCode: readTerrain(row, column),
      nextRowTerrainCode: readTerrain(row + 1, column),
    });
  };
  const river = originalRiver({
    geography: property.geography,
    environment: property.environment,
    seed: patches.rngState,
    noise,
    readTerrain,
    writeTerrain,
    height,
    updateFlags: (row, column, set, clear) => {
      const i = row * 50 + column;
      if (i < 0 || i >= 2500)
        throw Error("Original river flag write outside map.");
      flags[i] = (flags[i] & ~clear) | set;
    },
  });
  let rngState = river.rngState,
    draws = patches.draws + river.draws;
  if (property.geography === "coastal") {
    const coast = originalCoastline({
      terrain: memory.slice(50, 2550),
      flags,
      seed: rngState,
    });
    memory.set(coast.terrain, 50);
    flags = coast.flags;
    rngState = coast.rngState;
    draws += coast.draws;
  }
  // 0x470873 clears the temporary river flag across all 2500 tiles.
  flags = flags.map((value) => value & ~0x1000);
  const heights = Uint8Array.from({ length: 2601 }, (_, i) =>
    height(Math.floor(i / 51), i % 51),
  );
  return {
    stage: "before-scenery",
    difficulty: difficultySettings.name,
    originalId: property.originalId,
    baseCode: patches.baseCode,
    terrain: memory.slice(50, 2550),
    flags,
    heights,
    terrainMemory: memory,
    rngState,
    draws,
    noiseRngState: noise.rngState,
    noiseDraws: noise.draws,
    riverPath: river.path,
  };
}
