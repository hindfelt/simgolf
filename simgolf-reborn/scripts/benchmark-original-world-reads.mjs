import {performance} from 'node:perf_hooks';
import {originalAudiblePlannerBinding} from '../scene/src/simulation/original-audible-planner-binding.js';
import {originalCurrentWorldShotMap} from '../scene/src/simulation/original-world-shot-map.js';
import {originalTerrainMetadata} from '../scene/src/simulation/original-terrain-metadata.js';
const state={actorId:0,actors:Array.from({length:152},()=>new Uint8Array(256)),holes:Array.from({length:20},()=>new Uint8Array(520)),actorTail:new Uint8Array(8),holePrefix:new Uint8Array(8),phaseCounter:1,globalFlags:0,terrain:new Uint8Array(2500).fill(2),heights:new Uint8Array(2601),tileFlags:new Uint16Array(2500),metadata:Array.from({length:23},(_,i)=>originalTerrainMetadata(i)),derived:{edgeMasks:new Uint8Array(2500),surfaceHeights:new Int8Array(2500),directionHeights:new Int8Array(20000)}};
const b=originalAudiblePlannerBinding(state,{context:{},dependencies:{},remarkFor:()=>{throw Error('No reaction in read benchmark');}});
const results={};
for(const [name,map] of [['uncached',originalCurrentWorldShotMap(b.effects.readWorld)],['ownedGeneration',b.dependencies.map]]){
 let sum=0;const start=performance.now();for(let i=0;i<10000;i++)sum+=map.planning.terrainAt(i%50,(i*7)%50);
 results[name]={reads:10000,elapsedMs:performance.now()-start,sum};
}
if(results.uncached.sum!==results.ownedGeneration.sum)throw Error('Read results differ');
console.log(JSON.stringify(results,null,2));
