import { test, expect } from "@playwright/test";
import { sampleShot } from "../src/shot.js";

test("landing and bounce transitions preserve position and never go below the turf", () => {
  for (const impact of [4.3, 4.95, 5.35, 8.15]) {
    const before = sampleShot(impact - 0.00001),
      after = sampleShot(impact + 0.00001);
    expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeLessThan(
      0.001,
    );
    expect(Math.abs(after.lift - before.lift)).toBeLessThan(0.001);
    expect(sampleShot(impact).lift).toBeCloseTo(0, 6);
  }
  for (let time = 0; time < 14; time += 0.01)
    expect(sampleShot(time).lift).toBeGreaterThanOrEqual(0);
});

test("the grounded ball moves forward, slows down and stays at rest", () => {
  const samples = [5.4, 6.0, 6.6, 7.2, 7.8].map(sampleShot);
  const distances = samples
    .slice(1)
    .map((p, i) => Math.hypot(p.x - samples[i].x, p.z - samples[i].z));
  for (let i = 0; i < distances.length; i++) {
    expect(distances[i]).toBeGreaterThan(0);
    if (i) expect(distances[i]).toBeLessThan(distances[i - 1]);
  }
  expect(samples.every((p) => p.lift === 0)).toBe(true);
  expect(sampleShot(8.5)).toEqual(sampleShot(13.9));
});
