import {originalHeading} from './original-heading.js';
import {originalTerrainByte} from './original-terrain-byte.js';
const DX=[0,1,1,1,0,-1,-1,-1], DZ=[-1,-1,0,1,1,1,0,-1];
const direction = heading => (((heading >> 28) + 1) >> 1) & 7;

// 0x42960b–0x4297c7: standing position around own or partner's ball.
export function originalWalkingBallDestination(snapshot) {
  const state=structuredClone(snapshot),id=state.actorId;
  function actor(index){const b=state.actors?.[index];if(!Number.isInteger(index)||index<0||index>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original destination actor unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
  const a=actor(id),ball={x:a.getInt32(0xdc,true),z:a.getInt32(0xe0,true)};
  let followPartner=state.followPartner|0;
  if(!ball.x||state.walkingOverride)return {state,followPartner,next:'0x4297c7'};
  let x=ball.x,z=ball.z;const facing=direction(state.cupHeading);
  function terrain(x,z){x>>=10;z>>=10;return x<0||x>=50||z<0||z>=50?20:originalTerrainByte(state,x,z);}
  if(followPartner){
    const p=actor(a.getInt16(0xaa,true)),px=p.getInt32(0xdc,true),pz=p.getInt32(0xe0,true);
    if(state.ballTerrain===1&&terrain(px,pz)===1){
      x=(x-Math.trunc(((DX[facing]<<10)+512)/2))|0;
      z=(z-Math.trunc(((DZ[facing]<<10)+512)/2))|0;
    }else{
      const b=state.holes?.[a.getInt8(0x29)];if(!(b instanceof Uint8Array)||b.length!==520)throw Error('Original destination hole unavailable.');
      const h=new DataView(b.buffer,b.byteOffset,b.byteLength);
      const heading=originalHeading(((h.getInt32(0x18,true)<<10)+512-px)|0,((h.getInt32(0x1c,true)<<10)+512-pz)|0);
      const side=(direction(heading)-(id&1)-1)&7;
      x=(px-(DX[side]<<10))|0;z=(pz-(DZ[side]<<10))|0;
    }
    if(terrain(x,z)===17){x=ball.x;z=ball.z;}
  }else{
    followPartner=0;
    const units=state.ballTerrain===1?((~facing&1)|2):(facing&1?3:5);
    x=(x-Math.imul(DX[facing],units<<6))|0;z=(z-Math.imul(DZ[facing],units<<6))|0;
  }
  return {state,followPartner,ballPosition:ball,destination:{x,z},next:'0x429f27'};
}
