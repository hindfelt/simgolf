import assert from 'node:assert/strict';
import {createPlaytestCourse} from '../src/simulation/playtest-course.js';
import {build,serialize,restore,update} from '../src/simulation/game.js';

let game=createPlaytestCourse();
assert.ok(build(game,'snack',9,13).ok);
for(let r=11;r<=13;r++)assert.ok(build(game,'path',7,r).ok);
const shots=new Set(),putts=new Set(),flights=new Set(),holes=new Set();
let midPuttReplay=false,midFlightReplay=false,midReleaseReplay=false;
const start=performance.now();
for(let tick=0;tick<144000;tick++){
 update(game,.05);
 for(const v of game.guests){
  if(v.shot?.club!==undefined)shots.add(`${v.id}:${v.holeId}:${v.strokes}`);
  if(v.shot?.nativeFlight){
   flights.add(`${v.id}:${v.holeId}:${v.strokes}`);
   if(!midFlightReplay&&v.shot.time>0){
    const control=structuredClone(game),restored=restore(serialize(game));
    for(let n=0;n<1200;n++){update(control,.05);update(restored,.05);}
    assert.equal(serialize(restored),serialize(control),'Mid-flight reload changed the live resort outcome.');
    midFlightReplay=true;
   }
  }
  if(v.shot?.nativeRelease&&!v.shot.obstruction&&v.shot.time>v.shot.duration&&!midReleaseReplay){
   const control=structuredClone(game),restored=restore(serialize(game));
   for(let n=0;n<1200;n++){update(control,.05);update(restored,.05);}
   assert.equal(serialize(restored),serialize(control),'Mid-release reload changed the live resort outcome.');
   midReleaseReplay=true;
  }
  if(v.shot?.nativePutt){
   putts.add(`${v.id}:${v.holeId}:${v.strokes}`);
   if(!midPuttReplay&&v.shot.nativePutt.state.steps>0){
    const control=structuredClone(game),restored=restore(serialize(game));
    for(let n=0;n<1200;n++){update(control,.05);update(restored,.05);}
    assert.equal(serialize(restored),serialize(control),'Mid-putt reload changed the live resort outcome.');
    midPuttReplay=true;
   }
  }
  if(v.shot)holes.add(v.holeId);
 }
 if(tick%12000===11999)game=restore(serialize(game));
}
const checkpoint=serialize(game),copy=restore(checkpoint);
for(let tick=0;tick<1200;tick++){update(game,.05);update(copy,.05);}
assert.equal(serialize(game),serialize(copy),'A restored run diverged from its source.');
assert.ok(game.stats.rounds>0,'No rounds completed during the soak.');
assert.ok(Number.isFinite(game.cash),'Non-finite resort balance.');
assert.ok(game.holes.every(h=>h.stats.completed>0),'A hole received no completed rounds.');
assert.equal(holes.size,game.holes.length,'A hole received no live shots.');
assert.ok(flights.size>0&&midFlightReplay,'Recovered flight was not exercised.');
assert.ok(midReleaseReplay,'Live ground release and mid-release replay were not exercised.');
assert.ok(putts.size>0&&midPuttReplay,'Recovered putting and mid-putt replay were not exercised.');
assert.ok(game.stats.services>0,'No live facility visits completed.');
assert.ok(game.facilities.find(f=>f.type==='snack').served>0,'The snack facility served no visitors.');
assert.ok(game.ledger.some(e=>e.reason==='Snack bar sale'&&e.amount===(game.liveBehaviorVersion===1?5:3)),'No snack purchase was settled.');
const fees=game.ledger.filter(entry=>entry.reason==='Helicopter landing fee');
assert.ok(fees.length>1,'Repeated helicopter lifecycles were not exercised.');
assert.ok(fees.every(entry=>entry.amount===200),'Incorrect helicopter landing fee.');
console.log(JSON.stringify({simulatedSeconds:game.time,restoreCycles:12,
 elapsedMs:performance.now()-start,checkpointBytes:Buffer.byteLength(checkpoint),
 completedRounds:game.stats.rounds,landingFees:fees.length,replayEqual:true,
 distinctShotKeys:shots.size,distinctPuttKeys:putts.size,holesWithShots:[...holes],
 services:game.stats.services,midPuttReplayEqual:midPuttReplay,
 distinctFlightKeys:flights.size,midFlightReplayEqual:midFlightReplay,midReleaseReplayEqual:midReleaseReplay},null,2));
