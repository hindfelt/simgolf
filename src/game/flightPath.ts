import { Tile } from './types';
import type { Ball, CourseTheme, ShotShape, TreeCanopyImpact, Vec } from './types';
import { EH, H, W } from './constants';
import { clamp, hash2, lerp } from './rng';
import { treeCollisionProfile, treeImpactKind } from './treeGeometry';

export type FlightPath = Pick<Ball, 'fx' | 'fy' | 'tx' | 'ty' | 'h' | 'shotShape' | 'curvePerpX' | 'curvePerpY' | 'curveDistance' | 'lowFlight'>;

export interface FlightCollisionEnvironment {
  theme: CourseTheme;
  tileAt: (x: number, y: number) => number;
  elevationAt: (x: number, y: number) => number;
}

export function shapeCurveOffset(shape: ShotShape, intend: number, t: number): number {
  if (shape === 'fade') return intend * 0.22 * Math.pow(t, 1.5);
  if (shape === 'draw') return -intend * 0.22 * Math.pow(t, 1.5);
  if (shape === 'hook') return -intend * 0.38 * Math.pow(t, 1.35);
  return 0;
}

export function flightApexHeight(targetDistance: number, heightMultiplier = 1): number {
  return Math.min(64, 10 + Math.max(0, targetDistance) * 4.5) * heightMultiplier;
}

export function ballFlightPosition(path: Pick<FlightPath, 'fx' | 'fy' | 'tx' | 'ty' | 'shotShape' | 'curvePerpX' | 'curvePerpY' | 'curveDistance'>, t: number): Vec {
  const progress = clamp(t, 0, 1);
  let x = lerp(path.fx, path.tx, progress);
  let y = lerp(path.fy, path.ty, progress);
  if (path.shotShape && path.curveDistance && path.curvePerpX !== undefined && path.curvePerpY !== undefined) {
    const desired = shapeCurveOffset(path.shotShape, path.curveDistance, progress);
    const chord = shapeCurveOffset(path.shotShape, path.curveDistance, 1) * progress;
    x += path.curvePerpX * (desired - chord);
    y += path.curvePerpY * (desired - chord);
  }
  return { x, y };
}

export interface FlightTrailSample extends Vec {
  t: number;
  lift: number;
  alpha: number;
}

/** Recent player-flight history for a readable, shape-colored tracer. */
export function flightTrailSamples(
  path: FlightPath & Pick<Ball, 't' | 'canopyImpact'>,
  count = 12,
  history = 0.34,
): FlightTrailSample[] {
  const endT = Math.min(clamp(path.t, 0, 1), path.canopyImpact?.t ?? 1);
  if (endT <= 0.0001) {
    const position = ballFlightPosition(path, 0);
    return [{ ...position, t: 0, lift: 0, alpha: 1 }];
  }
  const samples = Math.max(2, Math.min(32, Math.round(count)));
  const startT = Math.max(0, endT - Math.max(0.04, history));
  return Array.from({ length: samples }, (_, index) => {
    const progress = index / (samples - 1);
    const t = lerp(startT, endT, progress);
    const position = ballFlightPosition(path, t);
    return {
      ...position,
      t,
      lift: Math.sin(Math.PI * t) * path.h,
      alpha: 0.12 + progress * 0.88,
    };
  });
}

/** Absolute altitude includes local terrain, matching PE() plus the rendered arc. */
export function flightAltitude(path: FlightPath, t: number, elevationAt: (x: number, y: number) => number): number {
  const position = ballFlightPosition(path, t);
  return elevationAt(position.x, position.y) * EH + Math.sin(Math.PI * clamp(t, 0, 1)) * path.h;
}

/** Conservative subdivision count guaranteeing curved samples remain <=0.10 tile apart. */
export function flightSampleCount(path: FlightPath): number {
  const chord = Math.hypot(path.tx - path.fx, path.ty - path.fy);
  // The shaped path's deviation from its endpoint chord begins and ends at zero;
  // twice the full curve is a safe upper bound on that extra variation.
  const curveAllowance = path.shotShape && path.curveDistance ? Math.abs(shapeCurveOffset(path.shotShape, path.curveDistance, 1)) * 2 : 0;
  return Math.max(2, Math.ceil((chord + curveAllowance) / 0.08));
}

