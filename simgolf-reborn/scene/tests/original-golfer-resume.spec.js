import {test,expect} from '@playwright/test';
import {resumeOriginalGolferLoop,originalGolferLoop} from '../src/simulation/original-golfer-loop.js';
import {originalShotPreparation} from '../src/simulation/original-shot-preparation.js';
import {originalRandom} from '../src/simulation/original-rng.js';
function pending(){
 const actors=Array.from({length:152},()=>new Uint8Array(256)),b=actors[2],a=new DataView(b.buffer);
 b[0x29]=1;a.setUint32(0x18,0x200,true);a.setInt16(0xaa,3,true);actors[3][0x20]=32;
 a.setInt32(0xdc,30000,true);a.setInt32(0xe0,36000,true);a.setInt32(0x10,-1,true);a.setInt32(8,20000,true);a.setInt32(12,25000,true);
 actors[0][0x29]=255;actors[0][0x8c]=10;actors[151][0x29]=255;actors[151][0x8c]=10;
 const state={actors,actorId:2,ballTerrain:2,holeTargets:[null,{x:25,z:35}],globalFlags:0,seed:17};
 const prepared=originalShotPreparation(state);
 expect(prepared.next).toBe('0x42b647');
 return {...prepared,completed:false,randomDraws:7,calls:[{address:123,args:[]}]};
}
test('actual aiming continuation resumes without replaying earlier waiting golfers',()=>{
 const suspended=pending(),before=structuredClone(suspended),rng=originalRandom(suspended.state.seed);rng.next(2);
 const result=resumeOriginalGolferLoop(suspended,turn=>originalShotPreparation(turn.state,undefined,'0x42b6f8'));
 expect(result.completed).toBe(true);expect(result.state.selectionMode).toBe(3);expect(result.state.selectedActor).toBe(2);
 expect(result.state.actors[0]).toEqual(before.state.actors[0]);expect(result.state.seed).toBe(rng.state);
 expect(result.randomDraws).toBe(8);expect(result.calls).toEqual(before.calls);expect(suspended).toEqual(before);
});
test('a continuation may remain suspended and its new effects append only once',()=>{
 const first=pending();
 const second=resumeOriginalGolferLoop(first,turn=>({state:turn.state,next:'0x42b647',calls:[{address:456,args:[]}],randomDraws:2}));
 expect(second.completed).toBe(false);expect(second.randomDraws).toBe(9);expect(second.calls.map(e=>e.address)).toEqual([123,456]);
 const final=resumeOriginalGolferLoop(second,turn=>originalShotPreparation(turn.state,undefined,'0x42b6f8'));
 expect(final.calls.map(e=>e.address)).toEqual([123,456]);expect(final.randomDraws).toBe(10);
});
test('async or wrong-actor resumptions reject without mutating the suspended state',()=>{
 const first=pending(),before=structuredClone(first);
 expect(()=>resumeOriginalGolferLoop(first,async turn=>turn)).toThrow('synchronous');
 expect(()=>resumeOriginalGolferLoop(first,turn=>{turn.state.actorId=3;return turn;})).toThrow('synchronous');
 expect(()=>resumeOriginalGolferLoop({...first,completed:true},turn=>turn)).toThrow('continuation');
 expect(first).toEqual(before);
});
test('resumed terrain pass retains pending audio and captures new effects in order',async()=>{
 const {resumeOriginalGolferTerrainLoop}=await import('../src/simulation/original-golfer-terrain-loop.js');
 const suspended={...pending(),soundEvents:[{address:0x447a30,args:[3]}]},before=structuredClone(suspended);
 const result=resumeOriginalGolferTerrainLoop(suspended,(turn,dispatch)=>{
  const reply=dispatch({address:123,args:[]},turn.state);
  return originalShotPreparation(reply.state,undefined,'0x42b6f8');
 },(_,state)=>({state,soundEvents:[{address:0x447a30,args:[4]}]}));
 expect(result.completed).toBe(true);expect(result.soundEvents.map(e=>e.args[0])).toEqual([3,4]);
 result.soundEvents[0].args[0]=99;expect(suspended).toEqual(before);
});
test('native tutorial effects precede aiming and remain in the resumed presentation batch',async()=>{
 const {resumeOriginalGolferTerrainLoop}=await import('../src/simulation/original-golfer-terrain-loop.js');
 const {resumeOriginalAimingTurn}=await import('../src/simulation/original-aiming-tutorial.js');
 const suspended={...pending(),soundEvents:[]},messages=[];
 const result=resumeOriginalGolferTerrainLoop(suspended,resumeOriginalAimingTurn,(event,state)=>{
  if(event.address===0x466fb0)state.sourceText='Player'+event.args[0];
  if(event.address===0x45e9c0)messages.push(state.sourceText);
  return {state,...(event.address===0x447a30?{soundEvents:[event]}:{})};
 });
 expect(result.completed).toBe(true);expect(result.state.selectionMode).toBe(3);
 expect(messages).toEqual(['Player3 vs...','Player2']);
 expect(result.soundEvents).toEqual([{address:0x447a30,args:[42,100,0,0,0]}]);
 expect(result.calls.map(e=>e.address)).toEqual([123,0x447a30,0x466fb0,0x45e9c0,0x466fb0,0x45e9c0,0x4803e0,0x45b990]);
 expect(suspended.state.selectionMode).toBeUndefined();
});
test('world resumption preserves planner scratch and publishes audio only after all systems finish',async()=>{
 const {resumeOriginalWorldGolferUpdate}=await import('../src/simulation/original-world-golfer-update.js');
 const continuation={...pending(),soundEvents:[{address:0x447a30,args:[3]}]};
 Object.assign(continuation.state,{phaseCounter:30,globalFlags:8,modeByte:0,modeCounter:0,updateScratch:1});
 const suspended={completed:false,continuation},before=structuredClone(suspended),seen=[];
 const result=resumeOriginalWorldGolferUpdate(suspended,{
  resumeTurn:turn=>originalShotPreparation(turn.state,undefined,'0x42b6f8'),
  resolveWorld:(address,state)=>{seen.push([address,state.updateScratch,state.phaseCounter]);return {state,soundEvents:[{address:0x447a30,args:[4]}]};},
 });
 expect(result.completed).toBe(true);expect(result.state.phaseCounter).toBe(32);expect(result.state.updateScratch).toBe(1);
 expect(seen).toEqual([0x4029e0,0x409980,0x46df40].map(a=>[a,1,30]));
 expect(result.soundEvents.map(e=>e.args[0])).toEqual([3,4,4,4]);expect(suspended).toEqual(before);
 const unresolved=resumeOriginalWorldGolferUpdate(suspended,{resumeTurn:turn=>({state:turn.state,next:turn.next,calls:[]})});
 expect(unresolved.completed).toBe(false);expect(unresolved.state).toBeUndefined();expect(unresolved.soundEvents).toEqual([]);
 expect(unresolved.continuation.soundEvents).toEqual(continuation.soundEvents);
 expect(()=>resumeOriginalWorldGolferUpdate(suspended,{resumeTurn:turn=>originalShotPreparation(turn.state,undefined,'0x42b6f8'),resolveWorld:()=>{throw Error('failed');}})).toThrow('failed');
 expect(suspended).toEqual(before);
});
