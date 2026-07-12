import { describe, expect, it } from 'vitest';
import { NAMES } from './constants';
import { golferAppearance } from './sprites';

const silhouette = (name: string) => {
  const appearance = golferAppearance(name);
  return [appearance.build, appearance.headwear, appearance.hair].join('|');
};

const fullIdentity = (name: string) => {
  const appearance = golferAppearance(name);
  return [
    appearance.build,
    appearance.headwear,
    appearance.hair,
    appearance.outfit,
    appearance.face,
    appearance.pants,
  ].join('|');
};

describe('named golfer sprite identities', () => {
  it('derives a stable, palette-independent descriptor from the normalized name', () => {
    const appearance = golferAppearance('Big Earl');

    expect(golferAppearance('Big Earl')).toEqual(appearance);
    expect(golferAppearance('  BIG EARL  ')).toEqual(appearance);
    expect(Object.keys(appearance).sort()).toEqual(['build', 'face', 'hair', 'headwear', 'outfit', 'pants']);
  });

  it('uses every build and headwear silhouette across the canonical cast', () => {
    const appearances = NAMES.map(golferAppearance);

    expect(new Set(appearances.map((appearance) => appearance.build))).toEqual(
      new Set(['compact', 'classic', 'broad']),
    );
    expect(new Set(appearances.map((appearance) => appearance.headwear))).toEqual(
      new Set(['cap', 'visor', 'flat-cap', 'bucket-hat']),
    );
    expect(new Set(appearances.map((appearance) => appearance.hair))).toEqual(
      new Set(['close', 'side-locks', 'curls', 'tail']),
    );
  });

  it('keeps the 24-person cast recognizable before palette differences are considered', () => {
    expect(new Set(NAMES.map(silhouette)).size).toBeGreaterThanOrEqual(16);
    expect(new Set(NAMES.map(fullIdentity)).size).toBeGreaterThanOrEqual(22);
    expect(new Set(NAMES.map((name) => golferAppearance(name).pants)).size).toBe(6);
  });
});
