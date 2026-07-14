import { describe, expect, it } from 'vitest';
import {
  ACTOR_SCALE_MAX,
  ACTOR_SCALE_MIN,
  COURSE_STAFF_FOOT_ANCHOR,
  COURSE_STAFF_SPRITE_SIZE,
  GOLFER_FOOT_ANCHOR,
  GOLFER_SPRITE_SIZE,
  actorSpriteScale,
  actorDrawPlan,
  actorWalkingBob,
  golferVisualGeometry,
  snapActorDestinationRect,
} from './actorGeometry';

describe('shared native actor geometry', () => {
  it('keeps native pixel art readable at fitted zoom and caps close-up scale', () => {
    expect(ACTOR_SCALE_MIN).toBe(.76);
    expect(ACTOR_SCALE_MAX).toBe(2.4);
    expect([.4, .76, 1, 2.4, 3.4].map(actorSpriteScale)).toEqual([.76, .76, 1, 2.4, 2.4]);
    expect(GOLFER_SPRITE_SIZE.height * actorSpriteScale(.4)).toBeGreaterThan(33);
    expect(COURSE_STAFF_SPRITE_SIZE.height * actorSpriteScale(.4)).toBeGreaterThan(31);
  });

  it('publishes stable foot anchors for the golfer and broader staff silhouettes', () => {
    expect(GOLFER_SPRITE_SIZE).toEqual({ width: 32, height: 44 });
    expect(GOLFER_FOOT_ANCHOR).toEqual({ x: 16, y: 43 });
    expect(COURSE_STAFF_SPRITE_SIZE).toEqual({ width: 36, height: 42 });
    expect(COURSE_STAFF_FOOT_ANCHOR).toEqual({ x: 17, y: 37 });
    expect(COURSE_STAFF_SPRITE_SIZE.width).toBeGreaterThan(GOLFER_SPRITE_SIZE.width);
  });

  it('derives sprite, label, shadow, and selection ring from the same capped scale', () => {
    const normal = golferVisualGeometry({ x: 100, y: 100 }, 1, 4);
    expect(normal.sprite).toEqual({ left: 84, right: 116, top: 53, bottom: 97 });
    expect(normal.labelY).toBe(51);
    expect(normal.shadow).toMatchObject({ x: 100, y: 101.25 });
    expect(normal.ring.x).toBe(100);
    expect(normal.ring.radiusX).toBeCloseTo(13.44);

    const capped = golferVisualGeometry({ x: 100, y: 100 }, 9);
    expect(capped.scale).toBe(2.4);
    expect(capped.ring.radiusX).toBeCloseTo(32.256);
  });

  it('uses the same capped scale for walking bob as rendering and picking', () => {
    expect(actorWalkingBob(Math.PI / 2, true, .4)).toBeCloseTo(1.2 * .76);
    expect(actorWalkingBob(Math.PI / 2, true, 9)).toBeCloseTo(1.2 * 2.4);
    expect(actorWalkingBob(Math.PI / 2, false, 1)).toBe(0);
  });

  it('snaps actor destination edges to physical pixels at the active DPR', () => {
    expect(snapActorDestinationRect({ x: -15.7, y: -42.2, width: 31.4, height: 43.8 }, 2))
      .toEqual({ x: -15.5, y: -42, width: 31, height: 43.5 });
    expect(snapActorDestinationRect({ x: .4, y: .4, width: 10.2, height: 10.2 }, 0))
      .toEqual({ x: 0, y: 0, width: 11, height: 11 });
  });

  it('shares view-aware snapping and manual-stance mirroring with the visual atlas', () => {
    const side = actorDrawPlan({ x: 100.2, y: 80.2 }, { size: GOLFER_SPRITE_SIZE, foot: GOLFER_FOOT_ANCHOR }, .76, 'side', -1, 2, .3);
    expect(side).toEqual({
      anchor: { x: 100, y: 80 },
      destination: { x: -12, y: -32.5, width: 24, height: 33.5 },
      mirrorX: true,
    });
    expect(actorDrawPlan({ x: 0, y: 0 }, { size: GOLFER_SPRITE_SIZE, foot: GOLFER_FOOT_ANCHOR }, 1, 'rear', -1, 1).mirrorX).toBe(false);
    expect(actorDrawPlan({ x: 0, y: 0 }, { size: GOLFER_SPRITE_SIZE, foot: GOLFER_FOOT_ANCHOR }, 1, 'rear', -1, 1, 0, true).mirrorX).toBe(true);
  });
});
