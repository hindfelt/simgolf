import { test, expect } from '@playwright/test';
import { createGame, build, startPractice, takeShot, update, serialize, restore, lie, route } from '../src/simulation/game.js';
import { groundRoll } from '../src/simulation/ground-roll.js';
import { treeGroundBlocker } from '../src/simulation/trees.js';
import { demolish } from '../src/simulation/course-edit.js';
import { sceneryTrees } from '../src/simulation/scenery-trees.js';
import { exportCourse, coursePractice } from '../src/simulation/course-package.js';
import { createSession } from '../src/simulation/session.js';
import { PROTOCOL_VERSION } from '../src/simulation/protocol.js';
const a={x:-15,z:-31},b={x:-7,z:-31};
const roll=(g,from=a,to=b,surface=()=> 'firm') => groundRoll(from,to,surface,treeGroundBlocker(g,from,to));

test('natural trunks stop forward and reverse roll before water; clearing persists in shared courses',async()=>{
 const g=createGame();build(g,'tee',7,20);build(g,'green',22,10);
 const hit=roll(g);expect(hit.end.x).toBeGreaterThan(-11.3);expect(hit.end.x).toBeLessThan(-11.23);
 expect(roll(g,b,a).end.x).toBeGreaterThan(-10.77);
 expect(roll(g,a,b,p=>p.x>-10?'water':'firm').water).toBe(false);
 expect(roll(coursePractice(await exportCourse(g)))).toEqual(hit);
 const tree=sceneryTrees().find(t=>t.x===-11&&t.z===-31);
 expect(demolish(g,tree.c,tree.r).ok).toBe(true);
 expect(roll(g).end.x).toBeCloseTo(b.x);
 expect(roll(restore(serialize(g))).end.x).toBeCloseTo(b.x);
 expect(roll(coursePractice(await exportCourse(g))).end.x).toBeCloseTo(b.x);
});
test('segment checks catch crossings without blocking near misses, short rolls or escape from a trunk',()=>{
 const g=createGame();const blocker=treeGroundBlocker(g,a,b);
 expect(blocker({x:-12,z:-31},{x:-10,z:-31})).toBe(true);
 expect(roll(g,{x:-15,z:-30.7},{x:-7,z:-30.7}).end.x).toBeCloseTo(-7);
 expect(roll(g,a,{x:-11.5,z:-31}).end.x).toBeCloseTo(-11.5);
 expect(roll(g,{x:-11,z:-31},b).end.x).toBeCloseTo(-7);
 expect(roll(g,a,a).end).toEqual(a);
 expect(blocker({x:-11.1,z:-31},{x:-10,z:-31})).toBe(true);
 expect(blocker({x:-11.1,z:-31},{x:-12,z:-31})).toBe(false);
});
test('faster turf can extend roll into a trunk beyond the proposed endpoint',()=>{
 const g=createGame(),proposed={x:-12,z:-31},surface=p=>p.x<-14.5?'rough':'firm';
 expect(groundRoll(a,proposed,surface).end.x).toBeGreaterThan(-11);
 expect(roll(g,a,proposed,surface).end.x).toBeLessThan(-11.23);
});
test('an actual putt stops at a planted trunk and resumes with identical ball position and strokes',()=>{
 const g=createGame();build(g,'tee',7,20);build(g,'green',22,10);
 for(const[c,r]of[[19,9],[18,9],[17,9],[17,10]])expect(build(g,'green',c,r).ok).toBe(true);
 expect(build(g,'tree',18,10).ok).toBe(true);startPractice(g);
 g.pro.ball={x:-9,z:-13};g.pro.pos={...g.pro.ball};g.rng=1234;
 expect(takeShot(g,g.pro,g.holes[0].green).ok).toBe(true);
 const shot=g.pro.shot;expect(shot.putt).toBe(true);
 expect(shot.end.x).toBeLessThan(groundRoll(shot.from,shot.landing,p=>lie(g,p)).end.x-.3);
 for(let i=0;i<8;i++)update(g,.05);const copy=restore(serialize(g));
 for(let i=0;i<40;i++){update(g,.05);update(copy,.05);}
 expect(serialize(copy)).toBe(serialize(g));expect(g.pro.ball).toEqual(shot.end);
 expect(g.pro.ballHeight).toBe(0);expect(g.pro.strokes).toBe(1);
});
test('previous scenery-collision saves migrate while preserving course and money',()=>{
 const g=createGame();createSession(g);g.protocol.version=69;g.protocol.ruleset='prototype-scenery-collisions-2026-09-09';
 const copy=restore(serialize(g));expect(copy.protocol.version).toBe(PROTOCOL_VERSION);
 expect(copy.tiles).toEqual(g.tiles);expect(copy.cash).toBe(g.cash);
});

test('golfers approach and leave balls beside trunks without walking through the trunk',()=>{
 const g=createGame();expect(build(g,'tree',18,10).ok).toBe(true);
 const from={x:-6.5,z:-13},to={x:-7.5,z:-13};
 for(const [a,b] of [[from,to],[to,from]]){
   const path=route(g,a,b);expect(path).not.toBeNull();
   let previous=a;
   for(const next of path){
     expect(treeGroundBlocker(g,previous,next)(previous,next)).toBe(false);
     previous=next;
   }
   expect(previous).toEqual(b);
 }
 expect(route(g,from,{x:-7,z:-13})).toBeNull();
});
