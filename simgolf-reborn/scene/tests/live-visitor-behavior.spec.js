import {test,expect} from '@playwright/test';
import {createPlaytestCourse} from '../src/simulation/playtest-course.js';
import {createGame,build,update,restore,serialize} from '../src/simulation/game.js';
import {liveOriginalRoute} from '../src/simulation/live-original-routing.js';
import {liveFacilityArrival,nearestLiveFacility} from '../src/simulation/live-original-facilities.js';
import {happinessReaction} from '../src/simulation/happiness.js';
import {center} from '../src/simulation/world.js';

test('recovered walking costs route around water without cutting blocked corners',()=>{
 const route=liveOriginalRoute({width:5,height:5,start:{c:0,r:2},end:{c:4,r:2},from:{x:0,z:2},to:{x:4,z:2},
 surfaceAt:(x,z)=>x===2&&z!==4?'water':'rough',walkingCost:()=>3,heightAt:()=>0,center:(x,z)=>({x,z})});
 expect(route).not.toBeNull();expect(route.some(p=>p.x===2&&p.z===4)).toBe(true);
 let prev={x:0,z:2};for(const p of route){expect(!(p.x===2&&p.z!==4)).toBe(true);expect(Math.abs(p.x-prev.x)).toBeLessThanOrEqual(1);prev=p;}
});
test('native facility income and nearest selection are applied to live records',()=>{
 const g=createGame(),v={};
 for(const [type,fee] of [['snack',5],['ballwasher',0],['putting-green',4],['pro-shop',6],['driving-range',8]]){
  const result=liveFacilityArrival(g,v,{type});expect(result.income).toBe(fee);expect(result.remarks).toHaveLength(1);
 }
 const far={id:1,type:'snack',c:30,r:30},near={id:2,type:'snack',c:8,r:12};
 expect(nearestLiveFacility([far,near],center(7,12))).toEqual(near);
});
test('native reaction history survives reload, deduplicates incidents and rejects corruption',()=>{
 const g=createPlaytestCourse();for(let i=0;!g.guests.length&&i<2000;i++)update(g,.05);
 const v=g.guests[0];expect(v).toBeTruthy();
 happinessReaction(v,'great-shot:verification',1,g);
 expect(v.nativeReactions.actor[0x70]).toBe(1);
 const before=serialize(g);expect(happinessReaction(v,'great-shot:verification',1,g)).toBe(false);expect(serialize(g)).toBe(before);
 expect(serialize(restore(before))).toBe(before);
 v.nativeReactions.actor[1]=300;expect(()=>restore(serialize(g))).toThrow();
});
test('a live two-hole round serves visitors, resumes during service and settles once',()=>{
 const g=createPlaytestCourse();expect(build(g,'snack',9,13).ok).toBe(true);
 for(let r=11;r<=13;r++)expect(build(g,'path',7,r).ok).toBe(true);
 let visitor;
 for(let i=0;i<30000;i++){update(g,.05);visitor=g.guests.find(v=>v.phase==='service'&&v.serviceId===g.facilities.find(f=>f.type==='snack').id);if(visitor)break;}
 expect(visitor).toBeTruthy();const id=visitor.roundId,copy=restore(serialize(g)),served=g.stats.services;
 for(let i=0;i<6000;i++){update(g,.05);update(copy,.05);}
 expect(serialize(copy)).toBe(serialize(g));expect(g.stats.services).toBeGreaterThan(served);
 expect(g.ledger.some(e=>e.reason==='Snack bar sale'&&e.amount===5)).toBe(true);
 expect(g.rounds.filter(r=>r.id===id)).toHaveLength(1);
 expect(g.rounds.find(r=>r.id===id).scorecard.map(s=>s.holeId)).toEqual(['hole-1','hole-2']);
});
test('a newly flooded waypoint is replanned before the golfer walks into it',()=>{
 const g=createPlaytestCourse();while(!g.guests.length)update(g,.05);
 const v=g.guests[0];v.pos=center(10,10);v.phase='walking';v.afterWalk='queue';v.wait=0;
 v.path=[center(11,10),center(12,10)];g.tiles[10*45+11]={type:'water'};
 for(let i=0;i<24;i++){update(g,.05);expect(Math.hypot(v.pos.x-center(11,10).x,v.pos.z-center(11,10).z)).toBeGreaterThan(.8);}
 expect(v.path.some(p=>p.x===center(11,10).x&&p.z===center(11,10).z)).toBe(false);
});
test('legacy saves retain their visitor rules and unsupported versions reject',()=>{
 const g=createGame();delete g.liveBehaviorVersion;
 expect(restore(serialize(g)).liveBehaviorVersion).toBeUndefined();
 g.liveBehaviorVersion=9;expect(()=>restore(serialize(g))).toThrow(/behavior version/);
});
