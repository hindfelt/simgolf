const view=r=>new DataView(r.buffer,r.byteOffset,r.byteLength);
function records(world,actorId,kind){
 const actor=world.actors?.[actorId];if(!(actor instanceof Uint8Array)||actor.length!==256)throw Error('Original reaction actor is unavailable.');
 if(!Number.isInteger(kind)||kind<0||kind>65)throw Error('Original reaction kind is invalid.');
 const a=view(actor),holeIndex=(actor[0x21]<<24)>>24,tileIndex=(a.getInt32(0,true)>>10)*50+(a.getInt32(4,true)>>10),hole=world.holeRecords?.[holeIndex];
 if(!(hole instanceof Uint8Array)||hole.length!==520)throw Error('Original reaction hole is unavailable.');
 for(const [key,Type] of [['terrain',Uint8Array],['tileFlags',Uint16Array],['tileGrowth',Uint8Array],['positive',Uint8Array],['negative',Uint8Array]])if(!(world[key] instanceof Type)||tileIndex<0||tileIndex>=world[key].length)throw Error(`Original reaction ${key} is unavailable.`);
 return {actor,hole,holeIndex,tileIndex};
}
// Read after speech/preamble effects, at the outcome boundary. Tile addressing
// is the executable's x*50+z layout, with signed fixed-point coordinates.
export function originalRemarkWorldSnapshot(world,actorId,kind){
 const {actor,hole,holeIndex,tileIndex}=records(world,actorId,kind),h=view(hole);
 for(const key of ['seed','worldDirty','difficulty','reactionMode','selectedActorId','globalFlags'])if(!Number.isInteger(world[key]))throw Error(`Original reaction ${key} is unavailable.`);
 return {actorId,kind,holeIndex,tileIndex,context:{difficulty:world.difficulty,reactionMode:world.reactionMode,selectedActorId:world.selectedActorId,globalFlags:world.globalFlags,terrainCode:world.terrain[tileIndex],state:{actor:actor.slice(),seed:world.seed,worldDirty:world.worldDirty,holeTotal:h.getInt16(0x160,true),remarkCount:h.getUint16(0xe0+kind*2,true),remarkValue:h.getUint16(0x174+kind*2,true),tileFlags:world.tileFlags[tileIndex],tileGrowth:world.tileGrowth[tileIndex],positive:world.positive[tileIndex],negative:world.negative[tileIndex]}}};
}
// Apply one outcome atomically to a cloned packed world. A changed location
// requires a fresh snapshot, rather than writing counters to the wrong tile.
export function originalApplyRemarkWorld(world,snapshot,reaction){
 const result=structuredClone(world),s=reaction.state,{actorId,kind}=snapshot;
 if(!(s.actor instanceof Uint8Array)||s.actor.length!==256)throw Error('Original reaction result actor is unavailable.');
 result.actors[actorId]=s.actor.slice();const {hole,holeIndex,tileIndex}=records(result,actorId,kind);
 if(holeIndex!==snapshot.holeIndex||tileIndex!==snapshot.tileIndex)throw Error('Original reaction location changed; refresh the outcome snapshot.');
 if(kind===64&&(s.holeTotal&65535)!==s.remarkCount)throw Error('Aliased original hole total and remark count disagree.');
 const h=view(hole);h.setInt16(0x160,s.holeTotal,true);h.setUint16(0xe0+kind*2,s.remarkCount,true);h.setUint16(0x174+kind*2,s.remarkValue,true);
 result.seed=s.seed;result.worldDirty=s.worldDirty;result.tileFlags[tileIndex]=s.tileFlags;result.tileGrowth[tileIndex]=s.tileGrowth;result.positive[tileIndex]=s.positive;result.negative[tileIndex]=s.negative;
 return result;
}

// Commit the complete routine, using the final popup seed rather than the
// intermediate outcome seed. Only outcome execution writes tile/hole counters.
// snapshot must be the actual outcome-boundary snapshot, not the entry snapshot.
export function originalApplyCompleteRemarkWorld(world,snapshot,remark){
 let result;
 if(remark.reaction?.next==='continue'){
  if(!snapshot||snapshot.kind!==remark.kind)throw Error('Original completed remark outcome snapshot is unavailable.');
  result=originalApplyRemarkWorld(world,snapshot,remark.reaction);
 }else result=structuredClone(world);
 const s=remark.state;
 // These fields belong to dispatch/explanation. Do not copy scalar reaction
 // counters onto the world's typed map arrays or stale whole-map snapshots.
 for(const key of ['actors','sourceText','remarkStyle','redirected','priority','displayText','requestValues','resourceCacheIndex','resourceCache','seed','originalClock','lastExplanationClock','explanationMaskLow','explanationMaskHigh','interfaceFlags','popupActive','popupPending','popupMode','popupText','popupStyle','popupActor','popupLifetime','popupDuration','popupX','popupY']){
  if(Object.hasOwn(s,key))result[key]=structuredClone(s[key]);
 }
 if(remark.reaction&&Object.hasOwn(remark.reaction.state,'worldDirty'))result.worldDirty=remark.reaction.state.worldDirty;
 return result;
}
