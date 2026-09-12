import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalRouteSearchSetup} from '../src/simulation/original-route-search-setup.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-route-search-setup.json',import.meta.url),'utf8'));
test('route setup and temporary range-query state match original executable',()=>{
 for(const [q,e,expectedCalls] of rows){const calls=[],before=JSON.stringify(q);expect(originalRouteSearchSetup(q,c=>{calls.push(c);return q.followingRange;})).toEqual(e);expect(calls).toEqual(expectedCalls);expect(JSON.stringify(q)).toBe(before);}
});
test('professional shot curve options depend on original ability bits',()=>{
 const q={...rows[0][0],skillMask:4,shotClass:0,actorClass:1};
 for(const [abilityFlags,mask] of [[0,0],[32,1],[64,2],[96,3]])expect(originalRouteSearchSetup({...q,abilityFlags},()=>200).curveMask).toBe(mask);
 expect(originalRouteSearchSetup({...q,actorClass:0,abilityFlags:0},()=>200).curveMask).toBe(3);
});
test('next-shot query wraps the byte counter and restores the original counter',()=>{
 const q={...rows[0][0],shotCounter:255};let counter;
 const r=originalRouteSearchSetup(q,c=>{counter=c.shotCounter;return 200;});expect(counter).toBe(0);expect(r.shotCounter).toBe(255);
});
test('two-shot reach compares combined ranges with cup distance',()=>{
 const q={...rows[0][0],x:512,z:512,cup:{x:10,z:0},range:100};
 expect(originalRouteSearchSetup(q,()=>150).needsMoreThanTwoShots).toBe(false);
 expect(originalRouteSearchSetup(q,()=>149).needsMoreThanTwoShots).toBe(true);
});
