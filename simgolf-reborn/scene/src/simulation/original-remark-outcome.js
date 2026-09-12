import {originalRandom} from './original-rng.js';
const signed16=value=>(value<<16)>>16;
// golf.exe 0x467e4f–0x46806a. Inputs are the packed actor and the current
// hole/remark/tile records selected by its original coordinates and hole ID.
export function originalRemarkOutcome(q){
 const s=structuredClone(q.state),a=s.actor;
 if(!(a instanceof Uint8Array)||a.length!==256)throw Error('Expected packed actor record.');
 if(q.kind===64&&(s.holeTotal&65535)!==s.remarkCount)throw Error('Aliased hole total and remark counter disagree.');
 const words=new DataView(a.buffer,a.byteOffset,a.byteLength);
 let delta=q.delta|0,skipReduction=false;
 if(delta===-1 && q.reactionMode!==2 && a[0x18]===0){
  delta=0;
  const count=q.difficulty===0?3:q.difficulty<=2?5:10;
  for(let i=1;i<count;i++)if(a[0x70+i]===(q.kind|0))delta=-1;
  if(words.getUint16(0x8a,true)&0x8000)delta=-1;
  if(q.reactionMode===1){delta=0;skipReduction=true;}
 }
 if(!skipReduction&&delta<0&&(a[0x18]&0xe0)!==0x40)delta=Math.trunc(((delta-1)|0)/2);
 words.setInt16(0xa4,Math.max(-10,Math.min(10,signed16(words.getInt16(0xa4,true)+delta))),true);
 s.holeTotal=signed16(s.holeTotal+delta);
 if(q.kind===64)s.remarkCount=s.holeTotal&65535;
 const rng=originalRandom(s.seed),draw=rng.next(6);
 const flags=words.getUint32(0x10,true);
 if((draw<=q.difficulty||(flags&0x20000000))&&delta<0&&!(q.globalFlags&0x4000000)&&!(s.tileFlags&0xc00)&&q.terrainCode!==17){
  s.tileFlags|=0x4800;s.tileGrowth=1;s.worldDirty=-1;
 }
 if(delta!==0){
  s.remarkCount=(s.remarkCount+1)&65535;s.remarkValue=q.value&65535;
  if(q.kind===64)s.holeTotal=signed16(s.remarkCount);
  if(delta>0)a[0x89]|=0x40;
 }
 if((q.delta|0)<0)words.setUint16(0x88,words.getUint16(0x88,true)|0x8000,true);
 if(delta<0)a[0x89]|=0xc0;
 if(delta>0)s.positive=(s.positive+1)&255;
 if(delta<0)s.negative=(s.negative+1)&255;
 s.seed=rng.state;
 return {state:s,delta,randomDraws:rng.draws};
}
