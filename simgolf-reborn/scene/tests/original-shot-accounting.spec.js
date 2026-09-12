import {test,expect} from '@playwright/test';
import {originalShotAccounting} from '../src/simulation/original-shot-accounting.js';
function fresh(){const b=new Uint8Array(256),a=new DataView(b.buffer),h=new Uint8Array(520);h[0]=3;b[0x29]=1;b[0x28]=10;a.setInt16(0xa6,-25,true);a.setUint32(0x18,0x4040000,true);a.setInt32(0xcc,512,true);a.setInt32(0xd0,512,true);a.setInt32(0xdc,1536,true);a.setInt32(0xe0,512,true);return {actorId:0,actors:[b],holeRecords:[null,h],statRecords:[new Uint8Array(184)],terrain:new Uint8Array(2500).fill(1),metadata:[{}, {scatterCoefficient:0}]};}
test('first stopped stroke records native drive and regulation-green statistics',()=>{
 const q=fresh(),before=structuredClone(q),r=originalShotAccounting(q),h=new DataView(r.state.holeRecords[1].buffer),s=new DataView(r.state.statRecords[0].buffer),a=new DataView(r.state.actors[0].buffer);
 expect(r.driveDistance).toBe(25);expect(r.greenInRegulation).toBe(true);expect(s.getInt32(0,true)).toBe(25);expect(s.getUint32(4,true)).toBe(1);expect(s.getUint32(8,true)).toBe(1);expect(s.getUint32(0x10,true)).toBe(1);expect(s.getInt32(0x14,true)).toBe(25);expect(h.getUint32(0x20,true)).toBe(1);expect(h.getUint16(0x166,true)).toBe(25);expect(a.getInt16(0xa6,true)).toBe(0);expect(r.state.actors[0][0x28]).toBe(0);expect(a.getUint32(0x18,true)).toBe(0);expect(q).toEqual(before);
});
test('later stroke can reach green in regulation without repeating drive accounting',()=>{
 const q=fresh();q.actors[0][0x2a]=1;q.holeRecords[1][0]=4;
 const r=originalShotAccounting(q),s=new DataView(r.state.statRecords[0].buffer);expect(r.driveDistance).toBeNull();expect(r.greenInRegulation).toBe(true);expect(s.getUint32(0x10,true)).toBe(0);expect(s.getUint32(8,true)).toBe(1);
});
test('terrain two retains its native flag and rough landing does not count a fairway hit',()=>{
 const q=fresh();q.terrain.fill(2);q.metadata[2]={scatterCoefficient:1};const r=originalShotAccounting(q);
 expect(new DataView(r.state.actors[0].buffer).getUint32(0x18,true)).toBe(0x4000000);expect(new DataView(r.state.statRecords[0].buffer).getUint32(4,true)).toBe(0);expect(r.greenInRegulation).toBe(false);
});
test('native counters wrap while in-flight accounting is rejected without mutation',()=>{
 const q=fresh();new DataView(q.statRecords[0].buffer).setUint32(0x10,0xffffffff,true);new DataView(q.holeRecords[1].buffer).setUint16(0x15e,65535,true);
 const r=originalShotAccounting(q);expect(new DataView(r.state.statRecords[0].buffer).getUint32(0x10,true)).toBe(0);expect(new DataView(r.state.holeRecords[1].buffer).getUint16(0x15e,true)).toBe(0);
 new DataView(q.actors[0].buffer).setInt32(0xec,100,true);const before=structuredClone(q);expect(()=>originalShotAccounting(q)).toThrow('stopped ball');expect(q).toEqual(before);
});
