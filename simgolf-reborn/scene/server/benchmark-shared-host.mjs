import {performance} from 'node:perf_hooks';
import {createPlaytestCourse} from '../src/simulation/playtest-course.js';
import {createSession} from '../src/simulation/session.js';
import {createGame,build,addHole,openHole,hire,restore,serialize} from '../src/simulation/game.js';
const large=process.argv.includes('--large');
function largeCourse(){
 const game=createGame(),ok=result=>{if(!result.ok)throw Error(result.message);};
 // Same legally built course exercised by the full-round regression fixture.
 const layout=[[13,2,20,2],[24,2,24,9],[27,2,34,2],[30,2,30,9],[38,2,38,9],[16,4,16,11],[15,7,10,12],[34,7,34,14],[42,7,42,14],[20,9,20,16],[3,10,3,17],[34,10,29,15],[20,12,15,17],[3,13,8,18],[25,13,25,20],[38,15,33,20],[25,16,20,21],[37,18,37,25]];
 for(const [i,[tc,tr,gc,gr]] of layout.entries()){
  if(i)ok(addHole(game));const id=game.holes[i].id;
  ok(build(game,'tee',tc,tr,1,id));ok(build(game,'green',gc,gr,1,id));ok(openHole(game,id));
 }
 for(let i=0;i<16;i++)ok(hire(game,i<12?'technician':'consultant'));
 return game;
}
const game=large?largeCourse():createPlaytestCourse(),host=createSession(game),samples=[];
for(let minute=0;minute<=(large?25:20);minute++){
 if(minute)host.stepTicks(1200);
 if(!large&&minute!==20)continue;
 const baseline=serialize(game),measurements=[];
 for(let i=0;i<(large?20:30);i++){
  const start=performance.now(),copy=restore(baseline);createSession(copy).stepTicks(120);serialize(copy);
  measurements.push(performance.now()-start);
 }
 measurements.sort((a,b)=>a-b);
 samples.push({minute,visitors:game.guests.length,staff:game.staff.length,rounds:game.rounds.length,snapshotBytes:Buffer.byteLength(baseline),samples:measurements.length,medianMs:measurements[Math.floor(measurements.length/2)],p95Ms:measurements[Math.ceil(measurements.length*.95)-1],maxMs:measurements.at(-1)});
}
console.log(JSON.stringify({scope:'Local Node elapsed-time CPU proxy; excludes D1/network and is not hosted CPU accounting',holes:game.holes.length,batchTicks:120,samples},null,2));
