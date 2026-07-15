import { afterEach, describe, expect, it, vi } from 'vitest';
import { NAMES } from './constants';
import { GOLFER_PORTRAIT_SIZE, golferPortraitRecipe, golferPortraitSprite, type PortraitExpression } from './portraits';
import { SPECIAL_GUESTS } from './specialGuests';

const EXPRESSIONS: PortraitExpression[] = ['neutral', 'pleased', 'cross', 'triumphant'];

afterEach(() => vi.unstubAllGlobals());

function stubPortraitCanvas() {
  const context = {
    beginPath: () => undefined,
    moveTo: () => undefined,
    lineTo: () => undefined,
    closePath: () => undefined,
    fill: () => undefined,
    stroke: () => undefined,
    fillRect: () => undefined,
    arc: () => undefined,
    ellipse: () => undefined,
    drawImage: () => undefined,
    clearRect: () => undefined,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineJoin: 'miter',
    lineCap: 'butt',
    imageSmoothingEnabled: true,
  };
  vi.stubGlobal('document', {
    createElement: () => ({ width: 0, height: 0, getContext: () => context }),
  });
}

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

  it('uses authored marquee anatomy, hair colour, and signature instead of name hashing', () => {
    const picky = SPECIAL_GUESTS.picky.visual;
    const ivana = SPECIAL_GUESTS.ivana.visual;
    const pickyRecipe = golferPortraitRecipe(picky.identity, 'cross', picky);
    const ivanaRecipe = golferPortraitRecipe(ivana.identity, 'triumphant', ivana);

    expect(pickyRecipe).toMatchObject({
      identity: 'special-guest:picky',
      expression: 'cross',
      appearance: picky.appearance,
      hairTone: picky.hairTone,
      signature: 'commissioner',
    });
    expect(ivanaRecipe).toMatchObject({
      identity: 'special-guest:ivana',
      expression: 'triumphant',
      appearance: ivana.appearance,
      hairTone: ivana.hairTone,
      hairHighlight: ivana.hairHighlight,
      signature: 'patron',
    });
    expect(ivanaRecipe.appearance.hair).toBe('shoulder');
    expect(pickyRecipe.appearance).not.toEqual(golferPortraitRecipe(picky.identity).appearance);
  });

  it('includes authored appearance and signature fields in the portrait cache key', () => {
    stubPortraitCanvas();
    const picky = SPECIAL_GUESTS.picky.visual;
    const first = golferPortraitSprite('portrait-cache-test', picky.shirt, picky.skin, picky.cap, 'neutral', picky);
    const hit = golferPortraitSprite('portrait-cache-test', picky.shirt, picky.skin, picky.cap, 'neutral', picky);
    const changed = golferPortraitSprite(
      'portrait-cache-test',
      picky.shirt,
      picky.skin,
      picky.cap,
      'neutral',
      { ...picky, signature: 'patron' },
    );

    expect(hit).toBe(first);
    expect(changed).not.toBe(first);
  });

  it('authors portraits at a dedicated UI scale larger than the world actor source', () => {
    expect(GOLFER_PORTRAIT_SIZE).toEqual({ width: 48, height: 64 });
  });
});
