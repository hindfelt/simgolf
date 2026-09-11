// 0x425239–0x425372: club history and final automatic-shot remark requests.
// emit must execute the remark's state effects and return the resulting actor.
// Merely recording UI text is insufficient: later gates reread the actor.
export function originalAutoLaunchHistory(q,map,emit) {
 let actor=structuredClone(q.actor);
 const comparisonMarker=actor.reaction?-1:q.previousMarker;
 const events=[];
 const remark=(kind,value)=>{
  const event={actorId:q.actorId,kind,value};events.push(event);
  actor=emit(event,actor);
 };
 if(actor.marker===comparisonMarker&&actor.hole>1&&actor.club<13&&
    !(actor.usedClubs&(1<<actor.club)))remark(0x36,actor.club);
 actor.usedClubs=(actor.usedClubs|(1<<actor.club))&65535;
 if(actor.marker===comparisonMarker){
  let targetHeight=map.heightAt(actor.target.x,actor.target.z);
  let originHeight=map.heightAt(q.origin.x,q.origin.z);
  if(originHeight>targetHeight)remark(0x2e,20);
  // Original rereads both heights even if the downhill remark changed state.
  targetHeight=map.heightAt(actor.target.x,actor.target.z);
  originHeight=map.heightAt(q.origin.x,q.origin.z);
  if(originHeight<targetHeight)remark(0x2d,20);
 }
 if(actor.marker===comparisonMarker&&!actor.actorClass&&!actor.reaction&&
    q.terrainCode===1&&((actor.shotCounter+q.actorId+actor.hole)&3)===0)
  remark(0x3e,20);
 return {actor,comparisonMarker,events};
}
