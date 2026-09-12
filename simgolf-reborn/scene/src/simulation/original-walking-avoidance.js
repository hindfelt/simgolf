import {originalMapDistance} from './original-route-distance.js';
import {originalWalkingOctant} from './original-walking-near-steering.js';
import {originalRandom} from './original-rng.js';
// 0x42a793–0x42aa30: ordered nearby-golfer scan and congestion reactions.
export function originalWalkingAvoidance(snapshot,resolve){
 let state=structuredClone(snapshot);const id=state.actorId,calls=[];let movementReady=0,crowdCount=0,randomDraws=0,cursor=state.avoidanceCursor;
 function actor(index){const b=state.actors?.[index];if(!Number.isInteger(index)||index<0||index>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original avoidance actor unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 function effect(address,args){const event={address,args};calls.push(event);const r=resolve(structuredClone(event),structuredClone(state));if(!r?.state||typeof r.then==='function')throw Error('Expected synchronous avoidance effect.');state=structuredClone(r.state);return r.value;}
 function pause(){const rng=originalRandom(state.seed),delay=-4-rng.next(4);state.seed=rng.state;randomDraws++;const a=actor(id);a.setInt16(0xa6,delay,true);a.setUint8(0x25,11);}
 const result=next=>({state,calls,movementReady,crowdCount,scanIndex:cursor,randomDraws,next});
 if(!Number.isInteger(cursor)||cursor<0||cursor>=152)throw Error('Original avoidance cursor unavailable.');
 if(actor(id).getUint32(0x18,true)&0x21002000)return result('0x42af66');
 for(let scanned=0;scanned<152;scanned++){
  cursor=(cursor+1)%152;let a=actor(id),other=actor(cursor);
  const angry=Boolean(other.getUint32(0x18,true)&0x20000000),otherHole=other.getInt8(0x29);
  let eligible=angry&&otherHole!==0&&cursor!==id;
  if(!eligible&&otherHole>0){
   if(cursor===id)break;
   if(otherHole<=a.getInt8(0x29)&&((state.queueClock-other.getInt16(0xc6,true))|0)>=((state.queueClock-a.getInt16(0xc6,true))|0)){
    const partner=cursor===a.getInt16(0xaa,true);
    eligible=!partner||(a.getUint8(0x22)===other.getUint8(0x22)&&other.getUint8(0x25)!==11&&Boolean(state.followPartner));
    if(eligible&&otherHole===a.getInt8(0x29)&&other.getUint8(0x2a)===0)crowdCount++;
   }
  }
  if(eligible){
   const dx=(other.getInt32(8,true)-a.getInt32(8,true))|0,dz=(other.getInt32(12,true)-a.getInt32(12,true))|0;
   if(originalMapDistance(dx,dz)<(angry?2048:512)){
    const octant=originalWalkingOctant(dx,dz),facing=a.getInt8(0x22);
    if(facing===octant||cursor===a.getInt16(0xaa,true)||facing===((octant+1)&7)||facing===((octant-1)&7)){movementReady=1;pause();}
    a=actor(id);other=actor(cursor);
    if(a.getUint8(0x78)!==36&&(other.getUint32(0x18,true)&0x20000000)){
     const value=effect(0x46c140,[cursor]);effect(0x4672d0,[id,36,value]);pause();actor(id).setUint8(0x22,originalWalkingOctant(dx,dz));movementReady=1;
    }
   }
  }
  if(cursor===id)break;
 }
 const a=actor(id);
 if(!movementReady||a.getUint8(0x2a)!==0||crowdCount<4||(a.getUint32(0x18,true)&0x6000))return result('0x42af66');
 if(!(a.getUint32(0x18,true)&0x1000))return result('0x42ad32');
 effect(0x4672d0,[id,21,20]);const updated=actor(id);updated.setInt16(0xb2,updated.getInt16(0xb2,true)+1,true);
 return result('0x42ad3b');
}
