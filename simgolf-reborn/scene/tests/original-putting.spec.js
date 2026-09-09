import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalAttitudeLabel,originalGreenVariant,originalPuttingAim} from '../src/simulation/original-putting.js';
import {originalRandom} from '../src/simulation/original-rng.js';
const input={distanceYards:12,windowBeforeGreen:20,attitude:2,seed:1234};
test('green selection, tolerance penalty, putter test and miss constants match the supplied executable',()=>{
 const b=readFileSync(new URL("../../../resources/sim golf/Sid Meier's SimGolf/golf.exe",import.meta.url));
 const bytes=(va,length)=>b.subarray(va-0x400000,va-0x400000+length).toString('hex');
 expect(bytes(0x41fa55,7)).toBe('80e201f6da1ad2');
 expect(bytes(0x4240fe,13)).toBe('f68450dc82560080740383e90a');
 expect(bytes(0x4242a4,2)).toBe('3c0d');
 expect(bytes(0x424329,8)).toBe('0596000000c1e012');
 expect(bytes(0x424340,10)).toBe('c786f47f570000000000');
});
test('normal and tricky green share a terrain code and alternate a variant byte',()=>{
 expect([0,1,2,3].map(originalGreenVariant)).toEqual([0,255,0,255]);
 expect(()=>originalGreenVariant(-1)).toThrow();
});
test('tricky greens reduce the tolerance and preserve the original random draw budget',()=>{
 const normal=originalPuttingAim(input);
 const tricky=originalPuttingAim({...input,greenVariant:255});
 expect(normal.deviates).toBe(false);expect(normal.draws).toBe(1);
 expect(tricky.toleranceYards).toBeLessThan(normal.toleranceYards);
 expect(tricky.deviates).toBe(true);expect(tricky.draws).toBe(3);
 expect(tricky.angularOffset).not.toBe(0);
 expect(originalPuttingAim({...input,greenVariant:127})).toEqual(normal);
});
test('zero tolerance bound still consumes a draw; short misses suppress offset after drawing',()=>{
 const result=originalPuttingAim({...input,distanceYards:5,windowBeforeGreen:10,greenVariant:255});
 expect(result.toleranceYards).toBe(4);expect(result.angularOffset).toBe(0);expect(result.draws).toBe(3);
 const rng=originalRandom(input.seed);rng.next(1);rng.next(2);rng.next(150);
 expect(result.rngState).toBe(rng.state);
 const inside=originalPuttingAim({...input,distanceYards:4,windowBeforeGreen:10,greenVariant:255});
 expect(inside.deviates).toBe(false);expect(inside.draws).toBe(1);
});
test('distance bands halve the signed miss angle and the double-distance flag changes eligibility',()=>{
 const values=[15,16,26,36].map(distanceYards=>originalPuttingAim({...input,distanceYards,windowBeforeGreen:10,greenVariant:255}));
 expect(Math.abs(values[0].angularOffset)).toBeGreaterThan(0);
 expect(values[1].angularOffset).toBe(values[0].angularOffset/2);
 expect(values[2].angularOffset).toBe(values[0].angularOffset/4);
 expect(values[3].angularOffset).toBe(values[0].angularOffset/8);
 expect(originalPuttingAim({...input,doubleDistanceFlag:true}).deviates).toBe(true);
 expect(originalPuttingAim({...input,attitude:1}).toleranceYards).toBeLessThan(originalPuttingAim(input).toleranceYards);
});

test('attitude names and signed lookup order match the original UI jump table',()=>{
 const b=readFileSync(new URL("../../../resources/sim golf/Sid Meier's SimGolf/golf.exe",import.meta.url));
 const stringAt=va=>b.subarray(va-0x400000).toString('latin1').split('\0')[0];
 expect(stringAt(0x4c5054)).toBe('Attitude: ');
 const strings=new Map([[0x41aee0,0x4c5010],[0x41aed9,0x4c5018],[0x41aed2,0x4c501c],
  [0x41aecb,0x4c5024],[0x41aeaf,0x4c504c],[0x41aeb6,0x4c5040],
  [0x41aebd,0x4c5038],[0x41aec4,0x4c502c]]);
 for(let attitude=-4;attitude<=4;attitude++) {
  const branch=b.readUInt32LE(0x20cbc+(attitude+4)*4);
  expect(originalAttitudeLabel(attitude)).toBe(stringAt(strings.get(branch)));
 }
 expect(originalAttitudeLabel(-128)).toBe('furious');
 expect(originalAttitudeLabel(127)).toBe('invincible');
 expect(()=>originalAttitudeLabel(128)).toThrow();
});
test('pumped attitude is the putting threshold, not determined or an accuracy skill level',()=>{
 const result=attitude=>originalPuttingAim({...input,attitude});
 for(const attitude of [-4,-3,-2,-1,0,1]) expect(result(attitude)).toEqual(result(0));
 for(const attitude of [2,3,4]) expect(result(attitude)).toEqual(result(2));
 expect(result(2).toleranceYards).toBeGreaterThan(result(1).toleranceYards);
 expect(()=>originalPuttingAim({...input,attitude:undefined,ability:2})).toThrow();
});
