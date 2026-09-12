import {test,expect} from '@playwright/test';
import {originalWalkingPreparation} from '../src/simulation/original-walking-preparation.js';
function fresh(){
 const actors=Array.from({length:152},()=>new Uint8Array(256));
 const holes=Array.from({length:20},()=>new Uint8Array(520));
 for(const h of holes){h[0]=4;const v=new DataView(h.buffer);v.setInt32(0x18,25,true);v.setInt32(0x1c,35,true);}
 for(let i=0;i<3;i++){const a=new DataView(actors[i].buffer);a.setUint8(0x29,1);a.setInt16(0xaa,i^1,true);a.setInt32(8,24000,true);a.setInt32(12,24000,true);a.setInt32(0xdc,24000,true);a.setInt32(0xe0,24512,true);}
 const p=new DataView(actors[1].buffer);p.setInt32(0xe4,100,true);p.setUint32(0xe8,0x80000000,true);
 return {actors,holes,actorId:0,ballTerrain:10,terrain:new Uint8Array(2500).fill(10),metadata:Array.from({length:21},()=>({shotClass:0})),queueClock:100,waitingGroups:0,followPartner:0,cupHeading:0,selectionState:-1,worldFlags:0,seed:17};
}
test('queue locals survive a real watching reaction without mutating input',()=>{
 const s=fresh(),r=originalWalkingPreparation(s,()=>{throw Error('Unexpected cleanup');});
 expect(r.waitingGroups).toBe(1);expect(r.next).toBe('skip');expect(r.randomDraws).toBe(1);expect(r.state.actors[0][0x25]).toBe(11);expect(s.actors[0][0x25]).toBe(0);
});
test('closed hole propagates to later partner checks and destination continuation',()=>{
 const s=fresh();s.holes[1][0]=0;s.actors[1][0x29]=0;
 const r=originalWalkingPreparation(s,()=>{throw Error('Unexpected cleanup');});
 expect(r.state.actors[0][0x29]).toBe(19);expect(r.waitingGroups).toBe(0);expect(r.next).toBe('0x429f27');expect(r.destination).toBeDefined();expect(r.randomDraws).toBe(0);
});

test('missing ball reaches tee stance and service admission',()=>{
 const s=fresh(),a=new DataView(s.actors[0].buffer);a.setInt32(0xdc,0,true);a.setInt16(0xae,10,true);s.actors[1][0x29]=0;
 const h=new DataView(s.holes[1].buffer);h.setInt32(0x10,20,true);h.setInt32(0x14,20,true);
 s.facilityRecords=new Uint8Array(4096);s.facilityWidths=Array(16).fill(2);const f=new DataView(s.facilityRecords.buffer);f.setInt16(0,7,true);f.setInt16(2,23,true);f.setInt16(4,23,true);s.facilityRecords[7]=64;
 const r=originalWalkingPreparation(s,()=>{throw Error('Unexpected cleanup');});
 expect(r.next).toBe('0x429b53');expect(r.serviceIndex).toBe(0);expect(r.destination).toEqual({x:24064,z:24064});expect(r.teePosition).toEqual({x:20992,z:20992});expect(r.destination).not.toEqual(r.teePosition);
});
test('unavailable primary facility falls back to a marked service tile',()=>{
 const s=fresh(),a=new DataView(s.actors[0].buffer);a.setInt32(0xdc,0,true);a.setInt16(0xae,10,true);a.setInt16(0xb2,140,true);s.actors[1][0x29]=0;
 s.facilityRecords=new Uint8Array(4096);s.facilityWidths=Array(16).fill(2);s.tileFlags=new Uint16Array(2500);s.tileFlags[23*50+23]=512;
 const r=originalWalkingPreparation(s,()=>{throw Error('Unexpected cleanup');});
 expect(r.next).toBe('0x429b5f');expect(r.serviceIndex).toBe(-2);expect(r.destination).toEqual({x:24064,z:24064});expect(r.calls.map(c=>c.address)).toEqual([0x40daa0,0x40db60]);
});
