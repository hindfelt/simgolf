import { describe, expect, it } from 'vitest';
import { attitudeDelta, difficultyDefinition, isDifficulty } from './difficulty';

describe('manual difficulty attitude volatility', () => {
  it('leaves praise unchanged at every difficulty', () => {
    for (const difficulty of ['easy', 'moderate', 'difficult', 'impossible'] as const) {
      expect(attitudeDelta(1.25, difficulty)).toBe(1.25);
    }
  });

  it('makes the same irritation progressively harsher', () => {
    const deltas = (['easy', 'moderate', 'difficult', 'impossible'] as const).map((difficulty) => attitudeDelta(-1, difficulty));
    expect(deltas).toEqual([-0.7, -1, -1.35, -1.75]);
  });

  it('validates persisted difficulty ids and exposes the manual labels', () => {
    expect(isDifficulty('impossible')).toBe(true);
    expect(isDifficulty('nightmare')).toBe(false);
    expect(difficultyDefinition('moderate').label).toBe('Moderate');
  });
});
