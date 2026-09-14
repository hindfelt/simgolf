// Reproducible diagnostic, not a parity test or a new gameplay rule.
import {writeFileSync} from 'node:fs';
import {createPlaytestCourse} from '../scene/src/simulation/playtest-course.js';
import {update,takeShot} from '../scene/src/simulation/game.js';
import {originalPuttLaunch} from '../scene/src/simulation/original-putt-strength.js';
const samples=[];
for(const yards of [2,5,10,20])for(const seed of [1,1234,90210]){
 const g=createPlaytestCourse();g.nextHelicopter=10000;
 for(let i=0;i<200&&!g.guests.length;i++)update(g,.1);
 const v=g.guests[0];if(!v)throw Error('No diagnostic golfer');
 g.elevation={};g.facilities=[];g.bridges={};g.starterBridgeRemoved=true;
 const cup=g.holes[0].green;
 for(const cell of Object.values(g.tiles)){cell.type='green';cell.holeId=v.holeId;}
 // Live distance labels use four yards per world unit.
 v.ball={x:cup.x,z:cup.z-yards/4};v.phase='address';v.shot=null;g.rng=seed;
 const result=takeShot(g,v,cup);if(!result.ok||!v.shot.putt)throw Error('Diagnostic is not a putt');
 samples.push({yards,seed,live:{durationSeconds:v.shot.duration,endDistanceFromCup:Math.hypot(v.shot.end.x-cup.x,v.shot.end.z-cup.z),apex:v.shot.apex,curve:v.shot.curve},recoveredColdCacheLaunch:originalPuttLaunch({distanceYards:yards,seed})});
}
const result={scope:'Flat ordinary-green NPC diagnostic. Recovered strength uses a seed at its final draw, not a complete matching original shot. Do not compare equal seed values as equivalent full RNG histories.',samples};
const output=new URL('../references/observations/live-putting-gap.json',import.meta.url);writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({samples:samples.length,liveDurations:[...new Set(samples.map(s=>s.live.durationSeconds))],maxEndDistance:Math.max(...samples.map(s=>s.live.endDistanceFromCup))}));
