// Presentation only: changing the coast palette must not change lies or saves.
export const COAST_WATER = "#36576b";

// Exposed water/land edges, excluding bridges and the artificial map boundary.
export function coastalBanks(g, grid) {
  if (g.landscapeStyle !== "coast") return [];
  const banks = [];
  const wet = (c, r) => g.tiles[r * grid.width + c]?.type === "water";
  for (const [id, t] of Object.entries(g.tiles)) {
    if (t.type !== "water" || g.bridges?.[id]) continue;
    const c = Number(id) % grid.width,
      r = Math.floor(Number(id) / grid.width);
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nc = c + dc,
        nr = r + dr;
      if (
        nc < 0 ||
        nc >= grid.width ||
        nr < 0 ||
        nr >= grid.height ||
        wet(nc, nr)
      )
        continue;
      if (g.bridges?.[nr * grid.width + nc]) continue;
      banks.push({ c, r, dc, dr });
    }
  }
  return banks;
}
