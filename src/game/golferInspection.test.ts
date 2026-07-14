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
    expect(golferScreenBounds({ x: 100, y: 100 }, 1)).toEqual({ left: 85.6, right: 114.4, top: 61.6, bottom: 102.88 });
    const touch = golferScreenBounds({ x: 100, y: 100 }, .65, 0, true);
    expect(touch.right - touch.left).toBe(44);
    expect(touch.bottom - touch.top).toBe(44);
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

  it('builds clamped live needs, skills, action, and latest matching comment', () => {
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
      latestComment: 'Simply lovely out here.', visits: 7,
    });
  });
});
