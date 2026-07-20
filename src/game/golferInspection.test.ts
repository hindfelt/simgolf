import { describe, expect, it } from 'vitest';
import type { CommentEntry, Golfer, Regular } from './types';
import { attitudePresentation, golferInspectionModel, golferScreenBounds, hitTestGolfers } from './golferInspection';

const golfer = (patch: Partial<Golfer> = {}): Golfer => ({
  name: 'Tex', skill: .5, shirt: '#448855', skin: '#d8a878', cap: '#e0c050',
  x: 10, y: 10, tx: 10, ty: 10, phase: 0, state: 'preshot', t: 0,
  holeIdx: 1, strokes: 3, mood: 2.4, ball: null, lie: 'fair', chatCd: 0,
  scenicSaid: false, energy: .72, hunger: .45, thirst: 1.2,
  ...patch,
});

describe('on-course golfer inspection', () => {
  it('uses the actual sprite footprint and expands touch targets to 44 pixels', () => {
    expect(golferScreenBounds({ x: 100, y: 100 }, 1)).toEqual({ left: 84, right: 116, top: 57, bottom: 101 });
    const touch = golferScreenBounds({ x: 100, y: 100 }, .4, 0, true);
    expect(touch.right - touch.left).toBe(44);
    expect(touch.bottom - touch.top).toBe(44);
  });

  it('keeps visible and clickable bounds aligned across capped zoom levels', () => {
    expect(golferScreenBounds({ x: 100, y: 100 }, .4)).toEqual(golferScreenBounds({ x: 100, y: 100 }, .76));
    expect(golferScreenBounds({ x: 100, y: 100 }, 3.4)).toEqual(golferScreenBounds({ x: 100, y: 100 }, 2.4));
    const walking = golferScreenBounds({ x: 100, y: 100 }, 1, 4);
    expect(walking.top).toBe(53);
    expect(walking.bottom).toBe(97);
  });

  it('selects the frontmost visible actor and uses painter order for exact ties', () => {
    const candidates = [
      { value: 'rear', anchor: { x: 50, y: 50 }, bob: 0, depth: 10, order: 0 },
      { value: 'front', anchor: { x: 50, y: 50 }, bob: 0, depth: 11, order: 1 },
      { value: 'front-later', anchor: { x: 50, y: 50 }, bob: 0, depth: 11, order: 2 },
    ];
    expect(hitTestGolfers({ x: 50, y: 35 }, candidates, 1)).toBe('front-later');
    expect(hitTestGolfers({ x: 90, y: 35 }, candidates, 1)).toBeNull();
  });

  it('maps mood to readable SimFoto expressions', () => {
    expect(attitudePresentation(-3)).toEqual({ label: 'Furious', expression: 'cross' });
    expect(attitudePresentation(1)).toEqual({ label: 'Content', expression: 'neutral' });
    expect(attitudePresentation(3)).toEqual({ label: 'Delighted', expression: 'pleased' });
    expect(attitudePresentation(6)).toEqual({ label: 'Ecstatic', expression: 'triumphant' });
  });

  it('builds clamped live needs, skills, action, and newest-first matching feedback', () => {
    const regular = { name: 'Tex', visits: 7, length: .6, accuracy: .7, imagination: .8 } as Regular;
    const comments: CommentEntry[] = [
      { id: 1, time: 1, name: 'Tex', txt: 'Old thought.' },
      { id: 2, time: 2, name: 'Gale', txt: 'Different golfer.' },
      { id: 3, time: 3, name: 'Tex', txt: 'Simply lovely out here.' },
    ];
    expect(golferInspectionModel(golfer({ length: undefined, accuracy: .91, imagination: undefined }), regular, comments)).toMatchObject({
      attitude: 'Delighted', expression: 'pleased', action: 'Planning the next shot', hole: 2, strokes: 3, lie: 'Fairway',
      needs: { energy: 72, hunger: 45, thirst: 100 },
      skills: { length: 60, accuracy: 91, imagination: 80 },
      feedback: ['Simply lovely out here.', 'Old thought.'], visits: 7,
    });
  });

  it('reports round score, visit spend, and live wishes', () => {
    const model = golferInspectionModel(golfer({ roundStrokes: 13, roundPar: 10, spent: 87.4, hunger: .2, mood: -0.5 }), undefined, [], 45);
    expect(model.scoreToPar).toBe('+3');
    expect(model.roundStrokes).toBe(13);
    expect(model.spent).toBe(87);
    expect(model.wishes).toEqual([
      'Wants a Snack Bar within reach',
      'Wants more interesting holes',
      'Finds the green fee steep',
    ]);
    const fresh = golferInspectionModel(golfer(), undefined, []);
    expect(fresh.scoreToPar).toBeNull();
    expect(fresh.spent).toBe(0);
    expect(fresh.wishes).toEqual([]);
    expect(golferInspectionModel(golfer({ roundStrokes: 10, roundPar: 10 }), undefined, []).scoreToPar).toBe('E');
  });
});
