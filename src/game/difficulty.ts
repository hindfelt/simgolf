import type { Difficulty } from './types';

export interface DifficultyDefinition {
  id: Difficulty;
  label: string;
  volatility: number;
  description: string;
}

/** Manual p.5: higher difficulty makes annoyances that golfers normally tolerate
 * increasingly irritating. Positive reactions are deliberately left unchanged. */
export const DIFFICULTIES: readonly DifficultyDefinition[] = [
  { id: 'easy', label: 'Easy', volatility: 0.7, description: 'Golfers forgive small inconveniences and rough edges.' },
  { id: 'moderate', label: 'Moderate', volatility: 1, description: 'The original balanced resort-management challenge.' },
  { id: 'difficult', label: 'Difficult', volatility: 1.35, description: 'Poor lies, prices and unmet needs irritate golfers quickly.' },
  { id: 'impossible', label: 'Impossible', volatility: 1.75, description: 'Every flaw matters. Great routing and service are essential.' },
] as const;

export function isDifficulty(value: unknown): value is Difficulty {
  return DIFFICULTIES.some((definition) => definition.id === value);
}

export function difficultyDefinition(difficulty: Difficulty): DifficultyDefinition {
  return DIFFICULTIES.find((definition) => definition.id === difficulty) ?? DIFFICULTIES[1];
}

/** Scale only negative attitude changes, matching the manual's wording that issues
 * become more irritating rather than making praise more generous. */
export function attitudeDelta(delta: number, difficulty: Difficulty): number {
  return delta < 0 ? delta * difficultyDefinition(difficulty).volatility : delta;
}
