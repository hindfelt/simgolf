import { test, expect } from '@playwright/test';
import { createGame, build, startPractice, takeShot, serialize, update } from '../src/simulation/game.js';
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

test('native putting preview follows the actual rolling ball without spending RNG or cache entries',()=>{
  const g=createGame();build(g,'tee',7,20);build(g,'green',22,10);startPractice(g);
  const cup=g.holes[0].green;
  g.pro.ball={x:cup.x-1,z:cup.z};g.pro.pos={...g.pro.ball};g.rng=1234;
  const before=serialize(g),preview=shotPreview(g,cup);
  expect(serialize(g)).toBe(before);
  expect(preview.flight).toEqual([]);
  expect(preview.roll.length).toBeGreaterThan(2);
  expect(preview.roll.every(p=>p.lift===0)).toBe(true);
  takeShot(g,g.pro,cup);expect(g.pro.shot.nativePutt).toBeDefined();
  for(let i=1;i<preview.roll.length;i++){
    update(g,.05);
    expect(g.pro.ball.x).toBeCloseTo(preview.roll[i].x,8);
    expect(g.pro.ball.z).toBeCloseTo(preview.roll[i].z,8);
  }
  expect(g.pro.shot).toBeNull();expect(g.pro.ball).toEqual(preview.end);
});
