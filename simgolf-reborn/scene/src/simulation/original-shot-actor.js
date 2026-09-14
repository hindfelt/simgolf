// Original actor record copied at 0x421b9c: 256 bytes beginning at
// 0x577f08 + actorId*256. Offsets below use the disassembly's 0x577f00 base.
export function originalShotActor(record,{candidateSkillMask}) {
 if(!(record instanceof Uint8Array)||record.length!==256||!Number.isInteger(candidateSkillMask))throw Error('Invalid original shot actor record.');
 const view=new DataView(record.buffer,record.byteOffset,record.byteLength);
 const byte=offset=>view.getUint8(offset-8),int=offset=>view.getInt32(offset-8,true),uint=offset=>view.getUint32(offset-8,true);
 const actorClass=byte(0x20),abilityFlags=view.getUint16(0x1e-8,true);
 return {
  launchFields:{actorFlags:uint(0x18),actorClass,skillMask:byte(0x21),abilityFlags,
   attitude:view.getInt8(0x3e-8),shotCounter:byte(0x2a),driverValue:byte(0xfa),ironValue:byte(0xfb),
   abilityValue:byte(0xfc),drawValue:byte(0xfd),fadeValue:byte(0xfe),backspinValue:byte(0xff),recoveryValue:byte(0x100)},
  physicalFields:{professional:actorClass!==0,abilityFlags,luck:byte(0x101),skillMask:candidateSkillMask},
  position:{x:int(0xdc),z:int(0xe0),height:int(0xe4)},
  ball:{heading:uint(0xe8),speed:int(0xec),verticalSpeed:int(0xf0),angularOffset:int(0xf4)},
  target:{x:int(0xd4),z:int(0xd8)},
 };
}
