import type { Hole, SgaClass } from './types';

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export const SGA_CLASS_INFO: Record<SgaClass, { skills: string; description: string }> = {
  Breather: { skills: 'No specialist skill', description: 'A forgiving hole that novices are likely to enjoy.' },
  Freeway: { skills: 'Length', description: 'Notable for length; rewards long drivers.' },
  Precise: { skills: 'Accuracy', description: 'Tight targets and hazards reward accurate golfers.' },
  Creative: { skills: 'Imagination', description: 'Shape, elevation and angles reward imagination.' },
  Challenge: { skills: 'Length + Accuracy', description: 'Demands both distance and precise placement.' },
  Heroic: { skills: 'Length + Imagination', description: 'Asks for power and inventive shot-making.' },
  Strategic: { skills: 'Accuracy + Imagination', description: 'Rewards careful placement and creative tactics.' },
  Classic: { skills: 'All three skills', description: 'A complete test of length, accuracy and imagination.' },
};

export function sgaSkillDemand(hole: Pick<Hole, 'tee' | 'cup' | 'par' | 'funBreakdown'>): { length: number; accuracy: number; imagination: number } {
  const distance = Math.hypot(hole.cup.x - hole.tee.x, hole.cup.y - hole.tee.y);
  const breakdown = hole.funBreakdown ?? { hazard: 0, dogleg: 0, elev: 0, green: 0 };
  const length = clamp01((distance - 12) / 15 + (hole.par >= 5 ? 0.18 : 0));
  const accuracy = clamp01(Math.max(breakdown.hazard * 1.05, breakdown.green * 0.8));
  const imagination = clamp01(Math.max(breakdown.dogleg * 1.1, breakdown.elev * 1.25, (breakdown.dogleg + breakdown.elev) * 0.7));
  return { length, accuracy, imagination };
}

export function sgaClassForDemand(demand: { length: number; accuracy: number; imagination: number }): SgaClass {
  const length = demand.length >= 0.48;
  const accuracy = demand.accuracy >= 0.42;
  const imagination = demand.imagination >= 0.34;
  const mask = (length ? 4 : 0) | (accuracy ? 2 : 0) | (imagination ? 1 : 0);
  return (['Breather', 'Creative', 'Precise', 'Strategic', 'Freeway', 'Heroic', 'Challenge', 'Classic'] as SgaClass[])[mask];
}

export function classifySgaHole(hole: Hole): SgaClass {
  hole.skillDemand = sgaSkillDemand(hole);
  hole.sgaClass = sgaClassForDemand(hole.skillDemand);
  return hole.sgaClass;
}

/** Manual p.24: Top 100 recognition raises the fee; Top 18 raises it further. */
export function sgaFeeMultiplier(hole: Pick<Hole, 'top100' | 'top18'>): number {
  return hole.top18 ? 1.35 : hole.top100 ? 1.15 : 1;
}
