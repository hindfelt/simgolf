import { describe, expect, it } from 'vitest';
import {
  COURSE_STAFF_ARCHETYPES,
  COURSE_STAFF_SPRITE_SIZE,
  GOLFER_SPRITE_SIZE,
  courseStaffAnimationFrame,
  type CourseStaffKind,
} from './sprites';
import { EMP_CATALOG, EMPLOYEE_WORK_ZONES, employeeDisplayName, employeeWorkZone } from './employees';
import type { EmployeeKind } from './types';

const KINDS: CourseStaffKind[] = [
  'clubpro',
  'ranger',
  'groundskeeper',
  'sodavendor',
  'celebrity',
  'marshall',
  'turftech',
  'refreshment',
];

describe('dedicated course-staff sprites', () => {
  it('gives every paid role a distinct silhouette and profession tool', () => {
    const archetypes = KINDS.map((kind) => COURSE_STAFF_ARCHETYPES[kind]);

    expect(new Set(archetypes.map((archetype) => archetype.primary)).size).toBe(KINDS.length);
    expect(new Set(archetypes.map((archetype) => archetype.headwear)).size).toBe(KINDS.length);
    expect(new Set(archetypes.map((archetype) => archetype.tool)).size).toBe(KINDS.length);
    expect(Object.keys(COURSE_STAFF_ARCHETYPES).sort()).toEqual([...KINDS].sort());
    expect(Object.keys(COURSE_STAFF_ARCHETYPES).sort()).toEqual(Object.keys(EMP_CATALOG).sort());
  });

  it('routes every employee archetype to a coherent part of the live course', () => {
    expect(Object.keys(EMPLOYEE_WORK_ZONES).sort()).toEqual([...KINDS].sort());
    expect(employeeWorkZone('clubpro')).toBe('first-tee');
    expect(employeeWorkZone('ranger')).toBe('wildlife');
    expect(employeeWorkZone('groundskeeper')).toBe('turf');
    expect(employeeWorkZone('sodavendor')).toBe('golfers');
    expect(employeeWorkZone('celebrity')).toBe('first-tee');
    expect(employeeWorkZone('marshall')).toBe('golfers');
    expect(employeeWorkZone('turftech')).toBe('turf');
    expect(employeeWorkZone('refreshment')).toBe('clubhouse');
  });

  it('keeps employee names deterministic across save reloads', () => {
    const employee = { id: 1_234.567, kind: 'refreshment' as EmployeeKind };
    expect(employeeDisplayName(employee)).toBe(employeeDisplayName({ ...employee }));
    expect(employeeDisplayName(employee)).toMatch(/\w+ \w+/);
    expect(new Set(KINDS.map((kind, index) => employeeDisplayName({ id: index + 0.125, kind })))).toHaveLength(KINDS.length);
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
