import { describe, expect, it } from 'vitest';
import { resolveGolferFrame, resolveManualGolferFrame } from './golferPose';
import type { Golfer, PlayerRound } from './types';

const coursePose = (patch: Partial<Golfer> = {}) => ({
  state: 'watch',
  phase: 0,
  t: 1,
  lie: 'fair',
  ...patch,
} as Golfer);

const manualPose = (patch: Partial<PlayerRound> = {}) => ({
  state: 'aim',
  lie: 'fair',
  pendingShot: null,
  ...patch,
} as PlayerRound);

describe('golfer pose resolution', () => {
  it('keeps green-side watch states in a low putting follow-through', () => {
    expect(resolveGolferFrame(coursePose({ lie: 'green' }))).toBe('puttFollow');
    expect(resolveGolferFrame(coursePose({ lie: 'fair' }))).toBe('follow');
  });

  it('preserves the existing walk and preshot animation phases', () => {
    expect(resolveGolferFrame(coursePose({ state: 'toBall', phase: Math.PI / 2 }))).toBe('walkA');
    expect(resolveGolferFrame(coursePose({ state: 'toBall', phase: Math.PI * 1.5 }))).toBe('walkB');
    expect(resolveGolferFrame(coursePose({ state: 'preshot', t: 0.2 }))).toBe('back');
    expect(resolveGolferFrame(coursePose({ state: 'preshot', t: 0.5 }))).toBe('address');
  });

  it('shows a charged manual backswing and distinct released-putt finish', () => {
    expect(resolveManualGolferFrame(manualPose(), false)).toBe('address');
    expect(resolveManualGolferFrame(manualPose(), true)).toBe('back');
    expect(resolveManualGolferFrame(manualPose({ lie: 'green' }), true)).toBe('putt');
    expect(resolveManualGolferFrame(manualPose({ state: 'wait', lie: 'green' }), false)).toBe('puttFollow');
  });

  it('uses the immutable shot origin while a released ball is travelling', () => {
    expect(resolveManualGolferFrame(manualPose({
      state: 'wait',
      lie: 'fair',
      pendingShot: { fromLie: 'green' } as PlayerRound['pendingShot'],
    }), false)).toBe('puttFollow');
  });
});
