import { test, expect } from '@playwright/test';
import { createGame, build, startPractice, takeShot, update, serialize, restore } from '../src/simulation/game.js';
import { treeCollision } from '../src/simulation/trees.js';
import { sceneryTrees } from '../src/simulation/scenery-trees.js';
import { demolish } from '../src/simulation/course-edit.js';
import { exportCourse, coursePractice } from '../src/simulation/course-package.js';
const shot = {from:{x:-21,z:-31},landing:{x:-1,z:-31},apex:5,curve:0,putt:false};
test('natural trees obstruct flight until removed, including saved and shared courses', async () => {
  const g=createGame();
  expect(treeCollision(g,shot)).not.toBeNull();
  expect(treeCollision(g,{...shot,apex:16})).toBeNull();
  expect(treeCollision(g,{...shot,curve:7})).toBeNull();
  const tree=sceneryTrees().find(t=>t.x===-11 && t.z===-31);
  build(g,'tee',7,20);build(g,'green',22,10);
  expect(treeCollision(coursePractice(await exportCourse(g)),shot)).not.toBeNull();
  expect(demolish(g,tree.c,tree.r).ok).toBe(true);
  expect(treeCollision(g,shot)).toBeNull();
  expect(treeCollision(restore(serialize(g)),shot)).toBeNull();
  expect(treeCollision(coursePractice(await exportCourse(g)),shot)).toBeNull();
});
test('flight collisions follow raised and lowered natural trees', () => {
  const g=createGame();
  const tree=sceneryTrees().find(t=>t.x===-11 && t.z===-31);
  const high={...shot,apex:tree.height*1.3+1};
  expect(treeCollision(g,high)).toBeNull();
  for(let i=0;i<12;i++) expect(build(g,'raise',tree.c,tree.r).ok).toBe(true);
  expect(treeCollision(g,high)).not.toBeNull();
  for(let i=0;i<12;i++) expect(build(g,'lower',tree.c,tree.r).ok).toBe(true);
  expect(treeCollision(g,high)).toBeNull();
});
test('actual natural-tree strike drops the ball and resumes identically mid-flight', () => {
  const g=createGame();build(g,'tee',7,20);build(g,'green',22,10);startPractice(g);
  g.pro.ball={...shot.from};g.pro.pos={...shot.from};
  expect(takeShot(g,g.pro,shot.landing).ok).toBe(true);
  const hit=g.pro.shot.obstruction;expect(hit).toBeTruthy();
  for(let i=0;i<8;i++)update(g,.05);
  const copy=restore(serialize(g));
  for(let i=0;i<100;i++){update(g,.05);update(copy,.05);}
  expect(serialize(copy)).toBe(serialize(g));
  expect(g.pro.ball.x).toBeCloseTo(hit.point.x);
  expect(g.pro.ball.z).toBeCloseTo(hit.point.z);
  expect(g.pro.ballHeight).toBe(0);
});
