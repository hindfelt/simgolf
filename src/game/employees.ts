import type { Employee, EmployeeKind } from './types';
import { S } from './state';
import { clamp } from './rng';

export interface EmployeeDef {
  name: string;
  wage: number; // $/sec
  skilled: boolean; // requires 6+ holes
  short: string;
  blurb: string;
}

export const EMP_CATALOG: Record<EmployeeKind, EmployeeDef> = {
  clubpro: { name: 'Club Pro', wage: 1.4, skilled: false, short: '🧑‍🏫', blurb: 'Greets golfers — steady fun boost.' },
  ranger: { name: 'Ranger', wage: 1.1, skilled: false, short: '🚦', blurb: 'Manages wildlife and keeps play moving.' },
  groundskeeper: { name: 'Groundskeeper', wage: 1.0, skilled: false, short: '🧹', blurb: 'Clears weeds and repairs divots.' },
  sodavendor: { name: 'Soda Vendor', wage: 1.0, skilled: false, short: '🥤', blurb: 'Refreshes thirsty golfers.' },
  celebrity: { name: 'Celebrity', wage: 4.0, skilled: true, short: '🌟', blurb: 'Star power — big fun-rating boost.' },
  marshall: { name: 'Marshall', wage: 2.6, skilled: true, short: '🎽', blurb: 'Hurries play and calms angry golfers.' },
  turftech: { name: 'Turf Technician', wage: 2.0, skilled: true, short: '🌱', blurb: 'Kills crabgrass & divots — pristine turf.' },
  refreshment: { name: 'Refreshment Consultant', wage: 2.4, skilled: true, short: '🍹', blurb: 'Drinks for everyone — attitude up.' },
};

export type EmployeeWorkZone = 'first-tee' | 'wildlife' | 'turf' | 'golfers' | 'clubhouse';

/**
 * A visible employee should behave like a character, not an anonymous modifier.
 * Names and work zones are deterministic so saves keep the same cast between
 * sessions without expanding the serialized Employee shape.
 */
const EMPLOYEE_NAMES: Record<EmployeeKind, readonly string[]> = {
  clubpro: ['Maggie Mulligan', 'Chip Bunker', 'Theo Links'],
  ranger: ['Rae Woods', 'Bucky Green', 'Fern Walker'],
  groundskeeper: ['Moe Meadows', 'Daisy Divot', 'Artie Acres'],
  sodavendor: ['Fizz Parker', 'Poppy Cola', 'Sunny Sips'],
  celebrity: ['Dolly Driver', 'Rex Marquee', 'Gale Stardom'],
  marshall: ['Pace Mullins', 'Marty Rules', 'June Fairplay'],
  turftech: ['Tess Turf', 'Greta Green', 'Sod Stewart'],
  refreshment: ['Lola Lime', 'Minnie Mint', 'Jules Spritz'],
};

export const EMPLOYEE_WORK_ZONES: Record<EmployeeKind, EmployeeWorkZone> = {
  clubpro: 'first-tee',
  ranger: 'wildlife',
  groundskeeper: 'turf',
  sodavendor: 'golfers',
  celebrity: 'first-tee',
  marshall: 'golfers',
  turftech: 'turf',
  refreshment: 'clubhouse',
};

export function employeeDisplayName(employee: Pick<Employee, 'id' | 'kind'>): string {
  const names = EMPLOYEE_NAMES[employee.kind];
  const seed = Math.abs(Math.floor(employee.id * 1000));
  return names[seed % names.length];
}

export function employeeWorkZone(kind: EmployeeKind): EmployeeWorkZone {
  return EMPLOYEE_WORK_ZONES[kind];
}

const HIRE_MULTIPLE = 60; // one-off hiring cost = 60s of wages

export function hireCost(kind: EmployeeKind): number {
  return Math.round(EMP_CATALOG[kind].wage * HIRE_MULTIPLE);
}

/** Skilled staff need a daily-fee course (6+ holes). */
export function skilledUnlocked(): boolean {
  return S.holes.length >= 6;
}

export function countEmp(kind: EmployeeKind): number {
  let n = 0;
  for (const e of S.employees) if (e.kind === kind) n++;
  return n;
}

export function addEmployee(kind: EmployeeKind): Employee {
  const e: Employee = { id: Date.now() + Math.random(), kind, hiredAt: S.time };
  S.employees.push(e);
  return e;
}

export function fireOne(kind: EmployeeKind): boolean {
  const i = S.employees.findIndex((e) => e.kind === kind);
  if (i < 0) return false;
  S.employees.splice(i, 1);
  return true;
}

/* ---------------- effects ---------------- */
export function empWagesPerSec(): number {
  let w = 0;
  for (const e of S.employees) w += EMP_CATALOG[e.kind].wage;
  return w;
}
export function empSpawnMood(): number {
  return clamp(countEmp('clubpro') * 0.4 + countEmp('celebrity') * 0.9, 0, 2.2);
}
export function empMoveSpeedMul(): number {
  return clamp(1 + (countEmp('ranger') + countEmp('marshall')) * 0.2, 1, 1.7);
}
export function empMoodPerHole(): number {
  const tidy = countEmp('groundskeeper') + countEmp('turftech');
  const drinks = countEmp('sodavendor') + countEmp('refreshment');
  const managedWildlife = countEmp('ranger') + countEmp('marshall');
  const natureCare = managedWildlife > 0 ? Math.min(0.24, managedWildlife * 0.12) : -0.12;
  return clamp(tidy * 0.18 + drinks * 0.22 + natureCare, -0.12, 1.6);
}
