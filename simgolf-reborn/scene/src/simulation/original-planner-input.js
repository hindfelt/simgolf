import {originalPlannerActor} from './original-planner-actor.js';
// Map mutable packed golfer/shared state into planner input. Launch settings,
// search scratch and map readers remain explicit caller context.
export function originalPlannerInput(snapshot,context){
 const id=snapshot.actorId,actor=originalPlannerActor(snapshot,id),b=snapshot.actors[id];
 const a=new DataView(b.buffer,b.byteOffset,b.byteLength),hole=snapshot.holes?.[actor.hole];
 if(!(hole instanceof Uint8Array)||hole.length!==520)throw Error('Original planner input hole unavailable.');
 const partnerId=a.getInt16(0xaa,true),partner=snapshot.actors?.[partnerId];
 if(!(partner instanceof Uint8Array)||partner.length!==256)throw Error('Original planner input partner unavailable.');
 const q=structuredClone(context),x=a.getInt32(0xdc,true),z=a.getInt32(0xe0,true);
 Object.assign(q,{actorId:id});
 // 0x421873 reads the green's runtime coefficient even when the ball starts
 // elsewhere. Use the same terrain metadata as motion, not stale UI context.
 const green=snapshot.metadata?.[1];
 if(green&&Object.hasOwn(green,'rollCoefficient')){
  if(!Number.isInteger(green.rollCoefficient)||green.rollCoefficient<0||green.rollCoefficient>8)throw Error('Original planner green roll coefficient unavailable.');
  q.rollCoefficient=green.rollCoefficient;
 }
 Object.assign(q.planning,{x,z,attitude:a.getInt8(0x3e),abilityFlags:a.getUint16(0x1e,true),
  driverValue:a.getUint8(0xfa),ironValue:a.getUint8(0xfb),abilityValue:a.getUint8(0xfc),
  drawValue:a.getUint8(0xfd),fadeValue:a.getUint8(0xfe),backspinValue:a.getUint8(0xff),recoveryValue:actor.recoveryValue});
 Object.assign(q.planning.rangeInput,{level:a.getInt8(0xc2),power:a.getUint8(0xf8),longDrive:a.getUint8(0xf9),boost:a.getInt8(0x3e)});
 Object.assign(q.state,{actor,partner:{actorClass:partner[0x20],reaction:partner[0x8c]},seed:snapshot.seed,
  cache:structuredClone(snapshot.strengthCache),diagnostics:snapshot.diagnostics,landing:structuredClone(snapshot.landing),
  holeCounter:new DataView(hole.buffer,hole.byteOffset,hole.byteLength).getInt32(0x24,true)});
 return q;
}
