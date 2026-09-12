import {test,expect} from '@playwright/test';
import {originalActorDecision} from '../src/simulation/original-actor-decision.js';
import {originalRouteSegment} from '../src/simulation/original-route-distance.js';
function fresh(){
 const b=new Uint8Array(256),a=new DataView(b.buffer);
 a.setInt32(8,20480,true);a.setInt32(12,25600,true);a.setInt32(0xdc,10240,true);a.setInt32(0xe0,10240,true);
 a.setInt32(0xcc,10240,true);a.setInt32(0xd0,10240,true);a.setInt32(0xd4,20,true);a.setInt32(0xd8,30,true);
 a.setInt32(0xec,100,true);a.setInt16(0xaa,1,true);b[0x29]=1;b[0x28]=1;b[0x78]=11;
 const partner=b.slice();
 return {actorId:0,actors:[b,partner],globalFlags:32,holeTargets:[null,{x:25,z:35}],seed:17,phaseCounter:0,difficulty:5,focusActor:-1,visualOwners:Array(16).fill(-1),lastPairClock:0,modeByte:0,detailLevel:4,environmentByte:0,conditionRange:20,metadata:[{}, {shape:1}],terrain:new Uint8Array(2500).fill(1),tileFlags:new Uint16Array(2500)};
}
test('continuous actor decision retains drawing callback changes before turn selection',()=>{
 const q=fresh(),before=structuredClone(q);
 const r=originalActorDecision(q,(e,state)=>{
  if(e.address===0x47edd0)new DataView(state.actors[0].buffer).setUint32(0x18,0x20000000,true);
  return {state,result:0,point:{x:100,y:150,visible:true}};
 });
 expect(r.next).toBe('0x428ad1');expect(r.calls.map(e=>e.address)).toEqual([0x42f270,0x42f020,0x47edd0,0x42f020]);
 expect(r.ballTile).toEqual({x:10,z:10});expect(r.randomDraws).toBe(0);expect(q).toEqual(before);
});
test('negative delay exits before optional projection or partner processing',()=>{
 const q=fresh();new DataView(q.actors[0].buffer).setInt16(0xa6,-1,true);
 const r=originalActorDecision(q,()=>{throw Error('Unexpected effect');});
 expect(r.next).toBe('skip');expect(r.calls).toEqual([]);expect(r.partnerNotReady).toBeUndefined();
});
test('clipped shot line still proceeds to ordinary turn selection',()=>{
 const r=originalActorDecision(fresh(),(_,state)=>({state,point:{x:-100,y:0,visible:false}}));
 expect(r.calls).toHaveLength(1);expect(r.next).toBe('0x42b825');
});
test('off-map origin is accepted within verified distance bounds, larger differences still reject',()=>{
 expect(originalRouteSegment({x:-512,z:512},{x:0,z:0})).toBe(25);
 expect(()=>originalRouteSegment({x:-100000,z:512},{x:0,z:0})).toThrow('verified map domain');
});
