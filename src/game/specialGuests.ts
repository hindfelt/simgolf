import type { SpecialGuestKind } from './types';

export const SPECIAL_GUESTS: Record<SpecialGuestKind, { name: string; title: string }> = {
  picky: { name: 'I.M. Picky', title: 'County Commissioner' },
  ivana: { name: 'Ivana Richman', title: 'Heiress & Patron' },
};

/** Unowned parcels sharing a full edge with the current property. Diagonal islands
 * are excluded, so every Picky expansion remains a contiguous resort. */
export function adjacentUnownedParcels(owned: ArrayLike<number>, width: number, height: number): number[] {
  const found = new Set<number>();
  for (let index = 0; index < width * height; index++) {
    if (!owned[index]) continue;
    const x = index % width;
    const y = Math.floor(index / width);
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const next = ny * width + nx;
      if (!owned[next]) found.add(next);
    }
  }
  return [...found].sort((a, b) => a - b);
}

export function specialGuestEnjoyed(mood: number, completedCourse: boolean): boolean {
  return completedCourse && mood >= 0.75;
}
