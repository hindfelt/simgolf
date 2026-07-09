import { H, W } from './constants';
import type { Building, FacilityActivity, Vec } from './types';

export interface FacilityActivityPose extends Vec {
  altitude: number;
  scale: number;
  heading: Vec;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => {
  const n = clamp01(t);
  return n * n * (3 - 2 * n);
};

function leg(a: Vec, b: Vec, t: number, altitudeA: number, altitudeB: number, scaleA: number, scaleB: number): FacilityActivityPose {
  const n = smooth(t);
  return {
    x: lerp(a.x, b.x, n),
    y: lerp(a.y, b.y, n),
    altitude: lerp(altitudeA, altitudeB, n),
    scale: lerp(scaleA, scaleB, n),
    heading: { x: b.x - a.x, y: b.y - a.y },
  };
}

/** Deterministic world-space pose; rendering converts this through the active camera rotation. */
export function facilityActivityPose(activity: FacilityActivity, facility: Building): FacilityActivityPose {
  const progress = clamp01(activity.age / Math.max(0.001, activity.duration));
  if (activity.kind === 'marina-boat') {
    const angle = progress * Math.PI * 2 - Math.PI * 0.2;
    const rx = Math.max(0.45, facility.w * 0.34);
    const ry = Math.max(0.32, facility.h * 0.2);
    return {
      x: facility.x + facility.w / 2 + Math.cos(angle) * rx,
      y: facility.y + facility.h / 2 + Math.sin(angle) * ry,
      altitude: 0,
      scale: 0.78,
      heading: { x: -Math.sin(angle) * rx, y: Math.cos(angle) * ry },
    };
  }

  const dir = activity.direction;
  const runwayY = facility.y + facility.h * 0.54;
  const threshold = { x: dir > 0 ? facility.x + 0.5 : facility.x + facility.w - 0.5, y: runwayY };
  const farEnd = { x: dir > 0 ? facility.x + facility.w - 0.55 : facility.x + 0.55, y: runwayY };
  const hangar = { x: facility.x + Math.min(1.15, facility.w * 0.22), y: facility.y + 0.42 };
  const variation = Math.sin(activity.id * 12.9898) * H * 0.2;

  if (activity.kind === 'plane-arrival') {
    const outside = { x: dir > 0 ? -6 : W + 6, y: Math.max(-4, Math.min(H + 4, runwayY + variation)) };
    if (progress < 0.62) return leg(outside, threshold, progress / 0.62, 92, 8, 0.72, 0.94);
    if (progress < 0.82) return leg(threshold, farEnd, (progress - 0.62) / 0.2, 8, 0, 0.94, 0.82);
    return leg(farEnd, hangar, (progress - 0.82) / 0.18, 0, 0, 0.72, 0.58);
  }

  const outside = { x: dir > 0 ? W + 6 : -6, y: Math.max(-4, Math.min(H + 4, runwayY - variation * 0.7)) };
  if (progress < 0.24) return leg(hangar, threshold, progress / 0.24, 0, 0, 0.58, 0.72);
  if (progress < 0.5) return leg(threshold, farEnd, (progress - 0.24) / 0.26, 0, 14, 0.76, 0.96);
  return leg(farEnd, outside, (progress - 0.5) / 0.5, 14, 98, 0.96, 0.7);
}
