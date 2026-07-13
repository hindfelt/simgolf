import { isoOf } from './camera';
import type { Vec } from './types';

export interface GolferFacing {
  face: 1 | -1;
  facingAway: boolean;
}

/**
 * Resolve a golfer's readable sprite orientation in screen space. Recomputing
 * both fields together prevents a rear-facing walk from leaking into a later
 * side-on or down-screen movement after the route turns a corner.
 */
export function golferFacingBetween(from: Vec, to: Vec): GolferFacing {
  const a = isoOf(from.x, from.y);
  const b = isoOf(to.x, to.y);
  const dx = b.ix - a.ix;
  const dy = b.iy - a.iy;
  return {
    face: dx < 0 ? -1 : 1,
    facingAway: dy < 0 && Math.abs(dy) > Math.abs(dx) * 1.2,
  };
}
