import { describe, expect, it } from 'vitest';
import {
  COURSE_STAFF_ARCHETYPES,
  COURSE_STAFF_SPRITE_SIZE,
  GOLFER_SPRITE_SIZE,
  courseStaffAnimationFrame,
  type CourseStaffKind,
} from './sprites';

const KINDS: CourseStaffKind[] = ['ranger', 'groundskeeper', 'turftech'];

describe('dedicated course-staff sprites', () => {
  it('gives every visible field role a distinct silhouette and profession tool', () => {
    const archetypes = KINDS.map((kind) => COURSE_STAFF_ARCHETYPES[kind]);

    expect(new Set(archetypes.map((archetype) => archetype.primary)).size).toBe(KINDS.length);
    expect(new Set(archetypes.map((archetype) => archetype.headwear)).size).toBe(KINDS.length);
    expect(archetypes.map((archetype) => archetype.tool)).toEqual(['binoculars', 'rake', 'watering-can']);
  });

  it('keeps staff and golfers on distinct, readable actor canvases', () => {
    expect(COURSE_STAFF_SPRITE_SIZE).toEqual({ width: 30, height: 36 });
    expect(GOLFER_SPRITE_SIZE).toEqual({ width: 30, height: 40 });
    expect(GOLFER_SPRITE_SIZE).not.toEqual(COURSE_STAFF_SPRITE_SIZE);
  });

  it('alternates independent walking and profession-work frames', () => {
    expect(courseStaffAnimationFrame(false, 0)).toBe('walkA');
    expect(courseStaffAnimationFrame(false, Math.PI * 1.5)).toBe('walkB');
    expect(courseStaffAnimationFrame(true, 0)).toBe('workA');
    expect(courseStaffAnimationFrame(true, Math.PI * 1.5)).toBe('workB');
  });

  it('presents the skilled turf role as visibly garden-oriented', () => {
    const turf = COURSE_STAFF_ARCHETYPES.turftech;
    expect(turf.label).toMatch(/garden/i);
    expect(turf.headwear).toBe('sun-hat');
    expect(turf.tool).toBe('watering-can');
  });
});
