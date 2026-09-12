import {originalRandom} from './original-rng.js';
import {originalConditionClass} from './original-condition-class.js';
// 0x424cc3–0x425001: select the first applicable primary reaction. Numeric
// reaction IDs/record fields retain their native meaning without guessed text.
export function originalAutoPrimaryReaction(q,api) {
 let state=structuredClone(q.state);
 const rng=originalRandom(state.seed),events=[];
 const signedCounter=()=>((state.actor.elevationCounter<<24)>>24);
 const result=()=>({...state,events,randomDraws:rng.draws});
 const emit=(kind,value=20)=>{
  state.seed=rng.state;
  const event={actorId:q.actorId,kind,value};events.push(event);
  state=api.emit(event,state);
 };
 const lie=()=>api.shotClassAt(q.terrainCode);
 if(q.followupFlag&&api.shotClassAt(api.terrainAt(q.target.x,q.target.z))>0&&lie()<=0&&
    !q.mode&&!(state.actor.actorFlags&1)){emit(8);return result();}
 if(q.scannedTile&&!q.namedReference){emit(0x14,q.scannedTile);return result();}
 if(q.namedReference){emit(0x16,(q.namedReference-1)|0);return result();}
 if((q.originFlags&0x800)&&originalConditionClass(state.actor.conditionFlags)&&!(q.originFlags&0x4000)){
  emit(0x18);return result();
 }
 if(q.distance<100||q.mode)state.diagnostics=(state.diagnostics&0xfffffffc)>>>0;
 if(state.diagnostics&&state.actor.stateCode!==4){
  if(state.diagnostics&3)emit(0x20|((~state.diagnostics)&1));
  else if(lie()<=0)emit(6);
  return result();
 }
 if(state.actor.hole>1&&state.actor.shotCounter===(q.actorId&1)+1){
  const draw=rng.next(3);
  if(api.holeRecordAt(state.actor.hole)<=draw){emit(0x1d);return result();}
 }
 if(q.conditionLevel&&state.actor.hole>1&&state.actor.shotCounter===1){
  const draw=rng.next(3);
  if(api.holeRecordAt(state.actor.hole)>draw+3){emit(0x1e);return result();}
 }
 if(q.conditionLevel){
  const limit=rng.next(4)+q.conditionLevel*2;
  if(signedCounter()<=limit&&q.distance>100&&lie()<=0&&!q.sceneryTile){
   emit(4);state.actor.elevationCounter=0;return result();
  }
 }
 const limit=rng.next(5)+q.conditionLevel+6;
 if(signedCounter()>limit&&q.distance>40&&!q.sceneryTile){
  const turn=(q.pathHeading-q.aimHeading)&7;
  const kind=signedCounter()>=24?0x1f:turn>=2&&turn<=6?(turn===2||turn===6?5:0x25):0x26;
  emit(kind,q.cueValue);
  state.actor.elevationCounter=signedCounter()<24?10:20;
 }else{
  state.actor.elevationCounter=6;state.seed=rng.state;
 }
 return result();
}
