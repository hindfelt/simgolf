import {originalShotClub} from './original-shot-club.js';
import {RULES} from './rules.js';
// Explicit boundary between the playable world's metres-like render units and
// the recovered launch selector's integer yards. This is a live adapter, not a
// claim that packed native actors or the complete native physics are installed.
export function liveOriginalLaunch({distance,range,surface,putt}){
 const yards=RULES.yardsPerUnit;
 const selected=originalShotClub({distance:Math.max(0,Math.round(distance*yards)),range:Math.max(1,Math.min(330,Math.round(range*yards))),terrainCode:surface==='tee'?0:surface==='green'?1:2,explicitTarget:false,mode:0,actorFlags:putt?0:1});
 return {club:selected.club,strengthYards:selected.strength,carry:putt?distance:Math.min(distance,selected.strength/yards)};
}
