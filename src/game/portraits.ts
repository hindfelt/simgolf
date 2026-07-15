import { golferAppearance } from './sprites';
import type {
  CharacterSignature,
  CharacterVisualOverrides,
  GolferAppearance,
  PortraitExpression,
} from './characterVisuals';

export type {
  CharacterSignature,
  CharacterVisualOverrides,
  CharacterVisualProfile,
  GolferAppearance,
  PortraitExpression,
} from './characterVisuals';

export const GOLFER_PORTRAIT_SIZE = { width: 48, height: 64 } as const;

export interface GolferPortraitRecipe {
  identity: string;
  expression: PortraitExpression;
  appearance: GolferAppearance;
  shoulderWidth: number;
  headWidth: number;
  headHeight: number;
  eyeY: number;
  hairTone: string;
  hairHighlight: string;
  accentTone: string;
  trimTone: string;
  signature?: CharacterSignature;
}

const portraitCache = new Map<string, HTMLCanvasElement>();
const HAIR_TONES = ['#2b211f', '#5b3527', '#a85f35', '#d2b98f', '#242833'];
const ACCENT_TONES = ['#fff0a2', '#78c5bd', '#df7f89', '#9fc96c', '#e0b65b'];

const cleanIdentity = (identity: string) => identity.trim().toLowerCase() || 'anonymous golfer';

const appearanceKey = (appearance: GolferAppearance) => [
  appearance.build,
  appearance.headwear,
  appearance.hair,
  appearance.outfit,
  appearance.face,
  appearance.pants,
  appearance.bag,
  appearance.socks,
].join(',');

function visualOverrideKey(overrides?: CharacterVisualOverrides): string {
  if (!overrides) return '';
  return [
    overrides.appearance ? appearanceKey(overrides.appearance) : '',
    overrides.signature ?? '',
    overrides.hairTone ?? '',
    overrides.hairHighlight ?? '',
    overrides.trim ?? '',
    overrides.pants ?? '',
    overrides.accent ?? '',
    overrides.bag ?? '',
  ].join('|');
}

/**
 * Pure portrait geometry shared by tests and the canvas renderer. The recipe is
 * intentionally independent of clothing colours, so a named golfer keeps the
 * same face and silhouette when their outfit changes.
 */
export function golferPortraitRecipe(
  identity: string,
  expression: PortraitExpression = 'neutral',
  overrides?: CharacterVisualOverrides,
): GolferPortraitRecipe {
  const normalized = cleanIdentity(identity);
  const appearance = overrides?.appearance ?? golferAppearance(normalized);
  const buildOffset = appearance.build === 'compact' ? -2 : appearance.build === 'broad' ? 3 : 0;
  const hairTone = overrides?.hairTone ?? HAIR_TONES[(appearance.face + appearance.pants) % HAIR_TONES.length];
  return {
    identity: normalized,
    expression,
    appearance,
    shoulderWidth: 40 + buildOffset,
    headWidth: 20 + (appearance.build === 'broad' ? 2 : 0),
    headHeight: 29 + (appearance.build === 'compact' ? -1 : 0),
    eyeY: 23 + (appearance.face % 2),
    hairTone,
    hairHighlight: overrides?.hairHighlight ?? shade(hairTone, 1.18),
    accentTone: overrides?.accent ?? ACCENT_TONES[(appearance.outfit + appearance.bag) % ACCENT_TONES.length],
    trimTone: overrides?.trim ?? '#f4f0dc',
    signature: overrides?.signature,
  };
}

function shade(color: string, factor: number): string {
  const match = /^#([0-9a-f]{6})$/i.exec(color);
  if (!match) return color;
  const value = Number.parseInt(match[1], 16);
  const channel = (shift: number) => Math.max(0, Math.min(255, Math.round(((value >> shift) & 255) * factor)));
  return `rgb(${channel(16)},${channel(8)},${channel(0)})`;
}

