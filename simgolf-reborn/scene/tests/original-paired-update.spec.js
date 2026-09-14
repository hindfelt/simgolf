import {test,expect} from '@playwright/test';
import {originalPairedUpdate} from '../src/simulation/original-paired-update.js';
function fresh(){
 const actors=Array.from({length:3},(_,i)=>{
  const bytes=new Uint8Array(256),v=new DataView(bytes.buffer);
  v.setUint32(0x18,0x100000,true);v.setInt32(8,20000+i*100,true);v.setInt32(12,20000,true);
  v.setInt32(0x10,200,true);v.setInt32(0x14,200,true);v.setInt16(0xaa,1,true);v.setInt16(0xba,4,true);
  bytes[0x25]=7;bytes[0x29]=1;return bytes;
 });
 return {actorId:0,actors,phaseCounter:192,lastPairClock:0,modeByte:0,detailLevel:4};
}
test('paired update preserves effect order and rereads the partner after reactions',()=>{
 const q=fresh(),before=structuredClone(q);
 const r=originalPairedUpdate(q,(e,s)=>{
  if(e.address===0x465c40){const a=new DataView(s.actors[0].buffer);a.setInt16(0xaa,2,true);a.setUint32(0x18,8,true);}
  return {state:s,result:1};
 });
 expect(r.calls).toEqual([{address:0x406dd0,args:[20000,20000,8]},{address:0x465c40,args:[0,0]}]);
 expect(r.triggered).toBe(true);expect(r.state.actors[1][0x40]).toBe(99);
 expect(new DataView(r.state.actors[0].buffer).getUint32(0x18,true)).toBe(0x200008);
 expect(new DataView(r.state.actors[2].buffer).getUint32(0x18,true)).toBe(0x300000);
 expect(new DataView(r.state.actors[1].buffer).getUint32(0x18,true)).toBe(0x100000);
 expect(q).toEqual(before);
});
test('timing, screen and distance gates suppress paired reactions',()=>{
 const q=fresh();expect(originalPairedUpdate({...q,phaseCounter:193}).triggered).toBe(false);
 expect(originalPairedUpdate({...q,lastPairClock:42}).triggered).toBe(false);
 new DataView(q.actors[0].buffer).setInt32(0x10,50,true);
 expect(originalPairedUpdate(q).triggered).toBe(false);
});
test('required effects and snapshots cannot be silently omitted',()=>{
 const q=fresh();expect(()=>originalPairedUpdate(q)).toThrow(/explicit resolver/);
 expect(()=>originalPairedUpdate(q,async(_,state)=>({state,result:0}))).toThrow(/synchronous/);
 expect(()=>originalPairedUpdate({...q,phaseCounter:undefined})).toThrow(/snapshot/);
});
