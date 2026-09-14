import {originalShotAccounting} from './original-shot-accounting.js';
import {originalLandingReactions} from './original-landing-reactions.js';
import {originalHazardDrop} from './original-hazard-drop.js';
import {originalPostLanding} from './original-post-landing.js';
// Continuous stopped-ball tail, 0x42ca9d through the actor's skip exit.
export function originalStoppedShot(snapshot,resolve){
 const accounting=originalShotAccounting(snapshot);
 const locals={landingTile:accounting.tile,landingTerrain:accounting.terrain};
 const landing=originalLandingReactions({...accounting.state,...locals},resolve);
 const hazard=landing.next==='0x42ceb2'?originalHazardDrop({...landing.state,...locals},resolve):{state:landing.state,calls:[],penalty:false,candidates:0};
 const post=originalPostLanding({...hazard.state,...locals,priorMood:landing.priorMood},resolve);
 return {...post,calls:[...landing.calls,...hazard.calls,...post.calls],penalty:hazard.penalty,candidates:hazard.candidates,driveDistance:accounting.driveDistance,greenInRegulation:accounting.greenInRegulation};
}
