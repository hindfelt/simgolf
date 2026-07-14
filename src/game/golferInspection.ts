import type { CommentEntry, Golfer, LieKey, Regular, Vec } from './types';
import type { PortraitExpression } from './portraits';

export interface GolferScreenCandidate<T> {
  value: T;
  anchor: Vec;
  bob: number;
  depth: number;
  order: number;
}

export interface ScreenBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface GolferInspectionModel {
  attitude: string;
  expression: PortraitExpression;
  action: string;
  hole: number;
  strokes: number;
  lie: string;
  needs: { energy: number; hunger: number; thirst: number };
  skills: { length: number; accuracy: number; imagination: number };
  latestComment: string | null;
  visits: number | null;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
const percent = (value: number) => Math.round(clamp01(value) * 100);
const LIE_LABELS: Record<LieKey, string> = {
  tee: 'Tee', fair: 'Fairway', firmfair: 'Firm fairway', rough: 'Rough', deeprough: 'Deep rough',
  sand: 'Sand', waste: 'Waste bunker', pot: 'Pot bunker', stream: 'Stream', brush: 'Brush',
  rock: 'Rock', tree: 'Trees', green: 'Green', flower: 'Flowers', water: 'Water', bridge: 'Bridge',
};

/** The real 30×40 world sprite footprint, expanded to a 44px touch target. */
export function golferScreenBounds(anchor: Vec, zoom: number, bob = 0, coarse = false): ScreenBounds {
  const scale = Math.min(1.7, Math.max(.65, zoom)) * .96;
  const spriteWidth = 30 * scale;
  const spriteHeight = 40 * scale;
  const left = anchor.x - spriteWidth / 2;
  const right = anchor.x + spriteWidth / 2;
  const top = anchor.y - bob - spriteHeight;
  const bottom = anchor.y - bob + 3 * scale;
  if (!coarse) return { left, right, top, bottom };
  const padX = Math.max(0, (44 - (right - left)) / 2);
  const padY = Math.max(0, (44 - (bottom - top)) / 2);
  return { left: left - padX, right: right + padX, top: top - padY, bottom: bottom + padY };
}

/** Chooses the same actor the painter draws last: greatest depth, then queue order. */
export function hitTestGolfers<T>(
  pointer: Vec,
  candidates: readonly GolferScreenCandidate<T>[],
  zoom: number,
  coarse = false,
): T | null {
  let best: GolferScreenCandidate<T> | null = null;
  for (const candidate of candidates) {
    const bounds = golferScreenBounds(candidate.anchor, zoom, candidate.bob, coarse);
    if (pointer.x < bounds.left || pointer.x > bounds.right || pointer.y < bounds.top || pointer.y > bounds.bottom) continue;
    if (!best || candidate.depth > best.depth || (candidate.depth === best.depth && candidate.order > best.order)) best = candidate;
  }
  return best?.value ?? null;
}

export function attitudePresentation(mood: number): { label: string; expression: PortraitExpression } {
  if (mood <= -2) return { label: 'Furious', expression: 'cross' };
  if (mood < 0) return { label: 'Unhappy', expression: 'cross' };
  if (mood < 2) return { label: 'Content', expression: 'neutral' };
  if (mood < 4) return { label: 'Delighted', expression: 'pleased' };
  return { label: 'Ecstatic', expression: 'triumphant' };
}

function actionLabel(golfer: Golfer): string {
  switch (golfer.state) {
    case 'toTee': return `Walking to the ${golfer.holeIdx + 1}${golfer.holeIdx === 0 ? 'st' : golfer.holeIdx === 1 ? 'nd' : golfer.holeIdx === 2 ? 'rd' : 'th'} tee`;
    case 'toBall': return 'Walking to the ball';
    case 'leave': return 'Heading back to the clubhouse';
    case 'preshot': return 'Planning the next shot';
    case 'prePutt': return 'Reading the green';
    case 'watch': return 'Watching the ball';
  }
}

export function golferInspectionModel(
  golfer: Golfer,
  regular: Regular | undefined,
  comments: readonly CommentEntry[],
): GolferInspectionModel {
  const attitude = attitudePresentation(golfer.mood);
  const latestComment = [...comments].reverse().find((comment) => comment.name === golfer.name)?.txt ?? null;
  const fallback = clamp01(golfer.skill);
  return {
    attitude: attitude.label,
    expression: attitude.expression,
    action: actionLabel(golfer),
    hole: golfer.holeIdx + 1,
    strokes: Math.max(0, Math.trunc(golfer.strokes)),
    lie: LIE_LABELS[golfer.lie],
    needs: { energy: percent(golfer.energy), hunger: percent(golfer.hunger), thirst: percent(golfer.thirst) },
    skills: {
      length: percent(golfer.length ?? regular?.length ?? fallback),
      accuracy: percent(golfer.accuracy ?? regular?.accuracy ?? fallback),
      imagination: percent(golfer.imagination ?? regular?.imagination ?? fallback),
    },
    latestComment,
    visits: regular ? Math.max(0, Math.trunc(regular.visits)) : null,
  };
}
