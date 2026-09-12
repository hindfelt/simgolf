import {test,expect} from '@playwright/test';
import {originalVisualFollow} from '../src/simulation/original-visual-follow.js';
function fixture(slot=0){
 const r=new Uint8Array(76),a=new Uint8Array(256);r[0x13]=1;a[0x29]=2;
 return {visualRecords:Array.from({length:64},(_,i)=>i===slot?r:null),actors:[a],selectedActor:0,seed:12345};
}
test('visual follow moves toward the ball offset without drawing randomness',()=>{
 const s=fixture(1),a=new DataView(s.actors[0].buffer);a.setInt32(0xdc,10000,true);a.setInt32(0xe0,20000,true);
 const before=structuredClone(s),out=originalVisualFollow(s,1);
 expect(out.next).toBe('0x403488');expect(out.locals).toEqual({x:11024,z:18976,dx:11024,dz:18976});
 expect(out.randomDraws).toBe(0);expect(out.state.seed).toBe(s.seed);expect(s).toEqual(before);
});
test('nearby followers pause facing the actor and own their changed record',()=>{
 const s=fixture(),a=new DataView(s.actors[0].buffer);a.setInt32(8,1000,true);a.setInt32(12,500,true);
 const before=structuredClone(s),out=originalVisualFollow(s,0),r=new DataView(out.state.visualRecords[0].buffer);
 expect(out.next).toBe('skip');expect(out.locals).toEqual({x:1000,z:500,dx:1000,dz:500});
 expect(out.randomDraws).toBe(1);expect(out.state.seed).not.toBe(s.seed);
 expect(r.getInt16(0x1e,true)).toBe(11);expect(r.getInt16(0x1a,true)).toBeGreaterThanOrEqual(1);expect(r.getInt16(0x1a,true)).toBeLessThanOrEqual(16);
 expect(r.getInt16(0x18,true)).toBe(0);expect(s).toEqual(before);
});
test('non-followers bypass actor lookup and first-hole waiting prevents movement',()=>{
 const s=fixture();s.visualRecords[0][0x13]=255;s.selectedActor=-1;
 expect(originalVisualFollow(s,0).next).toBe('0x402c6f');
 s.visualRecords[0][0x13]=1;s.selectedActor=0;s.actors[0][0x29]=1;
 new DataView(s.actors[0].buffer).setInt32(8,10000,true);
 expect(originalVisualFollow(s,0).next).toBe('skip');s.actors[0][0x2a]=1;
 expect(originalVisualFollow(s,0).next).toBe('0x403488');
 new DataView(s.actors[0].buffer).setInt16(0xa6,1,true);
 expect(originalVisualFollow(s,0).next).toBe('skip');
});
