import {test,expect} from '@playwright/test';
import {originalHoleVariety} from '../src/simulation/original-hole-variety.js';
const base={holeNumber:2,starts:8,classification:3,previousClassification:3,flags:0,previousFlags:0,feature132:0,feature134:0,par:4,previousPar:4,heading:0,previousHeading:0,difficulty:2};
test('first hole is varied; five repeated traits accumulate with difficulty allowance',()=>{
 expect(originalHoleVariety({...base,holeNumber:1}).penalty).toBe(0);
 expect(originalHoleVariety(base).penalty).toBe(5);
 expect([0,1,2,3].map(difficulty=>originalHoleVariety({...base,difficulty}).penalty)).toEqual([4,4,5,5]);
 expect(originalHoleVariety({...base,starts:7}).similarities).not.toContain('classification');
});
test('feature counters, masked flags and preceding par independently affect variety',()=>{
 for(const change of [{classification:4},{flags:0x20},{feature132:1},{feature134:-1},{par:5},{heading:0x40000000}])
  expect(originalHoleVariety({...base,...change}).penalty).toBe(4);
 expect(originalHoleVariety({...base,flags:0x80}).penalty).toBe(5);
 const different={...base,classification:4,flags:0x20,feature132:1,par:5,heading:0x40000000};
 expect(originalHoleVariety(different).qualifies).toBe(true);
 expect(originalHoleVariety({...different,par:4,flags:0}).qualifies).toBe(false);
 expect(originalHoleVariety({...different,par:4,flags:0,difficulty:1}).qualifies).toBe(true);
});
test('direction threshold uses signed shifted subtraction including wrap and negative rounding',()=>{
 const same=heading=>originalHoleVariety({...base,heading}).similarities.includes('heading');
 expect(same(39*0x1000000)).toBe(true);expect(same(40*0x1000000)).toBe(false);
 expect(same((-39*0x1000000)>>>0)).toBe(true);
 expect(same((-39*0x1000000-1)>>>0)).toBe(false);
 expect(originalHoleVariety({...base,heading:0,previousHeading:0xff000000}).similarities).toContain('heading');
 expect(()=>originalHoleVariety({...base,heading:-1})).toThrow();
});
