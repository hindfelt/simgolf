import {test,expect} from '@playwright/test';
import {originalWorldGolferUpdate} from '../src/simulation/original-world-golfer-update.js';
import {originalGolferTerrainLoop} from '../src/simulation/original-golfer-terrain-loop.js';
const fresh=()=>({seed:17,phaseCounter:30,globalFlags:8,updateScratch:9,modeByte:0,modeCounter:0,actors:Array.from({length:152},()=>new Uint8Array(256)),facilityRecords:new Uint8Array(16)});
test('packed golfers carry RNG into world systems before one phase advance',()=>{
 const q=fresh();q.actors[0][0x29]=255;q.actors[151][0x29]=255;
 const expected=originalGolferTerrainLoop(q),before=structuredClone(q),seen=[];
 const result=originalWorldGolferUpdate(q,{resolveWorld:(address,state)=>{seen.push([address,state.seed,state.phaseCounter]);return {state};}});
 expect(result.state.seed).toBe(expected.state.seed);expect(result.golfer.randomDraws).toBe(2);
 expect(result.state.actors).toEqual(expected.state.actors);expect(result.state.phaseCounter).toBe(32);
 expect(seen).toEqual([0x4029e0,0x409980,0x46df40].map(a=>[a,expected.state.seed,30]));
 expect(q).toEqual(before);expect(result.soundEvents).toEqual([]);
});
test('accepted sounds are copied and not stored in simulation state',()=>{
 const sounds=[{address:0x447a30,args:[4,100,0,0,0]}];
 const result=originalWorldGolferUpdate(fresh(),{resolveWorld:(address,state)=>({state,soundEvents:address===0x4029e0?sounds:[]})});
 sounds[0].args[0]=99;expect(result.soundEvents[0].args[0]).toBe(4);expect(result.state.soundEvents).toBeUndefined();
});
test('skipped updates need no actor records or resolvers',()=>{
 const q={...fresh(),globalFlags:4};delete q.actors;
 const r=originalWorldGolferUpdate(q);expect(r.skipped).toBe(true);expect(r.state.phaseCounter).toBe(30);expect(r.state.updateScratch).toBe(0);expect(r.golfer).toBeNull();
});
test('failed systems cannot mutate the supplied snapshot',()=>{
 const q=fresh(),before=structuredClone(q);
 expect(()=>originalWorldGolferUpdate(q,{resolveWorld:(_,state)=>{state.seed=99;throw Error('unresolved');}})).toThrow('unresolved');expect(q).toEqual(before);
 expect(()=>originalWorldGolferUpdate(q,{resolveWorld:async(_,state)=>({state})})).toThrow('synchronous');
 expect(()=>originalWorldGolferUpdate(q)).toThrow('explicit resolver');
});
test('world tick advances an active ball against restored terrain',async()=>{
 const {createOriginalWorld,originalWorldActorMap}=await import('../src/simulation/original-world-state.js');
 const {originalTerrainMetadata}=await import('../src/simulation/original-terrain-metadata.js');
 const world=createOriginalWorld({terrain:new Uint8Array(2500).fill(1),marks:new Uint16Array(2500),ownership:new Uint8Array(2500),heights:new Uint8Array(2601),metadata:Array.from({length:23},(_,i)=>originalTerrainMetadata(i)),rngState:17,phaseCounter:30,globalFlags:32});
 const {map,...fields}=originalWorldActorMap(world);
 const q={...fresh(),...fields,holeTargets:[null,{x:25,z:35}],difficulty:5,focusActor:-1,visualOwners:Array(16).fill(-1),lastPairClock:0,detailLevel:4,environmentByte:0,conditionRange:20,variant:0,luck:0};
 const b=q.actors[0],a=new DataView(b.buffer);b[0x29]=1;b[0x28]=3;b[0x78]=11;b[0x25]=5;
 for(const [offset,value] of [[8,20480],[12,25600],[0xdc,10240],[0xe0,10240],[0xcc,10240],[0xd0,10240],[0xd4,20],[0xd8,30],[0xec,100],[0xe4,300]])a.setInt32(offset,value,true);
 a.setInt16(0xaa,1,true);a.setUint32(0x18,0x40000,true);
 const before=structuredClone(q),r=originalWorldGolferUpdate(q,{resolve:(_,state)=>({state,value:0,result:0,point:{x:0,y:0,visible:false}}),resolveWorld:(_,state)=>({state})});
 expect(new DataView(r.state.actors[0].buffer).getInt32(0xe0,true)).toBeLessThan(10240);
 expect(r.golfer.calls.some(e=>e.address===0x42f110)).toBe(true);expect(r.state.phaseCounter).toBe(31);expect(q).toEqual(before);
});
test('normal actor pass suspends at tutorial and resumes the same world phase',async()=>{
 const {aimingWorld}=await import('./helpers/original-aiming-world.js');
 const {resumeOriginalWorldGolferUpdate}=await import('../src/simulation/original-world-golfer-update.js');
 const {resumeOriginalAimingTurn}=await import('../src/simulation/original-aiming-tutorial.js');
 const state=aimingWorld(),before=structuredClone(state),later=[];
 const resolve=(event,state)=>{if(event.address===0x466fb0)state.sourceText='Player'+event.args[0];return {state,value:0,result:0,point:{x:0,y:0,visible:false},...(event.address===0x447a30?{soundEvents:[event]}:{})};};
 const resolveWorld=(address,state)=>{later.push(address);return {state};};
 const suspended=originalWorldGolferUpdate(state,{resolve,resolveWorld});
 expect(suspended.completed).toBe(false);expect(suspended.continuation.next).toBe('0x42b647');expect(suspended.state).toBeUndefined();expect(later).toEqual([]);expect(suspended.soundEvents).toEqual([]);
 expect(suspended.continuation.state.phaseCounter).toBe(30);
 const result=resumeOriginalWorldGolferUpdate(suspended,{resolve,resolveWorld,resumeTurn:resumeOriginalAimingTurn});
 expect(result.completed).toBe(true);expect(result.state.phaseCounter).toBe(31);expect(result.state.selectedActor).toBe(2);expect(result.state.selectionMode).toBe(3);
 expect(later).toEqual([0x4029e0,0x409980,0x46df40]);expect(result.soundEvents).toEqual([{address:0x447a30,args:[42,100,0,0,0]}]);expect(state).toEqual(before);
});
