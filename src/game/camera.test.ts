import { beforeEach, describe, expect, it } from 'vitest';
import { COMPACT_PLAY_CONTROLLER_VISIBLE_HEIGHT, CONTROLLER_VISIBLE_HEIGHT, COURSE_SAFE_GAP, COURSE_SAFE_TOP, cameraPositionForWorldPoint, controllerVisibleHeightForViewport, coursePointNeedsCameraFollow, courseSafeViewport } from './camera';
import { H, W } from './constants';
import { S } from './state';

describe('course camera safe viewport', () => {
  beforeEach(() => {
    S.rot = 0;
    S.cam = { x: 0, y: 0, z: 1 };
    S.view = { w: 688, h: 368 };
    S.player = null;
    S.elevC = new Uint8Array((W + 1) * (H + 1));
  });

  it('reserves top chrome and the compact short-landscape controller plus breathing room', () => {
    const safe = courseSafeViewport(688, 368, true);
    expect(safe).toMatchObject({ left: 10, right: 678, top: COURSE_SAFE_TOP, bottom: 216, centerX: 344, centerY: 166 });
    expect(368 - safe.bottom).toBe(COMPACT_PLAY_CONTROLLER_VISIBLE_HEIGHT + COURSE_SAFE_GAP);
  });

  it('switches to the native 166px fan only when the viewport can carry it', () => {
    expect(controllerVisibleHeightForViewport(520, true)).toBe(COMPACT_PLAY_CONTROLLER_VISIBLE_HEIGHT);
    expect(controllerVisibleHeightForViewport(521, true)).toBe(CONTROLLER_VISIBLE_HEIGHT);
    expect(controllerVisibleHeightForViewport(368, false)).toBe(CONTROLLER_VISIBLE_HEIGHT);
    expect(controllerVisibleHeightForViewport(716, true, 1592)).toBe(COMPACT_PLAY_CONTROLLER_VISIBLE_HEIGHT);
    expect(controllerVisibleHeightForViewport(768, true, 1366)).toBe(CONTROLLER_VISIBLE_HEIGHT);
    expect(courseSafeViewport(1592, 716).bottom).toBe(716 - CONTROLLER_VISIBLE_HEIGHT - COURSE_SAFE_GAP);
    expect(courseSafeViewport(1592, 716, true).bottom).toBe(716 - COMPACT_PLAY_CONTROLLER_VISIBLE_HEIGHT - COURSE_SAFE_GAP);
  });

  it('centres world targets in the unobscured course rectangle', () => {
    const target = cameraPositionForWorldPoint(10, 10);
    S.cam.x = target.x;
    S.cam.y = target.y;
    const safe = courseSafeViewport(S.view.w, S.view.h);
    const isoX = ((10 - 10) * 36) / 2;
    const isoY = ((10 + 10) * 18) / 2;
    expect(S.cam.x + isoX).toBe(safe.centerX);
    expect(S.cam.y + isoY).toBe(safe.centerY);
  });

  it('requests follow before a point can pass beneath the shell', () => {
    const safe = courseSafeViewport(688, 368);
    expect(coursePointNeedsCameraFollow({ x: safe.centerX, y: safe.centerY }, 688, 368)).toBe(false);
    expect(coursePointNeedsCameraFollow({ x: safe.centerX, y: safe.bottom - 1 }, 688, 368)).toBe(true);
    expect(coursePointNeedsCameraFollow({ x: safe.left, y: safe.centerY }, 688, 368)).toBe(true);
  });
});
