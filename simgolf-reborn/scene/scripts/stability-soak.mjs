import assert from 'node:assert/strict';
import {createPlaytestCourse} from '../src/simulation/playtest-course.js';
import {serialize,restore,update} from '../src/simulation/game.js';

let game=createPlaytestCourse();
const start=performance.now();
for(let tick=0;tick<144000;tick++){
 update(game,.05);
 if(tick%12000===11999)game=restore(serialize(game));
}
const checkpoint=serialize(game),copy=restore(checkpoint);
for(let tick=0;tick<1200;tick++){update(game,.05);update(copy,.05);}
assert.equal(serialize(game),serialize(copy),'A restored run diverged from its source.');
assert.ok(game.stats.rounds>0,'No rounds completed during the soak.');
assert.ok(Number.isFinite(game.cash),'Non-finite resort balance.');
assert.ok(game.holes.every(h=>h.stats.completed>0),'A hole received no completed rounds.');
const fees=game.ledger.filter(entry=>entry.reason==='Helicopter landing fee');
assert.ok(fees.length>1,'Repeated helicopter lifecycles were not exercised.');
assert.ok(fees.every(entry=>entry.amount===200),'Incorrect helicopter landing fee.');
console.log(JSON.stringify({simulatedSeconds:game.time,restoreCycles:12,
 elapsedMs:performance.now()-start,checkpointBytes:Buffer.byteLength(checkpoint),
 completedRounds:game.stats.rounds,landingFees:fees.length,replayEqual:true},null,2));
