import type { ActorView, Vec } from './types';

export const ACTOR_SCALE_MIN = 0.76;
export const ACTOR_SCALE_MAX = 2.4;
export const ACTOR_TOUCH_TARGET = 44;

export const GOLFER_SPRITE_SIZE = { width: 32, height: 44 } as const;
export const GOLFER_FOOT_ANCHOR = { x: 16, y: 43 } as const;
export const COURSE_STAFF_SPRITE_SIZE = { width: 36, height: 42 } as const;
export const COURSE_STAFF_FOOT_ANCHOR = { x: 17, y: 37 } as const;

export interface ActorSpriteMetrics {
  size: { width: number; height: number };
  foot: { x: number; y: number };
}

export interface ActorScreenRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface ActorDestinationRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ActorDrawPlan {
  anchor: Vec;
  destination: ActorDestinationRect;
  mirrorX: boolean;
}

export interface ActorVisualGeometry {
  scale: number;
  sprite: ActorScreenRect;
  labelY: number;
  shadow: { x: number; y: number; radiusX: number; radiusY: number };
  ring: { x: number; y: number; radiusX: number; radiusY: number };
}

export const GOLFER_METRICS: ActorSpriteMetrics = {
  size: GOLFER_SPRITE_SIZE,
  foot: GOLFER_FOOT_ANCHOR,
};

export const COURSE_STAFF_METRICS: ActorSpriteMetrics = {
  size: COURSE_STAFF_SPRITE_SIZE,
  foot: COURSE_STAFF_FOOT_ANCHOR,
};

/** One capped world scale keeps art, labels, bob, rings, and picking aligned. */
export function actorSpriteScale(zoom: number): number {
  const finiteZoom = Number.isFinite(zoom) ? zoom : ACTOR_SCALE_MIN;
  return Math.min(ACTOR_SCALE_MAX, Math.max(ACTOR_SCALE_MIN, finiteZoom));
}

export function actorWalkingBob(phase: number, walking: boolean, zoom: number, amplitude = 1.2): number {
  return walking ? Math.abs(Math.sin(phase)) * amplitude * actorSpriteScale(zoom) : 0;
}

export function actorVisualGeometry(
  anchor: Vec,
  zoom: number,
  metrics: ActorSpriteMetrics,
  bob = 0,
): ActorVisualGeometry {
  const scale = actorSpriteScale(zoom);
  const left = anchor.x - metrics.foot.x * scale;
  const top = anchor.y - bob - metrics.foot.y * scale;
  const sprite = {
    left,
    right: left + metrics.size.width * scale,
    top,
    bottom: top + metrics.size.height * scale,
  };
  return {
    scale,
    sprite,
    labelY: top - Math.max(2, 2 * scale),
    shadow: {
      x: anchor.x,
      y: anchor.y + 1.25 * scale,
      radiusX: Math.max(6.5, metrics.size.width * 0.22) * scale,
      radiusY: Math.max(2.2, metrics.size.width * 0.075) * scale,
    },
    ring: {
      x: anchor.x,
      y: anchor.y + 1.4 * scale,
      radiusX: Math.max(12, metrics.size.width * 0.42) * scale,
      radiusY: Math.max(4.8, metrics.size.width * 0.16) * scale,
    },
  };
}

export function golferVisualGeometry(anchor: Vec, zoom: number, bob = 0): ActorVisualGeometry {
  return actorVisualGeometry(anchor, zoom, GOLFER_METRICS, bob);
}

/** Align destination edges to physical pixels while keeping layout in CSS pixels. */
export function snapActorDestinationRect(rect: ActorDestinationRect, devicePixelRatio: number): ActorDestinationRect {
  const dpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const left = Math.round(rect.x * dpr) / dpr;
  const top = Math.round(rect.y * dpr) / dpr;
  const right = Math.round((rect.x + rect.width) * dpr) / dpr;
  const bottom = Math.round((rect.y + rect.height) * dpr) / dpr;
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** Shared production/atlas plan for device-pixel snapping and view-aware mirroring. */
export function actorDrawPlan(
  anchor: Vec,
  metrics: ActorSpriteMetrics,
  scale: number,
  view: ActorView,
  face: number,
  devicePixelRatio: number,
  bob = 0,
  mirrorAllViews = false,
): ActorDrawPlan {
  const dpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const snap = (value: number) => Math.round(value * dpr) / dpr;
  return {
    anchor: { x: snap(anchor.x), y: snap(anchor.y - bob) },
    destination: snapActorDestinationRect({
      x: -metrics.foot.x * scale,
      y: -metrics.foot.y * scale,
      width: metrics.size.width * scale,
      height: metrics.size.height * scale,
    }, dpr),
    mirrorX: face < 0 && (view === 'side' || mirrorAllViews),
  };
}

export function expandActorTouchTarget(bounds: ActorScreenRect, minimum = ACTOR_TOUCH_TARGET): ActorScreenRect {
  const padX = Math.max(0, (minimum - (bounds.right - bounds.left)) / 2);
  const padY = Math.max(0, (minimum - (bounds.bottom - bounds.top)) / 2);
  return {
    left: bounds.left - padX,
    right: bounds.right + padX,
    top: bounds.top - padY,
    bottom: bounds.bottom + padY,
  };
}
