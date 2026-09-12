import {originalBallPositionStep} from './original-ball-position.js';
// Complete 0x409980: 256 records at 0x572108, nine signed words each.
// The final two words are opaque and retained. X=-1 marks an unused record.
export function originalWorldMotion(snapshot){
 if(!(snapshot.motionRecords instanceof Int32Array)||snapshot.motionRecords.length!==256*9||!Number.isInteger(snapshot.phaseCounter)||snapshot.phaseCounter<0||snapshot.phaseCounter>0xffffffff)throw Error('Original world motion records unavailable.');
 const state=structuredClone(snapshot),r=state.motionRecords;
 for(let i=0;i<r.length;i+=9){
  if(r[i]===-1)continue;
  const p=originalBallPositionStep({x:r[i],z:r[i+1],height:r[i+2],heading:r[i+3]>>>0,speed:r[i+4],verticalSpeed:r[i+5]});
  r[i]=p.x;r[i+1]=p.z;r[i+2]=p.height;
  if(r[i+2]<=0){
   r[i+2]=0;r[i+4]=0;r[i+5]=0;
   if((state.phaseCounter|0)>((r[i+6]+1024)|0))r[i]=-1;
  }
  r[i+4]=(r[i+4]-(r[i+4]>>4))|0;
  if(r[i+2]!==0||r[i+5]!==0)r[i+5]=(r[i+5]-64)|0;
 }
 return {state};
}
