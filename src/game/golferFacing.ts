import { isoOf } from './camera';
import type { ActorView, Vec } from './types';

export interface GolferFacing {
  face: 1 | -1;
  view: ActorView;
}

const isActorView = (view: unknown): view is ActorView => view === 'front' || view === 'rear' || view === 'side';

/** Migrates the old rear-view boolean without changing old side-on art. */
export function actorViewWithLegacyFallback(actor: { view?: unknown; facingAway?: unknown }): ActorView {
  if (isActorView(actor.view)) return actor.view;
  return actor.facingAway === true ? 'rear' : 'side';
}

/** Resolve a native view from a screen-space movement vector. */
export function actorFacingForScreenDelta(dx: number, dy: number): GolferFacing {
  const lateral = Math.abs(dx) >= Math.abs(dy) / 1.2;
  return {
    face: dx < 0 ? -1 : 1,
    view: lateral ? 'side' : dy < 0 ? 'rear' : 'front',
  };
}

/** Manual stance: the authored view follows the shot while handedness follows the ball side. */
export function manualGolferFacing(shotDx: number, shotDy: number, actorX: number, ballX: number): GolferFacing {
  return {
    view: actorFacingForScreenDelta(shotDx, shotDy).view,
    face: ballX < actorX ? -1 : 1,
  };
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
  return actorFacingForScreenDelta(dx, dy);
}
