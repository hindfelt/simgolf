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

test('targeting, cup and scenery origins follow their distinct current records',()=>{
 const s=fixture(),a=new DataView(s.actors[0].buffer),h=new DataView(s.holes[0].buffer);
 a.setInt32(8,21000,true);a.setInt32(12,26000,true);a.setInt32(0xdc,22000,true);a.setInt32(0xe0,27000,true);
 h.setInt32(0x18,25,true);h.setInt32(0x1c,30,true);
 const q={...context(),position:{x:-1,z:-1}};q.planning.cup={x:-1,z:-1};
 const r=originalPlannerInput(s,q);
 expect(r.position).toEqual({x:21000,z:26000});expect(r.planning).toMatchObject({x:22000,z:27000,cup:{x:25,z:30}});
 h.setInt32(0x18,26,true);expect(originalPlannerInput(s,q).planning.cup.x).toBe(26);
 expect(q.position).toEqual({x:-1,z:-1});expect(q.planning.cup).toEqual({x:-1,z:-1});
});
