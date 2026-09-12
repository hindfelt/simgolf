import {test,expect} from '@playwright/test';
import {originalRoundExit} from '../src/simulation/original-round-exit.js';
import {originalResolvedNextHole} from '../src/simulation/original-resolved-next-hole.js';
function fixture(){const actors=[new Uint8Array(256),new Uint8Array(256)];actors[0][0x29]=18;actors[0][0xaa]=1;actors[1][0x29]=18;const a=new DataView(actors[0].buffer);a.setInt32(0xdc,9876,true);a.setInt32(0xe0,1234,true);a.setUint32(0x18,0x200,true);return {actorId:0,actors,holeRecords:Array.from({length:21},()=>new Uint8Array(520)),selectionState:3,globalFlags:0};}
test('common exit marks round ended without clearing unrelated ball state',()=>{
 const s=fixture(),r=originalRoundExit(s),a=new DataView(r.state.actors[0].buffer);expect(r.next).toBe('return');expect(a.getUint8(0x29)).toBe(19);expect(a.getInt32(0xdc,true)).toBe(0);expect(a.getInt32(0xe0,true)).toBe(1234);expect(r.state.selectionState).toBe(-1);expect(s.actors[0][0x29]).toBe(18);
});
test('ordinary complete round uses the recovered exit without a callback stub',()=>{
 const r=originalResolvedNextHole(fixture());expect(r.next).toBe('return');expect(r.calls).toEqual([{address:0x425b50,args:[0]}]);expect(r.state.actors[0][0x29]).toBe(19);expect(r.state.selectionState).toBe(-1);
});
test('special reward branches remain explicit and have not already cleaned up the actor',()=>{
 for(const type of [0x40,0x60,0x80]){const s=fixture();s.actors[0][0x20]=type;expect(()=>originalResolvedNextHole(s)).toThrow('special round exit');const r=originalRoundExit(s);expect(r.next).not.toBe('return');expect(r.state.actors[0][0x29]).toBe(18);}
});
