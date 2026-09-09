import { test, expect } from '@playwright/test';
import { createGame, build, startPractice, takeShot, serialize } from '../src/simulation/game.js';
import { shotPreview } from '../src/simulation/shot-preview.js';
import { center } from '../src/simulation/world.js';

test('preview matches the simulated shot and does not mutate the game', () => {
  const g = createGame();
  build(g, 'tee', 7, 20);
  build(g, 'green', 36, 5);
  startPractice(g);
  for (const technique of ['straight', 'draw', 'fade', 'punch', 'backspin']) {
    const before = serialize(g), target = center(25, 10);
    const preview = shotPreview(g, target, technique);
    expect(serialize(g)).toBe(before);
    const probe = structuredClone(g);
    expect(takeShot(probe, probe.pro, target, technique).ok).toBe(true);
    expect(preview.end).toEqual(probe.pro.shot.end);
    const end = (preview.roll.length ? preview.roll : preview.flight).at(-1);
    expect(end.x).toBeCloseTo(preview.end.x);
    expect(end.z).toBeCloseTo(preview.end.z);
    expect(end.lift).toBeCloseTo(0);
    expect(preview.obstructed).toBe(!!probe.pro.shot.obstruction);
  }
});
