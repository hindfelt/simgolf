import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { originalGravityStep, originalBounce } from '../src/simulation/original-bounce.js';
import { originalBallPositionStep } from '../src/simulation/original-ball-position.js';
import { originalTerrainMetadata } from '../src/simulation/original-terrain-metadata.js';
const input={height:0,verticalSpeed:-768,bounceCoefficient:3,boundaryFlags:0};
test('gravity and bounce constants match the original executable and terrain table',()=>{
 const b=readFileSync(new URL("../../../resources/sim golf/Sid Meier's SimGolf/golf.exe",import.meta.url));
 const bytes=(a,n)=>b.subarray(a-0x400000,a-0x400000+n).toString('hex');
 expect(bytes(0x42be8e,7)).toBe('8385f07f5700c0');
 expect(bytes(0x42c59c,5)).toBe('b8abaaaa2a');
 expect(bytes(0x42c5a1,5)).toBe('680f270000');
 expect(bytes(0x42c5c3,5)).toBe('3d80000000');
 for(let code=0;code<23;code++) expect(originalTerrainMetadata(code).bounceCoefficient).toBe(b.readInt8(0xc0a38+code*48+32));
});
test('gravity applies after height integration, including the zero-height crossing',()=>{
 expect(originalGravityStep({height:0,verticalSpeed:0})).toBe(0);
 expect(originalGravityStep({height:1,verticalSpeed:0})).toBe(-64);
 expect(originalGravityStep({height:0,verticalSpeed:64})).toBe(0);
 expect(originalGravityStep({height:-1,verticalSpeed:-64})).toBe(-128);
});
test('bounce boundaries retain only rebounds of at least 128 and cap at 9999',()=>{
 expect(originalBounce(input).verticalSpeed).toBe(128);
 expect(originalBounce({...input,verticalSpeed:-767}).verticalSpeed).toBe(0);
 expect(originalBounce({...input,verticalSpeed:-100000}).verticalSpeed).toBe(9999);
 expect(originalBounce({...input,height:-100}).height).toBe(0);
 expect(originalBounce({...input,verticalSpeed:-256}).impactEffect).toBe(false);
 expect(originalBounce({...input,verticalSpeed:-257}).impactEffect).toBe(true);
});
test('only downward ground contact bounces; boundary flags impose the coefficient minimum',()=>{
 for(const patch of [{height:1},{verticalSpeed:0},{verticalSpeed:1}]) expect(originalBounce({...input,...patch}).landed).toBe(false);
 expect(originalBounce({...input,bounceCoefficient:0,verticalSpeed:-1200}).verticalSpeed).toBe(0);
 expect(originalBounce({...input,bounceCoefficient:0,verticalSpeed:-1200,boundaryFlags:1}).verticalSpeed).toBe(136);
 expect(originalBounce({...input,bounceCoefficient:3,boundaryFlags:1})).toEqual(originalBounce(input));
});
test('vertical flight, gravity and rebound settle and resume deterministically',()=>{
 const advance=s=>{
  const moved=originalBallPositionStep(s);
  const verticalSpeed=originalGravityStep({...moved,verticalSpeed:s.verticalSpeed});
  return {...s,...moved,...originalBounce({...moved,verticalSpeed,bounceCoefficient:3,boundaryFlags:0})};
 };
 let state={x:0,z:0,height:0,speed:0,verticalSpeed:1024,heading:0}, saved, ticks=0, contacts=0;
 do {
  state=advance(state);ticks++;if(state.landed)contacts++;
  if(ticks===10)saved=JSON.parse(JSON.stringify(state));
 } while((state.height!==0||state.verticalSpeed!==0)&&ticks<200);
 expect(ticks).toBeLessThan(200);expect(contacts).toBeGreaterThan(1);
 for(let i=10;i<ticks;i++)saved=advance(saved);
 expect(saved).toEqual(state);
 expect(state.height).toBe(0);expect(state.verticalSpeed).toBe(0);
});