/** First player-path obstruction, sampled at <=0.10 world tile per step. */
export function firstTreeCanopyImpact(path: FlightPath, environment: FlightCollisionEnvironment): TreeCanopyImpact | null {
  const steps = flightSampleCount(path);
  const originX = Math.floor(path.fx);
  const originY = Math.floor(path.fy);
  const originIsTree = environment.tileAt(originX, originY) === Tile.TREE;
  const originProfile = originIsTree ? treeCollisionProfile(originX, originY, environment.theme) : null;
  let originCleared = !originIsTree;

  for (let step = 1; step < steps; step++) {
    const t = step / steps;
    const position = ballFlightPosition(path, t);
    const pointX = Math.floor(position.x);
    const pointY = Math.floor(position.y);
    const altitude = flightAltitude(path, t, environment.elevationAt);
    if (!originCleared && originProfile) {
      const radial = Math.hypot(position.x - originProfile.center.x, position.y - originProfile.center.y);
      const relativeAltitude = altitude - environment.elevationAt(originProfile.center.x, originProfile.center.y) * EH;
      const insideOriginVolume = radial <= Math.max(originProfile.canopyRadius, originProfile.trunkRadius)
        && relativeAltitude >= 0
        && relativeAltitude <= Math.max(originProfile.canopyTop, originProfile.trunkTop);
      if (!insideOriginVolume) originCleared = true;
    }
    for (let treeY = pointY - 1; treeY <= pointY + 1; treeY++) {
      for (let treeX = pointX - 1; treeX <= pointX + 1; treeX++) {
        if (environment.tileAt(treeX, treeY) !== Tile.TREE) continue;
        const isOrigin = originIsTree && treeX === originX && treeY === originY;
        const profile = isOrigin ? originProfile! : treeCollisionProfile(treeX, treeY, environment.theme);
        const kind = treeImpactKind(profile, position, altitude, environment.elevationAt);
        if (isOrigin && !originCleared) {
          // Recovery starts are allowed to escape their current collision volume.
          // After the first clear sample, a shaped return into that tree is real.
          continue;
        }
        if (kind) return { t, x: position.x, y: position.y, treeX, treeY, kind, altitude };
      }
    }
  }
  return null;
}

/**
 * Deterministic resting point after a tree strike. The rebound remains at or
 * behind contact along the incoming tangent and is always inside the map.
 */
export function treeDropPosition(path: FlightPath, impact: TreeCanopyImpact): Vec {
  const before = ballFlightPosition(path, Math.max(0, impact.t - 0.015));
  const tangentX = impact.x - before.x;
  const tangentY = impact.y - before.y;
  const magnitude = Math.hypot(tangentX, tangentY) || 1;
  const dirX = tangentX / magnitude;
  const dirY = tangentY / magnitude;
  const side = (hash2(impact.treeX * 29 + 7, impact.treeY * 31 + 11) - 0.5) * 0.28;
  let x = clamp(impact.x - dirX * 0.16 - dirY * side, 0.6, W - 0.6);
  let y = clamp(impact.y - dirY * 0.16 + dirX * side, 0.6, H - 0.6);

  // A boundary clamp can remove the backward component. Project it back onto
  // the contact half-plane so no map-edge strike teleports the ball forward.
  const forward = (x - impact.x) * dirX + (y - impact.y) * dirY;
  if (forward > 0) {
    x = clamp(x - dirX * (forward + 0.001), 0.6, W - 0.6);
    y = clamp(y - dirY * (forward + 0.001), 0.6, H - 0.6);
  }
  const clampedForward = (x - impact.x) * dirX + (y - impact.y) * dirY;
  if (clampedForward > 0) {
    // A valid flight contact is map-bounded; contact itself is the safest
    // degenerate rebound if two simultaneous boundary clamps oppose projection.
    return { x: clamp(impact.x, 0.6, W - 0.6), y: clamp(impact.y, 0.6, H - 0.6) };
  }
  return { x, y };
}

/** Explicit scope guard: this iteration does not rebalance autonomous golfers. */
export function playerOnlyTreeCanopyImpact(path: FlightPath & Pick<Ball, 'owner'>, environment: FlightCollisionEnvironment): TreeCanopyImpact | null {
  return path.owner === 'P' ? firstTreeCanopyImpact(path, environment) : null;
}
