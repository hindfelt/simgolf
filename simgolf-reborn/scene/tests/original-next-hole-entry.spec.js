import {test,expect} from '@playwright/test';
import {originalNextHoleEntry} from '../src/simulation/original-next-hole-entry.js';
function state(){const actors=[new Uint8Array(256),new Uint8Array(256)];actors[0][0xaa]=1;actors[0][0x29]=1;actors[1][0x29]=1;return {actorId:0,actors,holeRecords:Array.from({length:20},()=>new Uint8Array(520)),globalFlags:0,courseHoleCount:18};}
test('ordinary next-hole entry needs an existing hole and active partner',()=>{
 const s=state();expect(originalNextHoleEntry(s).next).toBe('0x4280e4');s.holeRecords[2][0]=4;expect(originalNextHoleEntry(s).next).toBe('0x427ec4');
 for(const hole of [0,19]){s.actors[1][0x29]=hole;expect(originalNextHoleEntry(s).next).toBe('0x4280e4');}
 expect(s.actors[0][0x29]).toBe(1);
});
test('event wraps to one, increments the 16-bit clock and explicitly resets played scorecards',()=>{
 const s=state();s.globalFlags=0x200000;s.actors[0][0x29]=18;s.actors[0][0x2c]=4;s.actors[0][0xc6]=250;s.actors[0][0xc7]=255;
 expect(()=>originalNextHoleEntry(s)).toThrow('resolver');
 const r=originalNextHoleEntry(s,(effect,state)=>{expect(effect).toEqual({address:0x425b50,args:[0]});expect(state.actors[0][0x29]).toBe(1);expect(new DataView(state.actors[0].buffer).getUint16(0xc6,true)).toBe(30);state.actors[0][0x2c]=0;return {state};});
 expect(r.next).toBe('0x427ec4');expect(r.state.actors[0][0x2c]).toBe(0);expect(s.actors[0][0x2c]).toBe(4);
});
test('missing original hole data is not silently treated as an end of round',()=>{
 const s=state();s.holeRecords=[];expect(()=>originalNextHoleEntry(s)).toThrow('record unavailable');
});
