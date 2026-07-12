import { describe, expect, it } from 'vitest';
import { generateHoleConditions, weatherCarryMultiplier, weatherDescription, weatherDispersionMultiplier, weatherLabel, weatherRollMultiplier } from './weather';

const sequence = (...values: number[]) => {
  let index = 0;
  return () => values[index++] ?? values.at(-1) ?? 0;
};

describe('per-hole weather', () => {
  it('generates bounded, unit-vector wind and theme-weighted conditions', () => {
    const desert = generateHoleConditions('desert', sequence(0.5, 0.5, 0.25, 0.8));
    const links = generateHoleConditions('links', sequence(0.5, 0.5, 0.25, 0.8));
    expect(desert.weather.condition).toBe('clear');
    expect(links.weather.condition).toBe('drizzle');
    expect(Math.hypot(links.wind.dx, links.wind.dy)).toBeCloseTo(1, 10);
    expect(links.wind.speed).toBeGreaterThan(desert.wind.speed);
    expect(links.weather.intensity).toBeGreaterThan(0);
    expect(links.weather.wetness).toBeGreaterThan(0);
  });

  it('makes rain shorten carry, widen misses, and sharply reduce ground release', () => {
    const clear = { condition: 'clear' as const, intensity: 0, wetness: 0 };
    const rain = { condition: 'rain' as const, intensity: 0.9, wetness: 1 };
    expect(weatherCarryMultiplier(rain)).toBeLessThan(weatherCarryMultiplier(clear));
    expect(weatherDispersionMultiplier(rain)).toBeGreaterThan(weatherDispersionMultiplier(clear));
    expect(weatherRollMultiplier(rain)).toBeLessThan(weatherRollMultiplier(clear) * 0.5);
    expect(weatherLabel(rain.condition)).toBe('Steady rain');
    expect(weatherDescription(rain)).toContain('cuts carry');
  });
});
