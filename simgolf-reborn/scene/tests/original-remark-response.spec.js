import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalRemarkResponse} from '../src/simulation/original-remark-response.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-remark-response.json',import.meta.url)));
const decode=raw=>({...structuredClone(raw),before:Uint8Array.from(raw.before),state:{...structuredClone(raw.state),actor:Uint8Array.from(raw.state.actor)}});
test('composed preamble and outcome match contiguous original execution',()=>{
 for(const [raw,expected] of rows){
  const q=decode(raw),before=structuredClone(q);
  const got=originalRemarkResponse(q,(event,state)=>{if(q.effectMutation){state.actor[0x18]=0x40;state.seed=777;}return state;});
  got.state.actor=[...got.state.actor];expect(got).toEqual(expected);expect(q).toEqual(before);
 }
});
function effectInput(){
 const q=decode(rows[0][0]);q.kind=4;q.delta=-3;q.actorId=q.selectedActorId=0;
 q.state.actor[0x18]=1;new DataView(q.state.actor.buffer).setUint32(0x10,0x40000,true);return q;
}
test('sound boundary must be resolved explicitly and later outcome reads the returned state',()=>{
 const q=effectInput(),before=structuredClone(q);
 expect(()=>originalRemarkResponse(q)).toThrow('requires a resolver');
 expect(()=>originalRemarkResponse(q,()=>Promise.resolve(q.state))).toThrow('synchronous');
 const unchanged=originalRemarkResponse(q,(_event,state)=>state);
 const altered=originalRemarkResponse(q,(event,state)=>{
  expect(event.args).toEqual([48,100,0,0,0]);state.actor[0x18]=0x40;state.seed=777;return state;
 });
 expect(unchanged.delta).toBe(-2);expect(altered.delta).toBe(-3);expect(altered.state.seed).not.toBe(unchanged.state.seed);
 expect(q).toEqual(before);
});
test('early return consumes no RNG and does not invoke the effect resolver',()=>{
 const q=effectInput();q.kind=48;q.delta=0;
 const got=originalRemarkResponse(q,()=>{throw Error('Unexpected effect');});
 expect(got.next).toBe('return');expect(got.randomDraws).toBe(0);expect(got.state).toEqual(q.state);
});
