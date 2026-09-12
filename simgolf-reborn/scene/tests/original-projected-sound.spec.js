import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalPositionalSoundAt} from '../src/simulation/original-positional-sound.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-projected-sound.json',import.meta.url)));
test('uninterrupted original projection and sound preserve terrain calls, playback and RNG',()=>{
 const combinations=new Set();let played=0,suppressed=0;
 for(const [q,expected] of rows){
  combinations.add(`${q.camera.rotation}:${q.terrain.flags}:${q.camera.magnify}`);const before=structuredClone(q),calls=[];
  const map={flagsAt:()=>q.terrain.flags,storedHeight:()=>q.terrain.stored,objectHeight:(c,r)=>{calls.push(['object',c,r]);return q.terrain.object;},cornerHeight:(c,r,d)=>{calls.push(['corner',c,r,d]);return q.terrain.corners[d];}};
  const result=originalPositionalSoundAt(q,map,(_event,state)=>{if(q.mutate){state.seed=777;state.queued=99;state.sequenceIndex=123;}return state;});
  expect({...result,calls}).toEqual(expected);expect(q).toEqual(before);if(result.events.length)played++;else suppressed++;
 }
 expect(combinations.size).toBe(48);expect(played).toBeGreaterThan(0);expect(suppressed).toBeGreaterThan(0);
});
test('authoritative camera controls whether positional sound consumes shared randomness',()=>{
 const q={x:20*1024+512,z:20*1024+512,soundId:48,duration:0,zoom:false,state:{seed:2002,queued:0,sequenceIndex:0},camera:{cameraX:20,cameraZ:20,scale:4,width:800,height:600,rotation:0,heightScale:16,magnify:false}};
 const visible=originalPositionalSoundAt(q,{flagsAt:()=>8},(_event,state)=>state);
 expect(visible.randomDraws).toBe(1);expect(visible.events).toHaveLength(1);
 const outside=originalPositionalSoundAt({...q,camera:{...q.camera,cameraX:100}},{flagsAt:()=>{throw Error('Culled point must not query terrain');}},()=>{throw Error('Culled sound must not play');});
 expect(outside).toEqual({state:q.state,events:[],randomDraws:0});
});
