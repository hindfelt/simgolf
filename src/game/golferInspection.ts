import type { CommentEntry, Golfer, LieKey, Regular, Vec } from './types';
import type { PortraitExpression } from './portraits';
import { expandActorTouchTarget, golferVisualGeometry } from './actorGeometry';

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
  /** Round score across finished holes, e.g. "+3" or "E"; null before any hole is finished. */
  scoreToPar: string | null;
  /** Total strokes over the finished holes counted in `scoreToPar`. */
  roundStrokes: number;
  /** Green fees paid so far this visit, in dollars. */
  spent: number;
  needs: { energy: number; hunger: number; thirst: number };
  skills: { length: number; accuracy: number; imagination: number };
  /** Most recent chatter first, up to three entries. */
  feedback: string[];
  /** What this golfer wants from the course right now. */
  wishes: string[];
  visits: number | null;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
const percent = (value: number) => Math.round(clamp01(value) * 100);
const LIE_LABELS: Record<LieKey, string> = {
  tee: 'Tee', fair: 'Fairway', firmfair: 'Firm fairway', rough: 'Rough', deeprough: 'Deep rough',
  sand: 'Sand', waste: 'Waste bunker', pot: 'Pot bunker', stream: 'Stream', brush: 'Brush',
  rock: 'Rock', tree: 'Trees', green: 'Green', flower: 'Flowers', water: 'Water', bridge: 'Bridge',
};

/** The exact rendered world-sprite footprint, expanded to a 44px touch target. */
export function golferScreenBounds(anchor: Vec, zoom: number, bob = 0, coarse = false): ScreenBounds {
  const bounds = golferVisualGeometry(anchor, zoom, bob).sprite;
  return coarse ? expandActorTouchTarget(bounds) : bounds;
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
    case 'waitTee': return `Waiting for the ${golfer.holeIdx + 1}${golfer.holeIdx === 0 ? 'st' : golfer.holeIdx === 1 ? 'nd' : golfer.holeIdx === 2 ? 'rd' : 'th'} tee`;
    case 'toBall': return 'Walking to the ball';
    case 'leave': return 'Heading back to the clubhouse';
    case 'preshot': return 'Planning the next shot';
    case 'prePutt': return 'Reading the green';
    case 'watch': return 'Watching the ball';
  }
}

/** Live wishes derived from unmet needs and mood — what the golfer wants right now. */
export function golferWishes(golfer: Golfer, greenFee: number): string[] {
  const wishes: string[] = [];
  if (golfer.hunger < 0.35) wishes.push('Wants a Snack Bar within reach');
  if (golfer.thirst < 0.35) wishes.push('Wants something to drink');
  if (golfer.energy < 0.3) wishes.push('Wants a Bench or Hotel to rest at');
  if (golfer.mood <= -1.5) wishes.push('Thinks the course needs serious work');
  else if (golfer.mood < 0) wishes.push('Wants more interesting holes');
  if (golfer.mood < 0 && greenFee >= 40) wishes.push('Finds the green fee steep');
  return wishes;
}

export function golferInspectionModel(
  golfer: Golfer,
  regular: Regular | undefined,
  comments: readonly CommentEntry[],
  greenFee = 0,
): GolferInspectionModel {
  const attitude = attitudePresentation(golfer.mood);
  const feedback: string[] = [];
  for (let index = comments.length - 1; index >= 0 && feedback.length < 3; index--) {
    if (comments[index].name === golfer.name) feedback.push(comments[index].txt);
  }
  const fallback = clamp01(golfer.skill);
  const roundStrokes = Math.max(0, Math.trunc(golfer.roundStrokes ?? 0));
  const roundPar = Math.max(0, Math.trunc(golfer.roundPar ?? 0));
  const diff = roundStrokes - roundPar;
  return {
    attitude: attitude.label,
    expression: attitude.expression,
    action: actionLabel(golfer),
    hole: golfer.holeIdx + 1,
    strokes: Math.max(0, Math.trunc(golfer.strokes)),
    lie: LIE_LABELS[golfer.lie],
    scoreToPar: roundPar > 0 ? (diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`) : null,
    roundStrokes,
    spent: Math.max(0, Math.round(golfer.spent ?? 0)),
    needs: { energy: percent(golfer.energy), hunger: percent(golfer.hunger), thirst: percent(golfer.thirst) },
    skills: {
      length: percent(golfer.length ?? regular?.length ?? fallback),
      accuracy: percent(golfer.accuracy ?? regular?.accuracy ?? fallback),
      imagination: percent(golfer.imagination ?? regular?.imagination ?? fallback),
    },
    feedback,
    wishes: golferWishes(golfer, greenFee),
    visits: regular ? Math.max(0, Math.trunc(regular.visits)) : null,
  };
}
