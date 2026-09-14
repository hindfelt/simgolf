import {test,expect} from '@playwright/test';
import {originalConditionUpdate} from '../src/simulation/original-condition-update.js';
function fresh(){const b=new Uint8Array(256),a=new DataView(b.buffer);a.setInt32(8,20480,true);a.setInt32(12,25600,true);b[0x29]=3;b[0x2b]=1;a.setInt16(0xae,15,true);a.setInt16(0xb0,15,true);
 return {actorId:0,actors:[b],phaseCounter:0,seed:17,environmentByte:0,conditionRange:20,terrain:new Uint8Array(2500).fill(1),metadata:[{}, {shape:1,kind:7},{shape:7,kind:1}]};}
test('ordinary terrain increments the ordinary condition counter using shape rather than kind',()=>{
 const q=fresh(),r=originalConditionUpdate(q,(_,state)=>({state}));
 expect(r.calls).toEqual([{address:0x4672d0,args:[0,14,20]}]);expect(r.randomDraws).toBe(0);
 expect(new DataView(r.state.actors[0].buffer).getInt16(0xb0,true)).toBe(16);
 expect(new DataView(q.actors[0].buffer).getInt16(0xb0,true)).toBe(15);
});
test('a special neighboring tile selects the alternate counter and consumes its draw',()=>{
 const q=fresh();q.terrain[21*50+26]=2;
 const r=originalConditionUpdate(q,(_,state)=>({state}));expect(r.randomDraws).toBe(1);
 expect(new DataView(r.state.actors[0].buffer).getInt16(0xb0,true)).toBe(15);
 expect(r.calls.every(e=>e.args[1]===15)).toBe(true);
});
test('nonzero signed modifier uses 120-phase cadence; excluded holes do no work',()=>{
 const q=fresh();new DataView(q.actors[0].buffer).setInt16(0x1c,-1,true);q.phaseCounter=120;
 expect(originalConditionUpdate(q,(_,state)=>({state})).calls).toHaveLength(1);
 q.actors[0][0x29]=19;expect(originalConditionUpdate(q).randomDraws).toBe(0);
 q.actors[0][0x29]=3;expect(()=>originalConditionUpdate(q)).toThrow(/explicit resolver/);
});
