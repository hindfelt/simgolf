import { beforeEach, describe, expect, it } from 'vitest';
import { S } from './state';
import { actorFacingForScreenDelta, actorViewWithLegacyFallback, golferFacingBetween, manualGolferFacing } from './golferFacing';

describe('golfer screen-facing direction', () => {
  beforeEach(() => {
    S.rot = 0;
  });

  it('uses front and rear sprites for predominantly vertical movement', () => {
    expect(golferFacingBetween({ x: 5, y: 5 }, { x: 4, y: 4 })).toEqual({ face: 1, view: 'rear' });
    expect(golferFacingBetween({ x: 5, y: 5 }, { x: 6, y: 6 })).toEqual({ face: 1, view: 'front' });
  });

  it('selects the side view and mirrors it after a route turns laterally', () => {
    const turned = golferFacingBetween({ x: 5, y: 5 }, { x: 5, y: 8 });
    expect(turned).toEqual({ face: -1, view: 'side' });
    expect(actorFacingForScreenDelta(12, 1)).toEqual({ face: 1, view: 'side' });
  });

  it('prefers explicit views and migrates legacy facingAway saves', () => {
    expect(actorViewWithLegacyFallback({ view: 'front', facingAway: true })).toBe('front');
    expect(actorViewWithLegacyFallback({ facingAway: true })).toBe('rear');
    expect(actorViewWithLegacyFallback({ facingAway: false })).toBe('side');
    expect(actorViewWithLegacyFallback({ view: 'invalid' })).toBe('side');
  });

  it('keeps manual shot view separate from the ball-side stance mirror', () => {
    expect(manualGolferFacing(0, -12, 120, 100)).toEqual({ view: 'rear', face: -1 });
    expect(manualGolferFacing(0, 12, 80, 100)).toEqual({ view: 'front', face: 1 });
    expect(manualGolferFacing(12, 1, 120, 100)).toEqual({ view: 'side', face: -1 });
    expect(manualGolferFacing(-12, 1, 80, 100)).toEqual({ view: 'side', face: 1 });
  });
});
