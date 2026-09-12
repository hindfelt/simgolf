import {test,expect} from '@playwright/test';
import {originalLandingReactions} from '../src/simulation/original-landing-reactions.js';
import {originalPostLanding} from '../src/simulation/original-post-landing.js';
import {originalStoppedShot} from '../src/simulation/original-stopped-shot.js';
function fresh(code=17){const b=new Uint8Array(256),a=new DataView(b.buffer);b[0x29]=1;b[0x2a]=1;a.setInt32(0xcc,5120,true);a.setInt32(0xd0,5120,true);a.setInt32(0xdc,10240,true);a.setInt32(0xe0,5120,true);const h=new Uint8Array(520);h[0]=4;const terrain=new Uint8Array(2500).fill(1);terrain[505]=code;const metadata=Array.from({length:21},()=>({scatterCoefficient:0}));metadata[10].scatterCoefficient=1;metadata[17].scatterCoefficient=2;return {actorId:0,actors:[b],terrain,metadata,landingTile:{x:10,z:5},landingTerrain:code,holeTargets:[null,{x:45,z:45}],holeRecords:[null,h],statRecords:[new Uint8Array(184)],tileWear:new Uint8Array(2500),tileFlags:new Uint16Array(2500),difficulty:0,centreFlag:0,visualSlot:-1,priorMood:0,seed:17};}
test('landing wear saturates and reaction changes suppress stale recovery complaints',()=>{
 const q=fresh(10);q.terrain[255]=10;q.tileWear[505]=255;
 const r=originalLandingReactions(q,(_,state)=>{state.metadata[10].scatterCoefficient=0;state.actors[0][0x78]=99;return {state};});
 expect(r.calls).toHaveLength(1);expect(r.priorMood).toBe(0);expect(r.state.tileWear[505]).toBe(255);expect(r.next).toBe('0x42ceb2');
});
test('a valid improved landing uses the original recovery reaction and skips the hazard branch',()=>{
 const q=fresh(1);q.actors[0][0x23]=9;const r=originalLandingReactions(q,(_,state)=>({state}));expect(r.calls).toEqual([{address:0x4672d0,args:[0,1,1]}]);expect(r.next).toBe('0x42d110');expect(r.state.actors[0][0x25]).toBe(12);
});
test('second follow-up reaction sees flags set by the first without rerunning suppression',()=>{
 const q=fresh(10);new DataView(q.actors[0].buffer).setUint32(0x18,0x20,true);
 const r=originalPostLanding(q,(_,state)=>{new DataView(state.actors[0].buffer).setUint32(0x18,0x40,true);state.actors[0][0x8c]=3;return {state};});
 expect(r.calls.map(e=>e.args[1])).toEqual([17,16]);
});
test('whole stopped-shot tail counts the stroke then penalty and preserves the landed wear cell',()=>{
 const q=fresh(),before=structuredClone(q),r=originalStoppedShot(q,(_,state)=>({state,result:100}));
 expect(r.next).toBe('skip');expect(r.penalty).toBe(true);expect(r.state.actors[0][0x2a]).toBe(3);expect(r.state.tileWear[505]).toBe(1);expect(r.candidates).toBe(10);expect(new DataView(r.state.actors[0].buffer).getInt32(0xdc,true)).toBe(9728);expect(q).toEqual(before);
});
