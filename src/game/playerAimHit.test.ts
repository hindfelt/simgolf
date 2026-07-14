import { describe, expect, it } from 'vitest';
import {
  PLAYER_BALL_MOUSE_RADIUS,
  PLAYER_BALL_PEN_RADIUS,
  PLAYER_BALL_TOUCH_RADIUS,
  playerBallHitRadius,
  pointerStartsAtPlayerBall,
} from './playerAimHit';

describe('manual-shot ball pickup target', () => {
  it('keeps mouse precise while giving pen and touch a larger fitted-zoom target', () => {
    expect(playerBallHitRadius('mouse')).toBe(PLAYER_BALL_MOUSE_RADIUS);
    expect(playerBallHitRadius('pen')).toBe(PLAYER_BALL_PEN_RADIUS);
    expect(playerBallHitRadius('touch')).toBe(PLAYER_BALL_TOUCH_RADIUS);
    expect(PLAYER_BALL_MOUSE_RADIUS).toBeLessThan(PLAYER_BALL_PEN_RADIUS);
    expect(PLAYER_BALL_PEN_RADIUS).toBeLessThan(PLAYER_BALL_TOUCH_RADIUS);
  });

  it('accepts the radius edge and rejects arbitrary course drags', () => {
    const ball = { x: 240, y: 180 };
    expect(pointerStartsAtPlayerBall({ x: 258, y: 180 }, ball, 'mouse')).toBe(true);
    expect(pointerStartsAtPlayerBall({ x: 259, y: 180 }, ball, 'mouse')).toBe(false);
    expect(pointerStartsAtPlayerBall({ x: 264, y: 198 }, ball, 'touch')).toBe(true);
    expect(pointerStartsAtPlayerBall({ x: 320, y: 260 }, ball, 'touch')).toBe(false);
  });
});
