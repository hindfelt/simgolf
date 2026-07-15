import type { SpecialGuestKind } from './types';
import type { CharacterPortraitProfile, CharacterVisualProfile, PortraitExpression } from './characterVisuals';

export interface SpecialGuestDefinition {
  readonly kind: SpecialGuestKind;
  readonly name: string;
  readonly title: string;
  readonly skill: number;
  readonly defaultExpression: PortraitExpression;
  readonly visual: CharacterVisualProfile;
}

/**
 * Canonical marquee-character identities. These profiles are explicit rather
 * than name-hashed so course actors, dialogs, inspectors, and ticker SimFotos
 * cannot drift apart. The caricature cues are based on the original game's
 * public portraits, recreated as original pixel art rather than copied assets.
 */
export const SPECIAL_GUESTS = {
  picky: {
    kind: 'picky',
    name: 'I.M. Picky',
    title: 'County Commissioner',
    skill: 0.58,
    defaultExpression: 'neutral',
    visual: {
      identity: 'special-guest:picky',
      shirt: '#2f506f',
      skin: '#9a6546',
      cap: '#d8d2bd',
      hairTone: '#211916',
      hairHighlight: '#4a342c',
      trim: '#d8d2bd',
      pants: '#343c48',
      accent: '#d2b45f',
      bag: '#6f482e',
      signature: 'commissioner',
      appearance: {
        build: 'broad',
        headwear: 'none',
        hair: 'close',
        outfit: 3,
        face: 4,
        pants: 0,
        bag: 0,
        socks: 0,
      },
    },
  },
  ivana: {
    kind: 'ivana',
    name: 'Ivana Richman',
    title: 'Heiress & Patron',
    skill: 0.74,
    defaultExpression: 'pleased',
    visual: {
      identity: 'special-guest:ivana',
      shirt: '#a94e7b',
      skin: '#d9a47c',
      cap: '#f0d36f',
      hairTone: '#c79b4c',
      hairHighlight: '#e5c77e',
      trim: '#f0d36f',
      pants: '#e8e1d0',
      accent: '#fff2bf',
      bag: '#7f344f',
      signature: 'patron',
      appearance: {
        build: 'classic',
        headwear: 'none',
        hair: 'shoulder',
        outfit: 4,
        face: 3,
        pants: 5,
        bag: 2,
        socks: 0,
      },
    },
  },
} as const satisfies Record<SpecialGuestKind, SpecialGuestDefinition>;

export function isSpecialGuestKind(value: unknown): value is SpecialGuestKind {
  return value === 'picky' || value === 'ivana';
}

export function specialGuestPortrait(
  kind: SpecialGuestKind,
  expression: PortraitExpression = SPECIAL_GUESTS[kind].defaultExpression,
): CharacterPortraitProfile {
  return { ...SPECIAL_GUESTS[kind].visual, expression };
}

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
