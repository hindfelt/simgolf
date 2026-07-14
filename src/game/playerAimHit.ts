import type { Vec } from './types';

export const PLAYER_BALL_MOUSE_RADIUS = 18;
export const PLAYER_BALL_PEN_RADIUS = 22;
export const PLAYER_BALL_TOUCH_RADIUS = 30;

/** The rendered ball is intentionally tiny, so pointer input gets a stable
 * screen-space pickup radius that remains usable at fitted and native zoom. */
export function playerBallHitRadius(pointerType: string): number {
  if (pointerType === 'touch') return PLAYER_BALL_TOUCH_RADIUS;
  if (pointerType === 'pen') return PLAYER_BALL_PEN_RADIUS;
  return PLAYER_BALL_MOUSE_RADIUS;
}

export function pointerStartsAtPlayerBall(pointer: Vec, ballScreen: Vec, pointerType: string): boolean {
  return Math.hypot(pointer.x - ballScreen.x, pointer.y - ballScreen.y) <= playerBallHitRadius(pointerType);
}
