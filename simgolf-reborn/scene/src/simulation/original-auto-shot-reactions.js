import {originalProfileGroup} from './original-profile-group.js';
// 0x425001–0x425239 (the active-reaction exit goes directly to 0x425243).
// Actor/partner state is explicit. Remark effects run synchronously before
// subsequent gates, just as in the executable. Profile groups use 0x46c140.
export function originalAutoShotReactions(q,api) {
 let state=structuredClone(q.state);
 const events=[];
 const emit=(kind,value=20,actorId=q.actorId)=>{
  const event={actorId,kind,value};events.push(event);state=api.emit(event,state);
 };
 state.actor.actorFlags=(state.actor.actorFlags&0xffffff9f)>>>0;
 if(state.actor.marker!==q.previousMarker||state.actor.reaction)return {state,events};
 if(q.sceneryTile&&api.shotClassAt(q.terrainCode)<1){
  emit(0x1c,q.sceneryTile);return {state,events};
 }
 if(q.curveArgument===1)emit(0x37);
 else if(q.curveArgument===-1)emit(0x38);
 if((state.actor.actorFlags&0x80)&&q.distance>100)emit(0x39);
 if(state.actor.stateCode===4)emit(state.actor.shotCounter?0x3c:9,q.terrainCode);
 if(q.distance>75){
  const threshold=30<<((state.actor.skillMask&2)?15:16);
  if(state.actor.angularOffset>threshold)state.actor.actorFlags=(state.actor.actorFlags|0x20)>>>0;
  if(state.actor.angularOffset< -threshold)state.actor.actorFlags=(state.actor.actorFlags|0x40)>>>0;
 }
 if(state.actor.marker===q.previousMarker&&!state.actor.reaction&&!state.actor.shotCounter&&
    api.profileHoleMarkAt(state.actor.profileIndex,state.actor.hole)&&!state.actor.actorClass)emit(0x3b);
 if(state.actor.marker===q.previousMarker&&state.actor.shotCounter===3&&
    ((state.actor.hole+q.actorId)&1)===0&&!state.actor.actorClass&&!state.partner.actorClass){
  const other=q.actorId^1;
  const otherGroup=originalProfileGroup(other,api),ownGroup=originalProfileGroup(q.actorId,api);
  if(ownGroup===otherGroup&&!state.partner.reaction&&!state.actor.reaction){
   emit(0x30);emit(0x31,20,other);
   state.partner.reaction=(state.partner.reaction+1)&255;
  }
 }
 return {state,events};
}
