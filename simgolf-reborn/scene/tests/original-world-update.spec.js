import {test,expect} from '@playwright/test';
import {originalWorldUpdate} from '../src/simulation/original-world-update.js';
const snapshot=()=>({phaseCounter:31,globalFlags:0,updateScratch:123,modeByte:0,modeCounter:0,seed:17});
test('world calls share the pre-increment phase and pass successive state onward',()=>{
 const seen=[];
 const run=q=>originalWorldUpdate(q,(address,state)=>{
  seen.push({address,phase:state.phaseCounter,seed:state.seed});
  return {...state,seed:state.seed+1};
 });
 const q=snapshot(),result=run(q);
 expect(result.calls).toEqual([0x428100,0x4029e0,0x409980,0x46df40]);
 expect(seen.map(s=>s.phase)).toEqual([31,31,31,31]);
 expect(seen.map(s=>s.seed)).toEqual([17,18,19,20]);
 expect(result.state).toEqual({...q,phaseCounter:32,seed:21,updateScratch:0});
 expect(run(JSON.parse(JSON.stringify(q)))).toEqual(result);
 expect(q).toEqual(snapshot());
});
test('pause clears scratch but does not call actors or advance time',()=>{
 const q={...snapshot(),globalFlags:4};
 expect(originalWorldUpdate(q)).toEqual({state:{...q,updateScratch:0},calls:[],skipped:true});
});
test('conditional work and fast phase use values after preceding world callbacks',()=>{
 const result=originalWorldUpdate({...snapshot(),modeByte:1},(address,state)=>({
  ...state,...(address===0x409980?{modeByte:0,modeCounter:0}:{}),
  ...(address===0x46df40?{phaseCounter:0xfffffffe,globalFlags:8}:{})
 }));
 expect(result.calls).toHaveLength(4);expect(result.state.phaseCounter).toBe(0);
 expect(originalWorldUpdate({...snapshot(),modeCounter:1},(_,s)=>s).calls).toHaveLength(3);
});
test('missing, asynchronous and invalid callbacks cannot publish a partial snapshot',()=>{
 const q=snapshot();
 expect(()=>originalWorldUpdate(q)).toThrow(/explicit resolver/);
 expect(()=>originalWorldUpdate(q,async(_,s)=>s)).toThrow(/synchronous/);
 expect(()=>originalWorldUpdate(q,(_,s)=>{s.seed=-1;return s;})).toThrow(/snapshot/);
 expect(q).toEqual(snapshot());
});
