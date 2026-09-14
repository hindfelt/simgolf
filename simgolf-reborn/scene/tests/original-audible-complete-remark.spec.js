import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalAudibleCompleteRemark} from '../src/simulation/original-audible-complete-remark.js';
import {originalRandom} from '../src/simulation/original-rng.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-complete-remark.json',import.meta.url)));
function input(kind=20){
 const q=structuredClone(rows.find(([q,r])=>q.kind===kind&&r.popupRandomDraws===2)?.[0]||rows.find(([q])=>q.kind===kind)[0]);
 for(const id in q.state.actors)q.state.actors[id]=Uint8Array.from(q.state.actors[id]);
 for(const field of ['profileRecords','holeRecords','profileHistory'])for(const id in q[field])q[field][id]=Uint8Array.from(q[field][id]);
 Object.assign(q.state,{seed:123,queued:0,sequenceIndex:20});return q;
}
const options={
 audioContext:()=>({camera:{cameraX:1,cameraZ:3,scale:2,width:800,height:600,rotation:0,heightScale:16,magnify:true},zoom:false,map:{flagsAt:()=>0,objectHeight:()=>4,storedHeight:()=>5,cornerHeight:(c,r,d)=>({1:3,3:5,5:4,7:6})[d]}}),
 playback:(e,s)=>s,resolvePhrase:(e,s)=>({...s,sourceText:s.sourceText+'Gary'}),
 reactionContext:()=>({difficulty:1,reactionMode:0,selectedActorId:-1,terrainCode:2,state:{seed:888,holeTotal:0,remarkCount:0,remarkValue:0,tileFlags:0,tileGrowth:0,worldDirty:0,positive:0,negative:0}}),
 explanationContext:r=>({difficulty:1,state:r.state})
};
function seedAfter(bounds){const rng=originalRandom(123);for(const b of bounds)rng.next(b);return rng.state;}
test('speech, outcome and popup use one RNG stream',()=>{
 const q=input(),before=structuredClone(q),r=originalAudibleCompleteRemark(q,options);
 expect(r.audioRandomDraws).toBe(1);expect(r.reaction.randomDraws).toBe(1);expect(r.explanation.popupRandomDraws).toBe(2);
 expect(r.state.seed).toBe(seedAfter([600,6,600,200]));expect(r.state.queued).toBe(0);expect(r.soundEvents.length).toBe(1);expect(q).toEqual(before);
});
test('queued speech advances its sequence without a pitch RNG draw',()=>{
 const q=input();q.state.queued=1;const r=originalAudibleCompleteRemark(q,options);
 expect(r.audioRandomDraws).toBe(0);expect(r.state.sequenceIndex).toBe(21);expect(r.state.queued).toBe(0);expect(r.state.seed).toBe(seedAfter([6,600,200]));
});
test('preparation speech and repeat suppression retain audio changes',()=>{
 const q=input(35);q.state.actors[0][0x70]=35;
 const r=originalAudibleCompleteRemark(q,{...options,reactionContext:()=>{throw Error('Must not reach reaction');}});
 expect(r.reaction).toBeNull();expect(r.explanation).toBeNull();expect(r.audioRandomDraws).toBe(1);expect(r.state.seed).toBe(seedAfter([600]));
 q.state.actors[0][0x70]=0;
 const next=originalAudibleCompleteRemark(q,options);
 expect(next.audioRandomDraws).toBe(2);expect(next.reaction.state.seed).toBe(seedAfter([600,600,6]));
});
test('reaction return retains actual positional sound RNG and rejects async playback',()=>{
 const q=input(65);const r=originalAudibleCompleteRemark(q,{...options,reactionContext:()=>({...options.reactionContext(),difficulty:0})});
 expect(r.next).toBe('return');expect(r.audioRandomDraws).toBe(1);expect(r.explanation).toBeNull();expect(r.state.seed).toBe(seedAfter([600]));
 expect(()=>originalAudibleCompleteRemark(input(),{...options,playback:async(e,s)=>s})).toThrow('synchronous');
});
