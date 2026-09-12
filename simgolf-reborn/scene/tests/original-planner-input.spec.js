import {test,expect} from '@playwright/test';
import {originalPlannerInput} from '../src/simulation/original-planner-input.js';
function fixture(){return {actorId:0,actors:[new Uint8Array(256),new Uint8Array(256)],holes:[new Uint8Array(520)],metadata:[{}, {rollCoefficient:3}, {rollCoefficient:7}],seed:17};}
const context=()=>({rollCoefficient:0,planning:{rangeInput:{}},state:{}});
test('planner reads current green friction instead of stale caller coefficient',()=>{
 const s=fixture(),q=context(),before=structuredClone(s);s.ballTerrain=2;before.ballTerrain=2;
 expect(originalPlannerInput(s,q).rollCoefficient).toBe(3);
 s.metadata[1].rollCoefficient=4;expect(originalPlannerInput(s,q).rollCoefficient).toBe(4);
 s.metadata[1].rollCoefficient=3;expect(s).toEqual(before);expect(q.rollCoefficient).toBe(0);
});
test('missing metadata retains explicit context while invalid present metadata fails',()=>{
 const s=fixture();delete s.metadata[1].rollCoefficient;
 expect(originalPlannerInput(s,context()).rollCoefficient).toBe(0);
 for(const value of [undefined,-1,9,NaN,1.5]){
  s.metadata[1].rollCoefficient=value;expect(()=>originalPlannerInput(s,context())).toThrow('green roll coefficient');
 }
});
