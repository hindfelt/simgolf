import {test,expect} from '@playwright/test';
import {originalActorPrelude} from '../src/simulation/original-actor-prelude.js';
const fresh=()=>({slot:3,seed:17,phaseCounter:8,stateFlags:0,difficulty:5,screenX:100,focusActor:-1,countdown:0,remarkByte:50,actorWord:4,visualOwners:Array(16).fill(-1)});
test('last matching visual slot is released when the shot flag is clear',()=>{
 const q=fresh();q.visualOwners[1]=3;q.visualOwners[15]=3;
 const result=originalActorPrelude(q);
 expect(result.visualSlot).toBe(-1);expect(result.state.visualOwners[1]).toBe(3);expect(result.state.visualOwners[15]).toBe(-1);
 expect(q.visualOwners[15]).toBe(3);
 expect(originalActorPrelude({...q,stateFlags:0x40000}).visualSlot).toBe(15);
});
test('countdown advances only on the original phase and focus gate',()=>{
 const q={...fresh(),countdown:7};
 expect(originalActorPrelude(q).state).toMatchObject({countdown:6,focusActor:3,seed:17});
 expect(originalActorPrelude({...q,phaseCounter:9}).state.countdown).toBe(7);
 expect(originalActorPrelude({...q,stateFlags:0x100000}).state.focusActor).toBe(-1);
});
test('countdown callback changes are observed by subsequent focus check',()=>{
 const q={...fresh(),countdown:2,difficulty:-1};
 const result=originalActorPrelude(q,(event,state)=>{
  expect(event).toEqual({address:0x466ea0,args:[3]});return {...state,countdown:6};
 });
 expect(result.randomDraws).toBe(1);expect(result.state.focusActor).toBe(3);expect(result.state.seed).not.toBe(q.seed);
 expect(originalActorPrelude(JSON.parse(JSON.stringify(q)),(_,s)=>({...s,countdown:6}))).toEqual(result);
 expect(()=>originalActorPrelude(q)).toThrow(/explicit resolver/);
 expect(()=>originalActorPrelude(q,async(_,s)=>s)).toThrow(/synchronous/);
 expect(q.seed).toBe(17);
});
