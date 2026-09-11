import {performance} from 'node:perf_hooks';
import {createPlaytestCourse} from '../src/simulation/playtest-course.js';
import {createSession} from '../src/simulation/session.js';
import {restore,serialize} from '../src/simulation/game.js';
const game=createPlaytestCourse(),host=createSession(game);
for(let i=0;i<20;i++)host.stepTicks(1200);
const baseline=serialize(game),measurements=[];
for(let i=0;i<30;i++){
 const start=performance.now(),copy=restore(baseline);createSession(copy).stepTicks(120);serialize(copy);
 measurements.push(performance.now()-start);
}
measurements.sort((a,b)=>a-b);
console.log(JSON.stringify({scope:'Local Node CPU proxy; excludes D1/network, not a hosted CPU-limit measurement',holes:game.holes.length,visitors:game.guests.length,simulatedMinutes:game.time/60,batchTicks:120,snapshotBytes:Buffer.byteLength(baseline),samples:measurements.length,medianMs:measurements[15],p95Ms:measurements[28],maxMs:measurements[29]},null,2));
