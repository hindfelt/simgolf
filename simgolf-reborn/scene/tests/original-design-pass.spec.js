import {test,expect} from '@playwright/test';
import {originalDesignPass} from '../src/simulation/original-design-pass.js';
const fixed=(x,z)=>({x:x*1024+512,z:z*1024+512});
function run(points,terrainAt=p=>({code:p.x===20?1:0,shotClass:1})) {
 const calls=[];
 const result=originalDesignPass({tee:{x:10,z:10},green:{x:20,z:10},teeHeight:5,greenHeight:5,
 planShot:q=>{calls.push(q);return q.skillMask===3?fixed(15,15):points[q.shot];},terrainAt});
 return {result,calls};
}
test('first landing pass is separate; full-skill segments use snapped tile centres',()=>{
 const {result,calls}=run([{x:15*1024+12,z:10*1024+900},fixed(20,10)]);
 expect(calls.map(q=>[q.actorId,q.skillMask,q.shot])).toEqual([[154,3,0],[154,7,0],[154,7,1]]);
 expect(calls[2].from).toEqual(fixed(15,10));
 expect(result.firstLanding).toEqual({x:15,z:15});expect(result.stop).toBe('cup');
 expect(result.routeMeasure).toBe(250);expect(result.length).toBe(62);expect(result.suggestedPar).toBe(4);
});
test('unplayable landing stops before counting its segment',()=>{
 const {result,calls}=run([fixed(15,10)],()=>({code:20,shotClass:2}));
 expect(calls).toHaveLength(2);expect(result.segments).toEqual([]);expect(result.routeMeasure).toBe(0);
 expect(result.length).toBe(0);expect(result.stop).toBe('unplayable');
});
test('five-shot cap and first-green suggested par do not invent reaching the cup',()=>{
 const {result,calls}=run([fixed(11,10),fixed(12,10),fixed(13,10),fixed(14,10),fixed(15,10)],p=>({code:p.x===12?1:0,shotClass:1}));
 expect(calls).toHaveLength(6);expect(result.stop).toBe('shot-limit');expect(result.reachedCup).toBe(false);
 expect(result.suggestedPar).toBe(4);expect(result.length).toBe(0);expect(result.routeMeasure).toBe(125);
});
test('cached redraw consumes recorded tiles without invoking the planner',()=>{
 const {result}=run([fixed(15,10),fixed(20,10)]);
 const cache=structuredClone(result.landings);
 const replay=originalDesignPass({tee:{x:10,z:10},green:{x:20,z:10},teeHeight:5,greenHeight:5,
 landingCache:cache,planShot:()=>{throw Error('Redraw must not plan new shots');},
 terrainAt:p=>({code:p.x===20?1:0,shotClass:1})});
 expect(replay).toEqual(result);
 replay.landings[0].x=0;
 expect(cache).toEqual(result.landings);
});
test('cached redraw rejects an exhausted cache rather than inventing a landing',()=>{
 expect(()=>originalDesignPass({tee:{x:10,z:10},green:{x:20,z:10},teeHeight:5,greenHeight:5,
 landingCache:[{x:15,z:15},{x:11,z:10}],terrainAt:()=>({code:0,shotClass:1})})).toThrow('cache is incomplete');
});
test('the fifth shot can still reach the cup and produce length',()=>{
 const {result}=run([fixed(12,10),fixed(14,10),fixed(16,10),fixed(18,10),fixed(20,10)]);
 expect(result.reachedCup).toBe(true);expect(result.length).toBe(62);
 expect(result.suggestedPar).toBe(7);expect(result.segments).toHaveLength(5);
});
test('final coordinate check runs even when cup tile has unplayable terrain',()=>{
 const {result}=run([fixed(15,10),fixed(20,10)],p=>({code:0,shotClass:p.x===20?2:1}));
 expect(result.stop).toBe('unplayable');expect(result.reachedCup).toBe(true);
 expect(result.segments).toHaveLength(1);expect(result.length).toBe(31);
});
