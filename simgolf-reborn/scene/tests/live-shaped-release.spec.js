import {test,expect} from '@playwright/test';
import {createGame,build,startPractice,takeShot,serialize,restore,update} from '../src/simulation/game.js';
import {shotPreview} from '../src/simulation/shot-preview.js';
import {liveOriginalRelease} from '../src/simulation/live-original-release.js';
import {liveOriginalFlight} from '../src/simulation/live-original-flight.js';
function course(){const g=createGame();build(g,'tee',7,20);build(g,'green',22,10);startPractice(g);return g;}
for(const technique of ['straight','draw','fade','punch','backspin'])test(`${technique} shares motion with its preview and replays through release`,()=>{
 const g=course(),before=serialize(g),aim=g.holes[0].green;
 const preview=shotPreview(g,aim,technique);expect(serialize(g)).toBe(before);
 expect(takeShot(g,g.pro,aim,technique).ok).toBe(true);
 expect(g.pro.shot.nativeFlight).toBeTruthy();expect(g.pro.shot.nativeRelease).toBeTruthy();
 expect(preview.end).toEqual(g.pro.shot.end);
 const duration=g.pro.shot.duration;
 for(let i=0;i<Math.ceil(duration/.05)+2;i++)update(g,.05);
 const saved=restore(serialize(g));
 for(let i=0;i<700;i++){update(g,.05);update(saved,.05);}
 expect(g.pro.shot).toBeNull();expect(serialize(saved)).toBe(serialize(g));
});
test('native draw and fade bend to opposite sides; punch flies lower than a straight shot',()=>{
 const flight=t=>liveOriginalFlight({liveFlightVersion:2},{x:0,z:0},{x:0,z:-20},20,40,'tee',()=>0,{x:0,z:-20},t);
 const draw=flight('draw'),fade=flight('fade'),straight=flight('straight'),punch=flight('punch');
 const mid=f=>f.samples[Math.floor(f.samples.length/2)].x;
 expect(mid(draw)).toBeGreaterThan(0);expect(mid(fade)).toBeLessThan(0);
 expect(Math.max(...punch.samples.map(p=>p.lift))).toBeLessThan(Math.max(...straight.samples.map(p=>p.lift)));
});
const impact={x:0,z:0,height:0,verticalSpeed:0,speed:3000,heading:0x40000000,angularOffset:0};
const options={heightAt:()=>0,blocked:()=>false,outOfBounds:()=>false};
test('release responds to crossed turf and sweeps narrow water and boundaries',()=>{
 const roll=surfaceAt=>liveOriginalRelease({x:0,z:0},impact,{...options,surfaceAt});
 const firm=roll(()=> 'firm'),rough=roll(()=> 'rough'),sand=roll(p=>p.x>.5?'sand':'firm');
 expect(firm.end.x).toBeGreaterThan(rough.end.x);expect(sand.end.x).toBeLessThan(firm.end.x);
 const water=roll(p=>p.x>.2&&p.x<.3?'water':'firm');expect(water.water).toBe(true);expect(water.end.x).toBeLessThan(.3);
 const ob=liveOriginalRelease({x:0,z:0},impact,{...options,surfaceAt:()=> 'firm',outOfBounds:p=>p.x>.2});
 expect(ob.end.x).toBeLessThan(.3);
 const trunk=liveOriginalRelease({x:0,z:0},impact,{...options,surfaceAt:()=> 'firm',blocked:(_a,b)=>b.x>.2});
 expect(trunk.end.x).toBeLessThanOrEqual(.2);
});
test('version one keeps its previous motion and invalid release samples reject on restore',()=>{
 const g=course();g.liveFlightVersion=1;takeShot(g,g.pro,g.holes[0].green);
 expect(g.pro.shot.nativeFlight).toBeTruthy();expect(g.pro.shot.nativeRelease).toBeUndefined();
 const old=restore(serialize(g));expect(old.liveFlightVersion).toBe(1);
 const fresh=course();takeShot(fresh,fresh.pro,fresh.holes[0].green);
 fresh.pro.shot.nativeRelease.samples[0].x+=1;
 expect(()=>restore(serialize(fresh))).toThrow(/release/);
});

test('contour putting changes motion on slopes and remains identical after reload',async()=>{
 const {startLiveOriginalPutt,stepLiveOriginalPutt}=await import('../src/simulation/live-original-putting.js');
 function run(slope){
  const g={liveFlightVersion:2,rng:1234,time:0},v={ball:{x:0,z:0},pro:true},cup={x:3,z:0};
  const context={lie:()=> 'green',height:(_g,x)=>x*slope,skill:0};
  const p=startLiveOriginalPutt(g,v,cup,context),shot={nativePutt:p};
  const points=[];
  for(let i=0;i<20;i++){g.time+=.05;points.push(stepLiveOriginalPutt(g,shot,.05,context).point);}
  return points.at(-1).x;
 }
 expect(run(.15)).toBeLessThan(run(0));
 const g=course(),cup=g.holes[0].green;
 g.pro.ball={x:cup.x-1,z:cup.z};g.pro.pos={...g.pro.ball};
 const {key}=await import('../src/simulation/world.js');g.elevation={[key(22,10)]:2};
 takeShot(g,g.pro,cup);expect(g.pro.shot.nativePutt.contours).toBe(true);update(g,.05);
 const copy=restore(serialize(g));
 for(let i=0;i<500;i++){update(g,.05);update(copy,.05);}
 expect(serialize(copy)).toBe(serialize(g));
});

test('published version-89 courses retain straight-only flight and legacy ground release',async()=>{
 const {exportCourse,importCourse,courseDigest,coursePractice}=await import('../src/simulation/course-package.js');
 const {PRE_SHAPED_FLIGHT_RULESET}=await import('../src/simulation/protocol.js');
 const pkg=structuredClone(await exportCourse(course()));
 pkg.content.ruleset=PRE_SHAPED_FLIGHT_RULESET;pkg.digest=await courseDigest(pkg.content);
 const old=coursePractice(await importCourse(JSON.stringify(pkg)));
 expect(old.liveFlightVersion).toBe(1);
 const fresh=coursePractice(await exportCourse(course()));expect(fresh.liveFlightVersion).toBe(2);
});
