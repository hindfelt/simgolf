import {originalAutoScenery} from './original-auto-scenery.js';
import {originalAutoLaunchGround} from './original-auto-launch-ground.js';
import {originalAutoPrimaryReaction} from './original-auto-primary-reaction.js';
import {originalAutoShotReactions} from './original-auto-shot-reactions.js';
import {originalAutoLaunchHistory} from './original-auto-launch-history.js';
// Automatic-only middle, 0x424988–0x425372. Entry already has a selected
// club/launch. Remarks are synchronous state transitions supplied by effects.
// The common launch tail still follows this result.
export function originalAutoLaunchMiddle(q,map,effects) {
 let state=structuredClone(q.state);
 const previousMarker=state.actor.marker,events=[];
 let randomDraws=0,samples=0;
 if(state.actor.club!==13){
  const sampled=originalAutoScenery({...q,state:{seed:state.seed,holeCounter:state.holeCounter,
   scannedTile:state.scannedTile,sceneryTile:state.sceneryTile,namedReference:state.namedReference,pathHeading:state.pathHeading}},map);
  ({randomDraws,samples}=sampled);
  const {randomDraws:ignoredDraws,samples:ignoredSamples,...updated}=sampled;
  state={...state,...updated};
 }
 const ground=originalAutoLaunchGround({...q,club:state.actor.club,target:state.actor.target,
  speed:state.speed,elevationCounter:state.actor.elevationCounter},state.cache,map);
 state={...state,speed:ground.speed,cache:ground.cache,
  actor:{...state.actor,elevationCounter:ground.elevationCounter}};
 const api={...map,...effects};
 const primary=originalAutoPrimaryReaction({...q,state,target:state.actor.target,
  scannedTile:state.scannedTile,sceneryTile:state.sceneryTile,namedReference:state.namedReference},api);
 const {events:primaryEvents,randomDraws:primaryDraws,...primaryState}=primary;
 state=primaryState;events.push(...primaryEvents);randomDraws+=primaryDraws;
 const reactions=originalAutoShotReactions({...q,state,previousMarker,sceneryTile:state.sceneryTile},api);
 state=reactions.state;events.push(...reactions.events);
 const history=originalAutoLaunchHistory({...q,actor:state.actor,previousMarker},map,(event,actor)=>{
  state=effects.emit(event,{...state,actor});return state.actor;
 });
 state={...state,actor:history.actor};events.push(...history.events);
 return {state,events,randomDraws,samples};
}
