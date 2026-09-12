import {originalRandom} from './original-rng.js';

const byte=n=>Number.isInteger(n)&&n>=0&&n<=255;
const int=n=>Number.isInteger(n)&&n>=-0x80000000&&n<=0x7fffffff;
function validate(s) {
 if(!s||!Number.isInteger(s.seed)||s.seed<0||s.seed>0xffffffff||
  ![s.clubhouseX,s.clubhouseZ].every(n=>Number.isInteger(n)&&n>=-32768&&n<=32767)||
  !Array.isArray(s.actors)||s.actors.length!==152||!s.actors.every(a=>a&&byte(a.holeByte)&&byte(a.countdown)&&int(a.x)&&int(a.z)))throw Error('Invalid original golfer loop snapshot.');
 return s;
}
// 0x428100–0x42819c and 0x4295ef–0x42960a. Slots are native actor
// indices, not a compact list of playing golfers. The normal actor body is an
// explicit resolver for isolated boundary checks; original-golfer-loop.js
// composes the recovered normal actor body with packed records.
export function originalGolferLoopBoundary(snapshot,updateActor) {
 let state=structuredClone(validate(snapshot));const updatedSlots=[];let entryRandomDraws=0;
 for(let slot=0;slot<152;slot++) {
  const actor=state.actors[slot];
  if(actor.holeByte===0)continue;
  if(actor.holeByte===255) {
   const rng=originalRandom(state.seed);
   if(actor.countdown===0&&rng.next(100)===0) {
    actor.x=(state.clubhouseX<<10)+0x600;
    actor.z=(state.clubhouseZ<<10)+0x600;
   }
   if(actor.countdown!==0&&rng.next(2)!==0)actor.countdown--;
   state.seed=rng.state;entryRandomDraws+=rng.draws;
   continue;
  }
  if(typeof updateActor!=='function')throw Error('Original active actor body requires an explicit resolver.');
  updatedSlots.push(slot);
  const reply=updateActor(slot,structuredClone(state));
  if(!reply||typeof reply.then==='function')throw Error('Expected synchronous original actor state.');
  state=structuredClone(validate(reply));
 }
 return {state,updatedSlots,entryRandomDraws};
}
