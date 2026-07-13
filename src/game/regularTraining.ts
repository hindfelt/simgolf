import type { Building, Regular, RegularSkill, RegularTraining } from './types';
import { facilityLevel, facilityOperational } from './buildings';
import { clamp } from './rng';

export const REGULAR_TRAINING_THRESHOLD = 100;
export const REGULAR_SKILLS: readonly RegularSkill[] = ['length', 'accuracy', 'imagination'];

export const REGULAR_SKILL_FACILITY: Record<RegularSkill, { kind: Building['kind']; name: string; mark: string }> = {
  length: { kind: 'drivingrange', name: 'Driving Range', mark: 'D' },
  accuracy: { kind: 'proshop', name: 'Pro Shop', mark: 'A' },
  imagination: { kind: 'puttinggreen', name: 'Putting Green', mark: 'I' },
};

export interface RegularTrainingRates extends Record<RegularSkill, number> {
  facilities: Partial<Record<RegularSkill, string[]>>;
}

export interface RegularTrainingGain {
  skill: RegularSkill;
  earned: number;
  levels: number;
  progress: number;
  value: number;
}

export interface RegularTrainingResult {
  holes: number;
  gains: RegularTrainingGain[];
}

const emptySkillRecord = (): Record<RegularSkill, number> => ({ length: 0, accuracy: 0, imagination: 0 });

export function createRegularTraining(): RegularTraining {
  return { progress: emptySkillRecord(), gained: emptySkillRecord(), holes: 0 };
}

export function sanitizeRegularTraining(value: unknown): RegularTraining {
  const fallback = createRegularTraining();
  if (!value || typeof value !== 'object') return fallback;
  const raw = value as Partial<RegularTraining>;
  for (const skill of REGULAR_SKILLS) {
    const progress = Number(raw.progress?.[skill]);
    const gained = Number(raw.gained?.[skill]);
    fallback.progress[skill] = Number.isFinite(progress) ? clamp(Math.trunc(progress), 0, REGULAR_TRAINING_THRESHOLD - 1) : 0;
    fallback.gained[skill] = Number.isFinite(gained) ? clamp(Math.trunc(gained), 0, 100) : 0;
  }
  fallback.holes = Number.isFinite(Number(raw.holes)) ? Math.max(0, Math.trunc(Number(raw.holes))) : 0;
  return fallback;
}

/**
 * Level-I facilities award 18 practice per completed hole. Service upgrades
 * emphasize learning, Prestige upgrades retain a smaller coaching benefit, and
 * multiple academies stack up to a deliberate anti-spam cap.
 */
export function regularTrainingRates(buildings: readonly Building[]): RegularTrainingRates {
  const rates: RegularTrainingRates = { ...emptySkillRecord(), facilities: {} };
  for (const skill of REGULAR_SKILLS) {
    const definition = REGULAR_SKILL_FACILITY[skill];
    const matching = buildings.filter((building) => building.kind === definition.kind && facilityOperational(building));
    for (const building of matching) {
      const steps = facilityLevel(building) - 1;
      const multiplier = 1 + steps * (building.branch === 'service' ? 0.45 : 0.22);
      rates[skill] += Math.round(18 * multiplier);
    }
    rates[skill] = clamp(rates[skill], 0, 45);
    if (matching.length) rates.facilities[skill] = matching.map((building) => facilityLevel(building) > 1 ? `${definition.name} Lv.${facilityLevel(building)}` : definition.name);
  }
  return rates;
}

/** Apply one completed-hole training session and retain sub-level progress. */
export function applyRegularTraining(regular: Regular, rates: RegularTrainingRates, completion = 1): RegularTrainingResult {
  const training = sanitizeRegularTraining(regular.training);
  const active = REGULAR_SKILLS.some((skill) => rates[skill] > 0);
  if (active) training.holes++;
  const gains: RegularTrainingGain[] = [];

  for (const skill of REGULAR_SKILLS) {
    const earned = Math.max(0, Math.round(rates[skill] * clamp(completion, 0, 1)));
    const current = clamp(Number(regular[skill]) || 0.2, 0.2, 1);
    if (!earned || current >= 1) {
      if (current >= 1) training.progress[skill] = 0;
      regular[skill] = current;
      continue;
    }
    const total = training.progress[skill] + earned;
    const possibleLevels = Math.floor(total / REGULAR_TRAINING_THRESHOLD);
    const levelsToMastery = Math.max(0, Math.ceil((1 - current) * 100 - 1e-9));
    const levels = Math.min(possibleLevels, levelsToMastery);
    const value = clamp(Math.round((current + levels / 100) * 1000) / 1000, 0.2, 1);
    regular[skill] = value;
    training.gained[skill] += levels;
    training.progress[skill] = value >= 1 ? 0 : total - levels * REGULAR_TRAINING_THRESHOLD;
    gains.push({ skill, earned, levels, progress: training.progress[skill], value });
  }

  regular.training = training;
  gains.sort((a, b) => b.levels - a.levels || b.earned - a.earned || a.skill.localeCompare(b.skill));
  return { holes: training.holes, gains };
}
