import {originalRemarkHistory} from './original-remark-history.js';
import {originalRemarkSelection} from './original-remark-selection.js';
import {originalRemarkResponse} from './original-remark-response.js';
// These event IDs are live bindings. Unknown incidents retain the existing
// one-point policy under a reserved local ID, rather than inventing retail text.
function kindFor(incident){
 if(incident.startsWith('great-shot:'))return 1;
 if(incident.startsWith('tired:'))return 26;
 if(incident.startsWith('steep-path:'))return 43;
 const services={snack:18,bench:27,ballwasher:41,'driving-range':51,'pro-shop':52,'putting-green':53};
 if(incident.startsWith('service:'))return services[incident.split(':')[1]]??250;
 return 250;
}
export function liveReaction(g,v,incident,delta){
 let actor=Uint8Array.from(v.nativeReactions?.actor??new Uint8Array(256));
 actor[0x21]=Math.max(0,g.holes.findIndex(h=>h.id===v.holeId));actor[0x22]=v.strokes??0;
 new DataView(actor.buffer).setInt16(0xa4,v.happiness,true);
 const kind=kindFor(incident);actor=originalRemarkHistory(actor,kind,20).actor;
 const words=new DataView(actor.buffer);
 words.setInt16(0xa6,Math.round(Math.max(v.hunger??0,v.thirst??0)),true);
 words.setInt16(0xaa,Math.round(100-(v.energy??100)),true);
 // The live game has one relaxed difficulty and its own voice assets. Native
 // voice calls retain their packed mutations; existing live comments present them.
 if(kind!==250){
  const selection=originalRemarkSelection({state:{actor,profiles:[0],profileVoiceBytes:[128]},
   kind,actorId:0,voiceBase:0,difficulty:0,value:20,terrainCode:0},(_event,state)=>({state,result:0}));
  actor=selection.state.actor;delta=selection.delta;
 }
 const result=originalRemarkResponse({state:{actor,holeTotal:v.nativeReactions?.total??0,
  remarkCount:0,remarkValue:0,positive:0,negative:0,seed:g.rng,tileFlags:0,tileGrowth:0,worldDirty:0},
  kind,value:20,delta,reactionMode:2,difficulty:0,globalFlags:0,terrainCode:0});
 // Immediate feedback is the live policy (reactionMode 2); history, clamping,
 // signed totals, RNG and negative-reaction growth use the recovered outcome.
 g.rng=result.state.seed;
 v.happiness=new DataView(result.state.actor.buffer).getInt16(0xa4,true);
 v.nativeReactions={actor:Array.from(result.state.actor),total:result.state.holeTotal,growth:result.state.tileGrowth===1};
 return result.delta;
}
export function validateNativeReactions(v){
 const s=v.nativeReactions;if(s===undefined)return;
 if(!s||!Array.isArray(s.actor)||s.actor.length!==256||s.actor.some(x=>!Number.isInteger(x)||x<0||x>255)||
 !Number.isInteger(s.total)||s.total< -32768||s.total>32767||typeof s.growth!=='boolean')throw Error('Invalid native reaction history.');
}
