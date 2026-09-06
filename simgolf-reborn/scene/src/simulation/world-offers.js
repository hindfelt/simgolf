// Static reconstruction of golf.exe 0x46ea60; see property-identities.md.
// The original World Screen multiplies stored costs by 100 for display.
import catalog from "../content/original-properties.json" with { type: "json" };

import { originalRandom } from "./original-rng.js";

export const ORIGINAL_SLOT_COSTS = Object.freeze([
  500, 600, 700, 800, 1200, 1500, 2000, 2500, 3000, 4000, 5000, 6000, 7000,
  8000, 9000, 10000,
]);

export function createOriginalWorldOffers(seed, { originalFlags = 0 } = {}) {
  for (const value of [seed, originalFlags]) {
    if (!Number.isInteger(value) || value < 0 || value > 0xffffffff)
      throw Error("World seed and flags must be unsigned 32-bit integers.");
  }
  const rng = originalRandom(seed);
  const pick = () => rng.next(16);
  const offers = Array(16).fill(null);
  const used = new Set();
  const groups = new Set();
  const assign = (slot, tableIndex) => {
    const property = catalog.properties[tableIndex];
    const [groupCode, acreageCode, setupCode] =
      property.undecodedBytes.slice(4);
    const adjustment = slot < 4 ? 10 : 20;
    const acres =
      originalFlags & 0x1000000
        ? 250
        : (slot + 4) * 10 +
          (acreageCode === 0
            ? adjustment
            : acreageCode === 2
              ? -adjustment
              : 0);
    offers[slot] = {
      slot,
      tableIndex,
      originalId: property.originalId,
      acres,
      costUnits: ORIGINAL_SLOT_COSTS[slot],
      priceSimoleons: ORIGINAL_SLOT_COSTS[slot] * 100,
      environment: property.environment,
      geography: property.geography,
      relief: property.relief,
      groupCode,
      acreageCode,
      setupCode,
    };
    used.add(tableIndex);
    groups.add(groupCode);
  };
  // The last four slots are generated first, one per original group code.
  for (let slot = 12; slot < 16; slot++) {
    let index;
    do {
      index = pick();
    } while (groups.has(catalog.properties[index].undecodedBytes[4]));
    assign(slot, index);
  }
  for (let slot = 0; slot < 12; slot++) {
    let index;
    do {
      index = pick();
    } while (
      used.has(index) ||
      (slot === 0 && catalog.properties[index].undecodedBytes[4] !== 0)
    );
    assign(slot, index);
  }
  return { seed, originalFlags, rngState: rng.state, draws: rng.draws, offers };
}
