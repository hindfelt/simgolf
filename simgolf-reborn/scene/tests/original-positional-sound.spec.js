import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalPositionalSound} from '../src/simulation/original-positional-sound.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-positional-sound.json',import.meta.url)));
const input=()=>({soundId:48,duration:0,projected:{x:400,y:250,visible:true},zoom:false,audioLevel:4,state:{seed:2002,queued:0,sequenceIndex:0}});
test('sound parameters and RNG/queue mutations match original executable fixtures',()=>{
 for(const [q,expected] of rows){const before=structuredClone(q);const got=originalPositionalSound(q,(_event,state)=>{if(q.mutate){state.seed=777;state.queued=99;state.sequenceIndex=123;}return state;});expect(got).toEqual(expected);expect(q).toEqual(before);}
});
test('off-screen suppression leaves shared RNG and pending queue unchanged',()=>{
 const q=input();q.projected.visible=false;q.state.queued=1;
 const got=originalPositionalSound(q,()=>{throw Error('Unexpected sound');});
 expect(got).toEqual({state:q.state,events:[],randomDraws:0});
});
test('forced playback clamps screen coordinates and sequence notes consume no RNG',()=>{
 const q=input();q.duration=-1;q.projected={x:900,y:700,visible:false};q.state.queued=1;q.state.sequenceIndex=29;
 const got=originalPositionalSound(q,(_event,state)=>state);
 expect(got.randomDraws).toBe(0);expect(got.state.seed).toBe(2002);expect(got.state.sequenceIndex).toBe(30);expect(got.state.queued).toBe(0);
 expect(got.events[0].args).toEqual([48,99,62,-1000,0]);
});
test('accepted random playback requires a resolver and retains post-call seed effects',()=>{
 const q=input();expect(()=>originalPositionalSound(q)).toThrow('requires an explicit resolver');
 const got=originalPositionalSound(q,(_event,state)=>({...state,seed:123,queued:9}));
 expect(got.randomDraws).toBe(1);expect(got.state.seed).toBe(123);expect(got.state.queued).toBe(0);
});
