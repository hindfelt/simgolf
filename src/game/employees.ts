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
  ranger: { name: 'Ranger', wage: 1.1, skilled: false, short: '🚦', blurb: 'Speeds up play around the course.' },
  groundskeeper: { name: 'Groundskeeper', wage: 1.0, skilled: false, short: '🧹', blurb: 'Clears dandelions — tidier, happier course.' },
  sodavendor: { name: 'Soda Vendor', wage: 1.0, skilled: false, short: '🥤', blurb: 'Refreshes thirsty golfers.' },
  celebrity: { name: 'Celebrity', wage: 4.0, skilled: true, short: '🌟', blurb: 'Star power — big fun-rating boost.' },
  marshall: { name: 'Marshall', wage: 2.6, skilled: true, short: '🎽', blurb: 'Hurries play and calms angry golfers.' },
  turftech: { name: 'Turf Technician', wage: 2.0, skilled: true, short: '🌱', blurb: 'Kills crabgrass & divots — pristine turf.' },
  refreshment: { name: 'Refreshment Consultant', wage: 2.4, skilled: true, short: '🍹', blurb: 'Drinks for everyone — attitude up.' },
};

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
  return clamp(tidy * 0.18 + drinks * 0.22, 0, 1.6);
}
