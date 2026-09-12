// 0x42c47c–0x42c527, after a failed cup-capture test.
export function originalActorGroundReflection(snapshot,resolve){
 let state=structuredClone(snapshot);const calls=[],id=state.actorId;let reflectedX=false,reflectedZ=false;
 function actor(){const b=state.actors?.[id];if(!Number.isInteger(id)||id<0||id>=152||!(b instanceof Uint8Array)||b.length!==256)throw Error('Original reflection actor unavailable.');return new DataView(b.buffer,b.byteOffset,b.byteLength);}
 function sound(){const a=actor(),e={address:0x40c1f0,args:[6,a.getInt32(0xdc,true),a.getInt32(0xe0,true),0]};calls.push(e);const r=resolve(structuredClone(e),structuredClone(state));if(!r?.state||typeof r.then==='function')throw Error('Expected synchronous original reflection effect.');state=structuredClone(r.state);}
 let a=actor();
 if((a.getInt32(0xdc,true)>>10)!==snapshot.ballTile.x&&(state.edgeFlags&(snapshot.stepX>0?4:64))){sound();a=actor();a.setUint32(0xe8,-a.getUint32(0xe8,true),true);reflectedX=true;}
 a=actor();
 if((a.getInt32(0xe0,true)>>10)!==snapshot.ballTile.z&&(state.edgeFlags&(snapshot.stepCosine>0?1:16))){sound();a=actor();a.setUint32(0xe8,0x80000000-a.getUint32(0xe8,true),true);reflectedZ=true;}
 return {state,calls,reflectedX,reflectedZ,next:'0x42c527'};
}
