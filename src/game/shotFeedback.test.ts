import { describe, expect, it } from 'vitest';
import { playerBallNeedsCameraFollow, shotWindEffect, shotWindLabel, worldWindScreenVector } from './shotFeedback';

describe('caddie shot feedback', () => {
  const base = { windPush: 2, dirX: 1, dirY: 0, perpX: 0, perpY: 1 };

  it('decomposes tail, head, and crosswind in the aiming frame', () => {
    expect(shotWindEffect({ ...base, windDx: 1, windDy: 0 })).toEqual({ along: 2, cross: 0, displacement: 2 });
    expect(shotWindEffect({ ...base, windDx: -1, windDy: 0 })).toEqual({ along: -2, cross: 0, displacement: 2 });
    expect(shotWindEffect({ ...base, windDx: 0, windDy: 1 })).toEqual({ along: 0, cross: 2, displacement: 2 });
    expect(shotWindEffect({ ...base, windDx: 0, windDy: -1 })).toEqual({ along: 0, cross: -2, displacement: 2 });
  });

  it('turns numeric displacement into concise caddie language', () => {
    expect(shotWindLabel({ along: -0.5, cross: 0.25, displacement: Math.hypot(0.5, 0.25) }))
      .toBe('Headwind costs 9 yd · 5 yd right');
    expect(shotWindLabel({ along: 0, cross: 0, displacement: 0 })).toContain('no meaningful drift');
  });

  it('requests camera follow only after the ball exits the play-safe dead zone', () => {
    const viewport = { width: 1000, height: 600 };
    expect(playerBallNeedsCameraFollow({ x: 500, y: 250 }, viewport)).toBe(false);
    expect(playerBallNeedsCameraFollow({ x: 900, y: 250 }, viewport)).toBe(true);
    expect(playerBallNeedsCameraFollow({ x: 500, y: 500 }, viewport)).toBe(true);
    expect(playerBallNeedsCameraFollow({ x: 500, y: 250 }, { width: 0, height: 0 })).toBe(false);
  });

  it('projects the same world wind through all four rotated isometric views', () => {
    const vectors = [0, 1, 2, 3].map((rotation) => worldWindScreenVector(1, 0, rotation));
    for (const vector of vectors) expect(Math.hypot(vector.x, vector.y)).toBeCloseTo(1, 10);
    expect(vectors[0].x).toBeGreaterThan(0);
    expect(vectors[1].y).toBeLessThan(0);
    expect(vectors[2].x).toBeLessThan(0);
    expect(vectors[3].y).toBeGreaterThan(0);
  });
});
