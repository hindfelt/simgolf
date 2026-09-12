import {test,expect} from '@playwright/test';
import {originalRoundScoreList} from '../src/simulation/original-round-score-list.js';
function fixture(){const b=new Uint8Array(256);b[0x29]=18;for(let h=1;h<=18;h++)b[0x2b+h]=4;return {actorId:0,actors:[b],globalFlags:0,holeRecords:Array.from({length:20},()=>{const b=new Uint8Array(520);b[0]=4;return b;}),completionRecords:[new Uint8Array(44)],scoreList:new Int32Array(10),sourceText:'before'};}
const effects=(_,state)=>({state});
test('equal scores stay behind existing entries and a full tied list is unchanged',()=>{
 const s=fixture();s.scoreList.fill(72);const r=originalRoundScoreList(s);expect(r.rank).toBeNull();expect(r.calls).toEqual([]);expect(r.state.scoreList).toEqual(s.scoreList);
});
test('insertion shifts occupied records in descending order and keeps source snapshot unchanged',()=>{
 const s=fixture();s.scoreList.set([60,70,80,90]);const r=originalRoundScoreList(s,effects);expect(r.rank).toBe(2);expect(Array.from(r.state.scoreList).slice(0,5)).toEqual([60,70,72,80,90]);expect(r.calls).toEqual([{address:0x45b2c0,args:[23]},{address:0x45b180,args:[24]},{address:0x45b2c0,args:[22]},{address:0x45b180,args:[23]},{address:0x466fb0,args:[0,0]},{address:0x45b180,args:[22]}]);expect(s.scoreList[2]).toBe(80);
});
test('short course totals keep actual score separate from projected 18-hole score',()=>{
 const s=fixture();s.actors[0][0x29]=2;s.holeRecords[3][0]=0;const r=originalRoundScoreList(s,effects);expect(r.totals).toEqual({playedStrokes:8,playedPar:8,projectedStrokes:88,projectedRelative:16,completionBits:0});expect(r.state.scoreList[0]).toBe(8);
});
test('ongoing courses and events bypass the list without text effects',()=>{
 const s=fixture();s.actors[0][0x29]=2;expect(originalRoundScoreList(s)).toMatchObject({next:'0x427e25',calls:[],state:{sourceText:'before'}});s.actors[0][0x29]=18;s.globalFlags=0x200000;expect(originalRoundScoreList(s).next).toBe('0x427e25');
});
