import {test,expect} from '@playwright/test';
import {originalRoundFinish} from '../src/simulation/original-round-finish.js';
function fixture(){const actors=[new Uint8Array(256),new Uint8Array(256)];const b=actors[0];b[0x29]=18;b[0xaa]=1;b[0xac]=12;b[0x19]=2;actors[1][0x29]=18;for(let h=1;h<=18;h++)b[0x2b+h]=4;return {actorId:0,actors,globalFlags:0,courseHoleCount:19,recordHolder:-1,selectionState:0,difficulty:1,performanceBonus:0,periodIndex:1,cashTotal:500,secondaryBalance:0,adjustmentSetting:0,scoreList:new Int32Array(10),sourceText:'',completionRecords:[new Uint8Array(44)],holeRecords:Array.from({length:21},(_,i)=>{const b=new Uint8Array(520);if(i>0&&i<=18)b[0]=4;return b;})};}
test('complete ordinary course updates results before ending the actor round',()=>{
 const s=fixture(),before=structuredClone(s),r=originalRoundFinish(s,(_,state)=>({state}));
 expect(r.next).toBe('return');expect(r.state.scoreList[0]).toBe(72);expect(r.state.completionRecords[0][0]).toBe(72);expect(r.state.actors[0][0x29]).toBe(19);expect(r.state.selectionState).toBe(-1);expect(r.calls.at(-1)).toEqual({address:0x425b50,args:[0]});expect(s).toEqual(before);
});
test('another playable hole bypasses final results and applies the next-hole records',()=>{
 const s=fixture();s.actors[0][0x29]=1;s.actors[1][0x29]=1;const r=originalRoundFinish(s);
 expect(r.next).toBe('return');expect(r.state.actors[0][0x29]).toBe(2);expect(r.state.actors[0][0x66]).toBe(12);expect(r.state.scoreList).toEqual(s.scoreList);expect(r.calls).toEqual([]);
});
