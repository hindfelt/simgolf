import { originalRandom } from "./original-rng.js";
import { originalDifficulty } from "./original-difficulty.js";

// 0x470b84–0x470c23. The visual meaning of flag 0x0100 is not yet decoded.
export function originalSceneryFlags({
  terrain,
  flags,
  seed,
  difficulty,
  environment,
}) {
  if (
    !(terrain instanceof Uint8Array) ||
    terrain.length !== 2500 ||
    !(flags instanceof Uint16Array) ||
    flags.length !== 2500
  )
    throw Error("Original scatter requires 50×50 terrain and flags.");
  if (!["parkland", "desert", "tropical", "links"].includes(environment))
    throw Error("Invalid original environment.");
  const target = (4 - originalDifficulty(difficulty).code) * 9;
  const eligible = (row, column) => {
    const code = terrain[row * 50 + column];
    return (
      ![20, 21, 22, 4, 18, environment === "desert" ? 11 : 10].includes(code) &&
      !(code === 17 && column <= 6)
    );
  };
  let possible = false;
  for (let row = 2; row <= 47; row++)
    for (let col = 2; col <= 47; col++) possible ||= eligible(row, col);
  if (!possible) throw Error("Original scatter has no eligible tile.");
  const result = flags.slice(),
    rng = originalRandom(seed),
    selections = [];
  let attempts = 0;
  while (selections.length < target) {
    if (attempts++ >= 100000)
      throw Error("Original scatter did not reach its target.");
    const row = rng.next(46) + 2,
      column = rng.next(46) + 2;
    if (!eligible(row, column)) continue;
    result[row * 50 + column] |= 0x100;
    selections.push({ row, column });
  }
  return {
    flags: result,
    selections,
    attempts,
    rngState: rng.state,
    draws: rng.draws,
  };
}
