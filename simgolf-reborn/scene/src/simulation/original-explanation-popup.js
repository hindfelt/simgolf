import {originalRandom} from './original-rng.js';
// Full0x40c7f0: active/pending popup gates, text state and two original RNG draws.
export function originalExplanationPopup(q){
 const state=structuredClone(q.state),priority=q.priority|0;
 for(const key of ['popupActive','popupPending','popupMode'])if(!Number.isInteger(state[key]))throw Error('Original popup control state is unavailable.');
 if(((state.popupActive&255)||state.popupPending!==0)&&priority<=0||state.popupMode===3)return {state,result:0,randomDraws:0};
 if(typeof state.sourceText!=='string'||!Number.isInteger(q.difficulty))throw Error('Original popup text or difficulty is unavailable.');
 const text=state.sourceText.split('\0',1)[0];
 state.popupText=text;state.popupPending=0;state.popupActive=1;state.popupStyle=q.style>>>0;state.popupActor=q.actorId|0;
 state.popupLifetime=Math.floor(text.length/((q.difficulty|0)!==0?4:3))+16;
 if(priority<0)state.popupDuration=(-priority)|0;
 const rng=originalRandom(state.seed);state.popupX=rng.next(600);state.popupY=rng.next(200)+200;state.seed=rng.state;
 return {state,result:1,randomDraws:rng.draws};
}
