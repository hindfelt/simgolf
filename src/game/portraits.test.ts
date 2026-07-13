import { describe, expect, it } from 'vitest';
import { NAMES } from './constants';
import { GOLFER_PORTRAIT_SIZE, golferPortraitRecipe, type PortraitExpression } from './portraits';

const EXPRESSIONS: PortraitExpression[] = ['neutral', 'pleased', 'cross', 'triumphant'];

const signature = (name: string) => {
  const recipe = golferPortraitRecipe(name);
  return [
    recipe.appearance.build,
    recipe.appearance.headwear,
    recipe.appearance.hair,
    recipe.appearance.outfit,
    recipe.appearance.face,
    recipe.hairTone,
    recipe.accentTone,
  ].join('|');
};

describe('native SimFoto portrait recipes', () => {
  it('normalizes identity and keeps geometry stable across expressions', () => {
    const neutral = golferPortraitRecipe('  Big Earl  ', 'neutral');
    expect(neutral.identity).toBe('big earl');
    for (const expression of EXPRESSIONS) {
      const recipe = golferPortraitRecipe('BIG EARL', expression);
      expect(recipe.expression).toBe(expression);
      expect({ ...recipe, expression: 'neutral' }).toEqual(neutral);
    }
  });

  it('preserves high identity variety across the canonical named cast', () => {
    expect(new Set(NAMES.map(signature)).size).toBeGreaterThanOrEqual(22);
  });

  it('authors portraits at a dedicated UI scale larger than the world actor source', () => {
    expect(GOLFER_PORTRAIT_SIZE).toEqual({ width: 48, height: 64 });
  });
});
