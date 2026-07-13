import { beforeEach, describe, expect, it } from 'vitest';
import { S } from './state';
import { golferFacingBetween } from './golferFacing';

describe('golfer screen-facing direction', () => {
  beforeEach(() => {
    S.rot = 0;
  });

  it('uses a rear sprite only for predominantly up-screen movement', () => {
    expect(golferFacingBetween({ x: 5, y: 5 }, { x: 4, y: 4 })).toEqual({ face: 1, facingAway: true });
    expect(golferFacingBetween({ x: 5, y: 5 }, { x: 6, y: 6 })).toEqual({ face: 1, facingAway: false });
  });

  it('resets the rear view and mirrors the sprite after a route turns sideways', () => {
    const turned = golferFacingBetween({ x: 5, y: 5 }, { x: 5, y: 8 });
    expect(turned.facingAway).toBe(false);
    expect(turned.face).toBe(-1);
  });
});
