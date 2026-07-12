import { EH } from './constants';
import type { CourseTheme, TreeCanopyImpact, Vec } from './types';
import { hash2 } from './rng';

export type SharedTreeKind = 'round' | 'pine' | 'blossom';

export interface TreeCollisionProfile {
  tileX: number;
  tileY: number;
  center: Vec;
  seed: number;
  kind: SharedTreeKind;
  /** Matches render.ts: (0.78 + seed * 0.38) * 0.92. */
  visualScale: number;
  canopyRadius: number;
  canopyBottom: number;
  canopyTop: number;
  trunkRadius: number;
  trunkTop: number;
}

/** Shared species rule matching the current renderer exactly. */
export function sharedTreeKindFor(theme: CourseTheme, seed: number): SharedTreeKind {
  if (theme === 'tropical') return seed > 0.5 ? 'blossom' : 'round';
  if (theme === 'links') return seed > 0.75 ? 'blossom' : seed > 0.35 ? 'pine' : 'round';
  if (theme === 'desert') return seed > 0.8 ? 'blossom' : 'round';
  return seed > 0.85 ? 'blossom' : seed > 0.62 ? 'pine' : 'round';
}

/** Deterministic gameplay cross-section derived from the visible 42x56 sprite. */
export function treeCollisionProfile(tileX: number, tileY: number, theme: CourseTheme): TreeCollisionProfile {
  const seed = hash2(tileX, tileY);
  const kind = sharedTreeKindFor(theme, seed);
  const visualScale = (0.78 + seed * 0.38) * 0.92;
  const pine = kind === 'pine';
  return {
    tileX,
    tileY,
    center: { x: tileX + 0.5, y: tileY + 0.5 },
    seed,
    kind,
    visualScale,
    // Slightly inside the visible crown: conservative enough to avoid invisible hits.
    canopyRadius: (pine ? 0.46 : 0.54) * (0.92 + seed * 0.16),
    // Sprite foliage begins about 12px (pine) / 17px (round) above its root.
    canopyBottom: (pine ? 11 : 17) * visualScale,
    canopyTop: (pine ? 48 : 52) * visualScale,
    trunkRadius: 0.105 * (0.94 + seed * 0.12),
    trunkTop: 50 * visualScale,
  };
}

export function treeGroundAltitude(profile: TreeCollisionProfile, elevationAt: (x: number, y: number) => number): number {
  return elevationAt(profile.center.x, profile.center.y) * EH;
}

/**
 * Returns the part struck at this horizontal position/absolute altitude.
 * Crown radius changes with altitude: round/blossom trees use an ellipsoid and
 * pine foliage tapers linearly to its top. Below foliage only the trunk exists.
 */
export function treeImpactKind(
  profile: TreeCollisionProfile,
  position: Vec,
  absoluteAltitude: number,
  elevationAt: (x: number, y: number) => number,
): TreeCanopyImpact['kind'] | null {
  const radial = Math.hypot(position.x - profile.center.x, position.y - profile.center.y);
  const relativeAltitude = absoluteAltitude - treeGroundAltitude(profile, elevationAt);
  if (relativeAltitude < 0) return null;
  if (radial <= profile.trunkRadius && relativeAltitude <= profile.trunkTop) return 'trunk';
  if (relativeAltitude < profile.canopyBottom || relativeAltitude > profile.canopyTop) return null;
  const heightProgress = (relativeAltitude - profile.canopyBottom) / Math.max(0.001, profile.canopyTop - profile.canopyBottom);
  const radiusAtAltitude = profile.kind === 'pine'
    ? profile.canopyRadius * (1 - heightProgress)
    : profile.canopyRadius * Math.sqrt(Math.max(0, 1 - Math.pow(heightProgress * 2 - 1, 2)));
  if (radial > radiusAtAltitude) return null;
  return profile.kind === 'pine' ? 'pine' : 'canopy';
}
