import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalRemarkWorldSnapshot,originalApplyRemarkWorld} from '../src/simulation/original-remark-world.js';
import {originalRemarkOutcome} from '../src/simulation/original-remark-outcome.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-remark-outcome.json',import.meta.url)));
function worldFor(q){
 const s=q.state,hole=new Uint8Array(520),h=new DataView(hole.buffer);
 h.setInt16(0x160,s.holeTotal,true);h.setUint16(0xe0+q.kind*2,s.remarkCount,true);h.setUint16(0x174+q.kind*2,s.remarkValue,true);
 const world={actors:{0:Uint8Array.from(s.actor)},holeRecords:{1:hole,2:new Uint8Array(520).fill(77)},seed:s.seed,worldDirty:s.worldDirty,difficulty:q.difficulty,reactionMode:q.reactionMode,globalFlags:q.globalFlags,selectedActorId:-1,terrain:new Uint8Array(64),tileFlags:new Uint16Array(64),tileGrowth:new Uint8Array(64),positive:new Uint8Array(64),negative:new Uint8Array(64)};
 world.terrain[53]=q.terrainCode;for(const key of ['tileFlags','tileGrowth','positive','negative'])world[key][53]=s[key];return world;
}
test('packed world read and write preserve native-verified reaction results',()=>{
 for(const [q,expected] of rows){
  const world=worldFor(q),before=structuredClone(world),snapshot=originalRemarkWorldSnapshot(world,0,q.kind);
  expect(snapshot.holeIndex).toBe(1);expect(snapshot.tileIndex).toBe(53);expect(snapshot.context.state).toEqual({...q.state,actor:Uint8Array.from(q.state.actor)});
  const result=originalRemarkOutcome({...q,...snapshot.context});
  expect(result).toEqual({...expected,state:{...expected.state,actor:Uint8Array.from(expected.state.actor)}});
  const written=originalApplyRemarkWorld(world,snapshot,result);
  expect(originalRemarkWorldSnapshot(written,0,q.kind).context.state).toEqual(result.state);
  expect(written.holeRecords[2]).toEqual(world.holeRecords[2]);expect(written.terrain).toEqual(world.terrain);expect(world).toEqual(before);
 }
});
test('write-back refuses a stale tile target and inconsistent shared counters',()=>{
 const q=rows[0][0],world=worldFor(q),snapshot=originalRemarkWorldSnapshot(world,0,q.kind),result=originalRemarkOutcome({...q,...snapshot.context});
 new DataView(result.state.actor.buffer).setInt32(4,4096,true);
 expect(()=>originalApplyRemarkWorld(world,snapshot,result)).toThrow('location changed');
 const shared={...q,kind:64,state:{...q.state,remarkCount:q.state.holeTotal&65535}},w=worldFor(shared),snap=originalRemarkWorldSnapshot(w,0,64);
 expect(()=>originalApplyRemarkWorld(w,snap,{state:{...snap.context.state,remarkCount:(snap.context.state.remarkCount+1)&65535}})).toThrow('disagree');
});
