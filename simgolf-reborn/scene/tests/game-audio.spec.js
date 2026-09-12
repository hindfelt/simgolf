import {test,expect} from '@playwright/test';
import {createShotSoundTracker} from '../src/shot-sounds.js';
const golfer=(strokes=1,putt=false)=>({id:1,roundId:'round-1',holeId:'hole-1',strokes,shot:{from:{x:2,z:3},time:0,putt}});
test('new drives and putts sound once; restored shots and reconnect gaps stay silent',()=>{
 const t=createShotSoundTracker(),g={time:1,guests:[golfer()]};expect(t.observe(g)).toEqual([]);
 g.time+=.05;expect(t.observe(g)).toEqual([]);g.guests=[];t.observe(g);g.guests=[golfer(2)];g.time+=.05;expect(t.observe(g)).toHaveLength(1);expect(t.observe(g)).toEqual([]);
 g.guests=[golfer(3,true)];g.time+=.05;expect(t.observe(g)[0].kind).toBe('putt');
 g.guests=[golfer(4)];g.time+=5;expect(t.observe(g)).toEqual([]);
 t.reset();expect(t.observe(g)).toEqual([]);g.time=0;expect(t.observe(g)).toEqual([]);
});
test('observation cannot change saved course state or game randomness',()=>{
 const t=createShotSoundTracker(),g={time:1,rng:42,guests:[golfer()]};const before=JSON.stringify(g);t.observe(g);expect(JSON.stringify(g)).toBe(before);
});
test('real audio decodes after a gesture, plays once, obeys volume and links shipped credits',async({page})=>{
 await page.addInitScript(()=>{
  window.audioStarts=0;window.audioDecoded=0;window.audioStops=0;
  const Native=window.AudioContext;
  window.AudioContext=class extends Native{
   async decodeAudioData(data){const result=await super.decodeAudioData(data);window.audioDecoded++;return result;}
   createBufferSource(){const source=super.createBufferSource(),start=source.start.bind(source);source.start=(...args)=>{window.audioStarts++;return start(...args);};const stop=source.stop.bind(source);source.stop=(...args)=>{window.audioStops++;return stop(...args);};return source;}
  };
 });
 await page.goto('/audio/credits.html');
 await page.evaluate(async()=>{const {createGameAudio}=await import('/src/game-audio.js');window.effects=createGameAudio(document.body);window.audioState={time:0,guests:[]};window.effects.update(window.audioState,()=>({x:.5,y:.5,depth:0}));});
 await page.locator('h1').click();await expect.poll(()=>page.evaluate(()=>window.audioDecoded)).toBe(3);
 await page.evaluate(()=>{window.audioState.time=.05;window.audioState.guests=[{id:1,roundId:'r',holeId:'h',strokes:1,shot:{from:{x:0,z:0},time:0,putt:false}}];window.effects.update(window.audioState,()=>({x:.5,y:.5,depth:0}));window.effects.update(window.audioState,()=>({x:.5,y:.5,depth:0}));});
 expect(await page.evaluate(()=>window.audioStarts)).toBe(1);
 await page.evaluate(()=>{window.audioState.helicopter={pad:{x:0,z:0},phase:'arriving',since:0};window.effects.update(window.audioState,()=>({x:.5,y:.5,depth:0}));window.effects.update(window.audioState,()=>({x:.5,y:.5,depth:0}));});
 expect(await page.evaluate(()=>window.audioStarts)).toBe(2);
 await page.evaluate(()=>{window.audioState.helicopter.phase='parked';window.effects.update(window.audioState,()=>({x:.5,y:.5,depth:0}));});
 expect(await page.evaluate(()=>window.audioStops)).toBeGreaterThan(0);
 await page.getByRole('slider',{name:'Effects volume'}).fill('0');
 await page.evaluate(()=>{window.audioState.time=.1;window.audioState.guests[0].strokes++;window.effects.update(window.audioState,()=>({x:.5,y:.5,depth:0}));});
 expect(await page.evaluate(()=>window.audioStarts)).toBe(2);expect(await page.evaluate(()=>localStorage.getItem('fairway-baron.effects-volume'))).toBe('0');
 await expect(page.getByRole('link',{name:'Sound credits',exact:true})).toHaveAttribute('href','/audio/credits.html');
 await page.evaluate(()=>window.effects.dispose());
});
test('a live golfer produces a single contact event when its simulated shot starts',async()=>{
 const {createGame,build,openHole,update}=await import('../src/simulation/game.js');
 const g=createGame();build(g,'tee',7,20);build(g,'green',20,20);openHole(g);
 const tracker=createShotSoundTracker();tracker.observe(g);let events=[];
 for(let i=0;i<2000&&!events.length;i++){update(g,.05);events=tracker.observe(g);}
 expect(events).toHaveLength(1);expect(g.guests.some(v=>v.shot&&!v.shot.putt)).toBe(true);
 expect(tracker.observe(g)).toHaveLength(0);
});
test('helicopter audio power follows unloading, parking and boarding without changing the visit',async()=>{
 const {helicopterPose}=await import('../src/rendering/helicopter-pose.js');
 const h={pad:{x:3,z:5},phase:'unloading',since:10};const before=JSON.stringify(h);
 expect(helicopterPose(h,10).power).toBe(1);expect(helicopterPose(h,12.5).power).toBe(.5);expect(helicopterPose(h,15).power).toBe(0);expect(JSON.stringify(h)).toBe(before);
 h.phase='parked';expect(helicopterPose(h,100).power).toBe(0);h.phase='boarding';h.since=100;expect(helicopterPose(h,100).power).toBe(0);expect(helicopterPose(h,105).power).toBe(1);
});
