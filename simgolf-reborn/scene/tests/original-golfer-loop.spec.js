import {test,expect} from '@playwright/test';
import {originalGolferLoop} from '../src/simulation/original-golfer-loop.js';
import {originalWorldUpdate} from '../src/simulation/original-world-update.js';
const fresh=()=>({seed:17,clubhouseX:20,clubhouseZ:30,actors:Array.from({length:152},()=>({holeByte:0,countdown:0,x:0,z:0}))});
test('original slot order observes changes made by earlier actors',()=>{
 const q=fresh();q.actors[1].holeByte=1;
 const result=originalGolferLoop(q,(slot,s)=>{if(slot===1)s.actors[151].holeByte=1;return s;});
 expect(result.updatedSlots).toEqual([1,151]);expect(result.entryRandomDraws).toBe(0);
 expect(q.actors[151].holeByte).toBe(0);
});
test('entry states consume shared randomness even without an active shot',()=>{
 const q=fresh();q.actors.forEach(a=>a.holeByte=255);
 const result=originalGolferLoop(q);
 expect(result.entryRandomDraws).toBe(152);expect(result.updatedSlots).toEqual([]);
 expect(result.state.seed).not.toBe(q.seed);
 expect(originalGolferLoop(JSON.parse(JSON.stringify(q)))).toEqual(result);
});
test('world dispatch carries golfer RNG into later callbacks and advances phase once',()=>{
 const q={...fresh(),phaseCounter:30,globalFlags:8,updateScratch:1,modeByte:0,modeCounter:0};
 q.actors[0].holeByte=255;q.actors[151].holeByte=1;
 const seen=[];
 const run=s=>originalWorldUpdate(s,(address,state)=>{
  seen.push([address,state.phaseCounter,state.seed]);
  if(address===0x428100)return originalGolferLoop(state,(_,actorState)=>actorState).state;
  return state;
 });
 const result=run(q);
 expect(result.state.phaseCounter).toBe(32);
 expect(seen.map(s=>s[1])).toEqual([30,30,30,30]);
 expect(seen[1][2]).toBe(result.state.seed);expect(seen[1][2]).not.toBe(q.seed);
 expect(run(JSON.parse(JSON.stringify(q)))).toEqual(result);
});
test('missing normal body and malformed actor arrays fail without mutating input',()=>{
 const q=fresh();q.actors[0].holeByte=1;const before=structuredClone(q);
 expect(()=>originalGolferLoop(q)).toThrow(/explicit resolver/);
 expect(()=>originalGolferLoop(q,async(_,s)=>s)).toThrow(/synchronous/);
 expect(q).toEqual(before);
 expect(()=>originalGolferLoop({...q,actors:q.actors.slice(1)})).toThrow(/snapshot/);
});