function polygon(ctx: CanvasRenderingContext2D, points: readonly [number, number][], fill: string, stroke = '#232532', width = 2) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index++) ctx.lineTo(points[index][0], points[index][1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function line(ctx: CanvasRenderingContext2D, points: readonly [number, number][], color: string, width = 1) {
  ctx.beginPath();
  ctx.moveTo(points[0][0] + 0.5, points[0][1] + 0.5);
  for (let index = 1; index < points.length; index++) ctx.lineTo(points[index][0] + 0.5, points[index][1] + 0.5);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'square';
  ctx.lineJoin = 'miter';
  ctx.stroke();
}

function drawHair(ctx: CanvasRenderingContext2D, recipe: GolferPortraitRecipe, headX: number, headY: number) {
  const hair = recipe.hairTone;
  const style = recipe.appearance.hair;
  if (style === 'close') {
    polygon(ctx, [[headX + 1, headY + 10], [headX + 2, headY + 3], [headX + 7, headY], [headX + 16, headY + 1], [headX + 19, headY + 6], [headX + 17, headY + 10]], hair, hair, 1);
  } else if (style === 'side-locks') {
    polygon(ctx, [[headX, headY + 12], [headX + 1, headY + 4], [headX + 7, headY], [headX + 18, headY + 3], [headX + 17, headY + 10], [headX + 4, headY + 14], [headX + 3, headY + 25], [headX - 1, headY + 23]], hair, hair, 1);
  } else if (style === 'curls') {
    ctx.fillStyle = hair;
    for (const [x, y, radius] of [[headX + 3, headY + 5, 4], [headX + 8, headY + 2, 4], [headX + 13, headY + 3, 4], [headX + 17, headY + 7, 4], [headX + 1, headY + 11, 4]] as const) {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (style === 'tail') {
    polygon(ctx, [[headX, headY + 14], [headX + 1, headY + 4], [headX + 7, headY], [headX + 17, headY + 3], [headX + 16, headY + 12], [headX + 4, headY + 17]], hair, hair, 1);
    polygon(ctx, [[headX + 1, headY + 17], [headX - 5, headY + 25], [headX - 2, headY + 30], [headX + 5, headY + 23]], hair, '#232532', 1);
  } else {
    // A full two-sided shoulder silhouette is Ivana's primary recognition cue.
    polygon(ctx, [[headX - 2, headY + 14], [headX, headY + 4], [headX + 6, headY], [headX + 17, headY + 2], [headX + 21, headY + 10], [headX + 21, headY + 35], [headX + 14, headY + 39], [headX + 12, headY + 19], [headX + 5, headY + 18], [headX + 4, headY + 39], [headX - 4, headY + 35]], hair, '#232532', 1);
    line(ctx, [[headX + 2, headY + 5], [headX, headY + 31]], recipe.hairHighlight, 2);
    line(ctx, [[headX + 17, headY + 6], [headX + 18, headY + 31]], recipe.hairHighlight, 2);
  }
}

function drawHeadwear(ctx: CanvasRenderingContext2D, recipe: GolferPortraitRecipe, cap: string, headX: number, headY: number) {
  const dark = shade(cap, 0.66);
  const light = shade(cap, 1.18);
  const width = recipe.headWidth;
  if (recipe.appearance.headwear === 'cap') {
    polygon(ctx, [[headX - 2, headY + 7], [headX, headY + 1], [headX + 5, headY - 2], [headX + width - 3, headY], [headX + width, headY + 7]], cap);
    polygon(ctx, [[headX + 10, headY + 6], [headX + width + 7, headY + 8], [headX + width + 5, headY + 11], [headX + 10, headY + 9]], dark, '#232532', 1);
    line(ctx, [[headX + 2, headY + 3], [headX + 10, headY + 1]], light, 1);
  } else if (recipe.appearance.headwear === 'visor') {
    polygon(ctx, [[headX - 2, headY + 7], [headX + width, headY + 6], [headX + width, headY + 10], [headX - 1, headY + 11]], cap);
    polygon(ctx, [[headX + 10, headY + 8], [headX + width + 7, headY + 9], [headX + width + 5, headY + 12], [headX + 10, headY + 11]], dark, '#232532', 1);
  } else if (recipe.appearance.headwear === 'flat-cap') {
    polygon(ctx, [[headX - 3, headY + 8], [headX - 1, headY + 2], [headX + 8, headY - 1], [headX + width, headY + 4], [headX + width - 1, headY + 10]], cap);
    polygon(ctx, [[headX + 8, headY + 8], [headX + width + 5, headY + 9], [headX + width + 3, headY + 12], [headX + 8, headY + 11]], dark, '#232532', 1);
    line(ctx, [[headX + 1, headY + 4], [headX + 10, headY + 2]], light, 1);
  } else if (recipe.appearance.headwear === 'bucket-hat') {
    polygon(ctx, [[headX - 1, headY + 8], [headX + 1, headY], [headX + width - 2, headY], [headX + width + 1, headY + 8]], cap);
    polygon(ctx, [[headX - 7, headY + 8], [headX + width + 8, headY + 8], [headX + width + 6, headY + 12], [headX - 5, headY + 12]], dark, '#232532', 1);
  }
}

function drawExpression(ctx: CanvasRenderingContext2D, recipe: GolferPortraitRecipe, x: number, eyeY: number) {
  const ink = '#30262a';
  const face = recipe.appearance.face;
  if (recipe.signature === 'commissioner') {
    // Picky's portrait stays skeptical even at neutral: heavy inward brows,
    // direct eyes, and a restrained, slightly asymmetric mouth.
    if (recipe.expression === 'cross') {
      line(ctx, [[x, eyeY - 5], [x + 5, eyeY - 1]], recipe.hairTone, 2);
      line(ctx, [[x + 8, eyeY - 1], [x + 13, eyeY - 5]], recipe.hairTone, 2);
    } else {
      line(ctx, [[x, eyeY - 4], [x + 5, eyeY - 2]], recipe.hairTone, 2);
      line(ctx, [[x + 8, eyeY - 2], [x + 13, eyeY - 4]], recipe.hairTone, 2);
    }
    ctx.fillStyle = '#211a18';
    ctx.fillRect(x + 2, eyeY, 2, 2);
    ctx.fillRect(x + 10, eyeY, 2, 2);
    ctx.fillStyle = '#f7f4df';
    ctx.fillRect(x + 2, eyeY, 1, 1);
    ctx.fillRect(x + 10, eyeY, 1, 1);
    ctx.fillStyle = '#663a34';
    const mouthY = eyeY + 10;
    if (recipe.expression === 'pleased' || recipe.expression === 'triumphant') {
      ctx.fillRect(x + 4, mouthY, 2, 1);
      ctx.fillRect(x + 6, mouthY + 1, 6, 1);
      ctx.fillRect(x + 12, mouthY, 2, 1);
    } else {
      ctx.fillRect(x + 4, mouthY, 7, 2);
      ctx.fillRect(x + 11, mouthY + 1, 3, 1);
    }
    return;
  }
  if (recipe.signature === 'patron') {
    // Raised brows, round cheek marks, and a nine-pixel smile with a tooth row.
    line(ctx, [[x, eyeY - 2], [x + 4, eyeY - 4]], recipe.hairTone, 1);
    line(ctx, [[x + 9, eyeY - 4], [x + 13, eyeY - 2]], recipe.hairTone, 1);
    ctx.fillStyle = '#30262a';
    ctx.fillRect(x + 2, eyeY, 2, 2);
    ctx.fillRect(x + 10, eyeY, 2, 2);
    ctx.fillStyle = '#f7f4df';
    ctx.fillRect(x + 2, eyeY, 1, 1);
    ctx.fillRect(x + 10, eyeY, 1, 1);
    ctx.fillStyle = '#bc716b';
    ctx.fillRect(x, eyeY + 5, 2, 2);
    ctx.fillRect(x + 13, eyeY + 5, 2, 2);
    const mouthY = eyeY + 9;
    if (recipe.expression === 'cross') {
      ctx.fillStyle = '#7a4242';
      ctx.fillRect(x + 4, mouthY + 1, 2, 1);
      ctx.fillRect(x + 6, mouthY, 6, 1);
      ctx.fillRect(x + 12, mouthY + 1, 2, 1);
    } else {
      ctx.fillStyle = '#74343d';
      ctx.fillRect(x + 3, mouthY - 1, 9, 4);
      ctx.fillStyle = '#fff9e6';
      ctx.fillRect(x + 4, mouthY, 7, 1);
      ctx.fillStyle = '#c65f65';
      ctx.fillRect(x + 5, mouthY + 2, 5, 1);
    }
    return;
  }
  if (recipe.expression === 'cross') {
    line(ctx, [[x, eyeY - 2], [x + 4, eyeY]], ink, 2);
    line(ctx, [[x + 8, eyeY], [x + 12, eyeY - 2]], ink, 2);
  } else {
    line(ctx, [[x, eyeY - 1], [x + 4, eyeY - 2]], ink, 1);
    line(ctx, [[x + 8, eyeY - 2], [x + 12, eyeY - 1]], ink, 1);
  }
  ctx.fillStyle = '#24252b';
  ctx.fillRect(x + 2, eyeY, 2, 2);
  ctx.fillRect(x + 9, eyeY, 2, 2);
  ctx.fillStyle = '#f7f4df';
  ctx.fillRect(x + 2, eyeY, 1, 1);
  ctx.fillRect(x + 9, eyeY, 1, 1);

  if (face === 0) {
    line(ctx, [[x, eyeY - 1], [x + 13, eyeY - 1]], '#4b3833', 2);
    ctx.fillStyle = '#c7e2df';
    ctx.fillRect(x + 1, eyeY - 1, 5, 4);
    ctx.fillRect(x + 8, eyeY - 1, 5, 4);
  } else if (face === 1) {
    ctx.fillStyle = '#6b3e2f';
    ctx.fillRect(x + 4, eyeY + 8, 7, 2);
  } else if (face === 2) {
    ctx.fillStyle = recipe.hairTone;
    ctx.fillRect(x - 1, eyeY + 1, 2, 6);
  } else if (face === 3) {
    ctx.fillStyle = '#b76a61';
    ctx.fillRect(x + 12, eyeY + 5, 2, 2);
  } else {
    line(ctx, [[x + 1, eyeY - 4], [x + 5, eyeY - 5]], recipe.hairTone, 2);
    line(ctx, [[x + 8, eyeY - 5], [x + 12, eyeY - 4]], recipe.hairTone, 2);
  }

  const mouthY = eyeY + 9;
  if (recipe.expression === 'pleased') {
    ctx.fillStyle = '#7b3e38';
    ctx.fillRect(x + 4, mouthY, 2, 1);
    ctx.fillRect(x + 6, mouthY + 1, 5, 1);
    ctx.fillRect(x + 11, mouthY, 2, 1);
  } else if (recipe.expression === 'cross') {
    ctx.fillStyle = '#6f3535';
    ctx.fillRect(x + 4, mouthY + 1, 2, 1);
    ctx.fillRect(x + 6, mouthY, 5, 1);
    ctx.fillRect(x + 11, mouthY + 1, 2, 1);
  } else if (recipe.expression === 'triumphant') {
    ctx.fillStyle = '#6c3035';
    ctx.fillRect(x + 4, mouthY - 1, 9, 5);
    ctx.fillStyle = '#fff9e6';
    ctx.fillRect(x + 5, mouthY, 7, 1);
    ctx.fillStyle = '#c65f65';
    ctx.fillRect(x + 6, mouthY + 2, 5, 1);
  } else {
    ctx.fillStyle = '#744039';
    ctx.fillRect(x + 5, mouthY, 7, 1);
  }
}

/**
 * Native SimFoto-scale bust. Unlike the course actor, this is authored at the
 * full 48×64 UI resolution and is never made from a cropped world sprite.
 */
export function golferPortraitSprite(
  identity: string,
  shirt: string,
  skin: string,
  cap: string,
  expression: PortraitExpression = 'neutral',
  overrides?: CharacterVisualOverrides,
): HTMLCanvasElement {
  const recipe = golferPortraitRecipe(identity, expression, overrides);
  const key = `simfoto-v2|${recipe.identity}|${shirt}|${skin}|${cap}|${expression}|${visualOverrideKey(overrides)}`;
  const hit = portraitCache.get(key);
  if (hit) return hit;

  const canvas = document.createElement('canvas');
  canvas.width = GOLFER_PORTRAIT_SIZE.width;
  canvas.height = GOLFER_PORTRAIT_SIZE.height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const shoulderLeft = Math.round((canvas.width - recipe.shoulderWidth) / 2);
  const shoulderRight = shoulderLeft + recipe.shoulderWidth;
  const shirtDark = shade(shirt, 0.68);
  const shirtLight = shade(shirt, 1.2);
  polygon(ctx, [[shoulderLeft, 64], [shoulderLeft + 2, 53], [shoulderLeft + 9, 47], [19, 44], [30, 44], [shoulderRight - 8, 48], [shoulderRight - 2, 54], [shoulderRight, 64]], shirt);
  polygon(ctx, [[shoulderLeft + 1, 64], [shoulderLeft + 3, 55], [shoulderLeft + 8, 50], [shoulderLeft + 12, 64]], shirtDark, shirtDark, 1);
  line(ctx, [[20, 46], [24, 51], [29, 46]], recipe.trimTone, 2);

  if (recipe.appearance.outfit === 0) line(ctx, [[24, 50], [24, 64]], recipe.accentTone, 2);
  else if (recipe.appearance.outfit === 1) {
    line(ctx, [[shoulderLeft + 5, 55], [shoulderRight - 5, 55]], shirtLight, 2);
    line(ctx, [[shoulderLeft + 6, 60], [shoulderRight - 4, 60]], shirtDark, 1);
  } else if (recipe.appearance.outfit === 2) {
    polygon(ctx, [[17, 47], [22, 51], [22, 64], [15, 64]], shirtDark, shirtDark, 1);
    polygon(ctx, [[31, 47], [27, 51], [27, 64], [34, 64]], shirtDark, shirtDark, 1);
  } else if (recipe.appearance.outfit === 3) {
    ctx.fillStyle = recipe.accentTone;
    ctx.fillRect(30, 53, 7, 6);
    ctx.fillStyle = shirtDark;
    ctx.fillRect(31, 55, 5, 1);
  } else {
    polygon(ctx, [[17, 54], [21, 50], [25, 54], [21, 58]], recipe.accentTone, shirtDark, 1);
    polygon(ctx, [[25, 58], [29, 54], [33, 58], [29, 62]], shirtDark, shirtDark, 1);
  }

  if (recipe.signature === 'commissioner') {
    ctx.fillStyle = recipe.accentTone;
    ctx.fillRect(32, 53, 5, 5);
    ctx.fillStyle = shade(recipe.accentTone, 0.66);
    ctx.fillRect(34, 54, 1, 3);
  } else if (recipe.signature === 'patron') {
    for (const [x, y] of [[18, 48], [21, 50], [24, 51], [27, 50], [30, 48]] as const) {
      ctx.fillStyle = recipe.accentTone;
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.fillStyle = recipe.trimTone;
    ctx.fillRect(31, 53, 4, 4);
  }

  // Neck and the hair silhouette sit behind the three-quarter face.
  ctx.fillStyle = '#232532';
  ctx.fillRect(19, 34, 12, 13);
  ctx.fillStyle = shade(skin, 0.79);
  ctx.fillRect(21, 35, 8, 12);
  const headX = Math.round((48 - recipe.headWidth) / 2) - 1;
  const headY = 8;
  drawHair(ctx, recipe, headX, headY);

  if (recipe.signature === 'commissioner') {
    polygon(ctx, [[headX, headY + 8], [headX + 5, headY + 3], [headX + 17, headY + 3], [headX + 23, headY + 10], [headX + 22, headY + 27], [headX + 17, headY + 35], [headX + 6, headY + 35], [headX + 1, headY + 28]], '#232532', '#232532', 1);
    polygon(ctx, [[headX + 2, headY + 9], [headX + 6, headY + 5], [headX + 16, headY + 5], [headX + 21, headY + 11], [headX + 20, headY + 26], [headX + 16, headY + 33], [headX + 7, headY + 33], [headX + 3, headY + 27]], skin, skin, 1);
  } else {
    ctx.fillStyle = '#232532';
    ctx.beginPath();
    ctx.ellipse(headX + 10, headY + 20, recipe.headWidth / 2 + 2, recipe.headHeight / 2 + 2, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(headX + 11, headY + 20, recipe.headWidth / 2, recipe.headHeight / 2, -0.08, 0, Math.PI * 2);
    ctx.fill();
  }
  polygon(ctx, [[headX + 17, headY + 17], [headX + 24, headY + 21], [headX + 18, headY + 24]], skin, '#232532', 1);
  ctx.fillStyle = shade(skin, 0.82);
  ctx.beginPath();
  ctx.arc(headX + 1, headY + 22, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#232532';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = shade(skin, 1.12);
  ctx.fillRect(headX + 5, headY + 15, 3, 10);
  ctx.fillStyle = '#d48778';
  ctx.fillRect(headX + 17, headY + 27, 3, 2);

  drawExpression(ctx, recipe, headX + 5, recipe.eyeY);
  drawHeadwear(ctx, recipe, cap, headX, headY);

  portraitCache.set(key, canvas);
  return canvas;
}
