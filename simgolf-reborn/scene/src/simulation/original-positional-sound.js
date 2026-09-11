import {originalRandom} from './original-rng.js';
export const ORIGINAL_SOUND_SEQUENCE=Object.freeze([0,2,4,7,5,5,9,7,7,12,11,12,7,4,0,2,4,5,7,9,7,5,4,2,4,0,255,0,2,251,255,2,5,4,2,4]);
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
// 0x40c20e–0x40c3d6, after the original screen-projection boundary.
// Screen coordinates and audio globals must belong to the authoritative snapshot.
export function originalPositionalSound(q,resolveSound){
 let state=structuredClone(q.state),x=q.projected.x|0,y=q.projected.y|0,duration=q.duration|0;
 const events=[];
 if(!q.projected.visible&&duration!==-1)return {state,events,randomDraws:0};
 if(duration===-1){x=clamp(x,0,799);y=clamp(y,0,599);duration=0;}
 else{
  if(q.zoom){x=(x*2-400)|0;y=(y*2-400)|0;}
  if(y<0||y>500||x<0||x>=800)return {state,events,randomDraws:0};
 }
 const base=q.audioLevel>=4?50:10,pan=Math.trunc(x*127/800)-64;
 let pitch,volume,randomDraws=0;
 if(!state.queued){
  const rng=originalRandom(state.seed);pitch=300-rng.next(600);state.seed=rng.state;randomDraws=rng.draws;
  volume=Math.trunc(Math.abs(x-400)/16)+base;
 }else{
  const index=(state.sequenceIndex|0)%36,byte=(q.sequence||ORIGINAL_SOUND_SEQUENCE)[index];
  if(!Number.isInteger(byte))throw Error(`Missing original sound sequence byte ${index}.`);
  pitch=(((byte<<24)>>24)-5)*100;
  state.sequenceIndex=(state.sequenceIndex+1)|0;
  volume=Math.trunc(y/12)+base;
 }
 const event={address:0x447a30,args:[q.soundId|0,volume,pan,pitch,duration]};events.push(event);
 if(typeof resolveSound!=='function')throw Error('Original sound playback requires an explicit resolver.');
 const reply=resolveSound(structuredClone(event),structuredClone(state));
 if(!reply||typeof reply.then==='function')throw Error('Expected synchronous speculative sound state.');
 state=structuredClone(reply);state.queued=0;
 return {state,events,randomDraws};
}
