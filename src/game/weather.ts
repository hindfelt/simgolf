import type { CourseTheme, WeatherCondition, WeatherState } from './types';

export const CLEAR_WEATHER: WeatherState = { condition: 'clear', intensity: 0, wetness: 0 };

const RAIN_THRESHOLDS: Record<CourseTheme, readonly [number, number, number]> = {
  desert: [0.74, 0.93, 0.985],
  parklands: [0.43, 0.69, 0.87],
  links: [0.24, 0.50, 0.79],
  tropical: [0.31, 0.51, 0.70],
};

const WIND_LIMIT: Record<CourseTheme, number> = {
  desert: 0.48,
  parklands: 0.56,
  links: 0.78,
  tropical: 0.62,
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function weatherLabel(condition: WeatherCondition): string {
  return condition === 'clear' ? 'Clear' : condition === 'overcast' ? 'Overcast' : condition === 'drizzle' ? 'Drizzle' : 'Steady rain';
}

export function weatherDescription(weather: WeatherState): string {
  if (weather.condition === 'clear') return 'Firm air and normal ground release.';
  if (weather.condition === 'overcast') return 'Heavy air and slightly softer turf.';
  if (weather.condition === 'drizzle') return 'Carry and rollout are reduced; misses widen slightly.';
  return 'Wet air cuts carry and soaked turf checks the ball quickly.';
}

export function weatherCarryMultiplier(weather: WeatherState): number {
  return 1 - clamp01(weather.wetness) * 0.07;
}

export function weatherRollMultiplier(weather: WeatherState): number {
  return 1 - clamp01(weather.wetness) * 0.55;
}

export function weatherDispersionMultiplier(weather: WeatherState): number {
  return 1 + clamp01(weather.intensity) * 0.18 + clamp01(weather.wetness) * 0.08;
}

export interface HoleConditions {
  weather: WeatherState;
  wind: { dx: number; dy: number; speed: number };
}

/** Theme-weighted, stable conditions generated once at each tee. The injected random
 * source keeps the distribution testable and avoids coupling tests to rand call counts. */
export function generateHoleConditions(theme: CourseTheme, random: () => number = Math.random): HoleConditions {
  const [clearAt, overcastAt, drizzleAt] = RAIN_THRESHOLDS[theme];
  const weatherRoll = clamp01(random());
  const condition: WeatherCondition = weatherRoll < clearAt
    ? 'clear'
    : weatherRoll < overcastAt
      ? 'overcast'
      : weatherRoll < drizzleAt
        ? 'drizzle'
        : 'rain';
  const strength = clamp01(random());
  const weather: WeatherState = condition === 'clear'
    ? { ...CLEAR_WEATHER }
    : condition === 'overcast'
      ? { condition, intensity: 0, wetness: 0.08 + strength * 0.12 }
      : condition === 'drizzle'
        ? { condition, intensity: 0.22 + strength * 0.24, wetness: 0.38 + strength * 0.27 }
        : { condition, intensity: 0.58 + strength * 0.38, wetness: 0.72 + strength * 0.28 };
  const angle = clamp01(random()) * Math.PI * 2;
  const gustBoost = condition === 'rain' ? 0.16 : condition === 'drizzle' ? 0.07 : 0;
  const speed = Math.min(1, clamp01(random()) * WIND_LIMIT[theme] + gustBoost);
  return {
    weather,
    wind: { dx: Math.cos(angle), dy: Math.sin(angle), speed },
  };
}
