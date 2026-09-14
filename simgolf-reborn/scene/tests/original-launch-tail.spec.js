import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalLaunchTail} from '../src/simulation/original-launch-tail.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-launch-tail.json',import.meta.url),'utf8'));
test('complete final launch sequence matches original executable output fixtures',()=>{
 for(const [q,e] of rows){const {draws,...actual}=originalLaunchTail(q,lie=>q.classes[lie+1]);expect(actual).toEqual(e);}
});
test('serialized input yields identical final ball state and preserves caller data',()=>{
 for(const [q] of rows.slice(0,15)){
  const before=JSON.stringify(q),copy=JSON.parse(before);
  expect(originalLaunchTail(copy,lie=>copy.classes[lie+1])).toEqual(originalLaunchTail(q,lie=>q.classes[lie+1]));
  expect(JSON.stringify(q)).toBe(before);
 }
});
test('shared recovery and final variation produce both changed lies and multi-draw outcomes',()=>{
 let changed=0,multiple=0;
 for(const [q] of rows){const a=originalLaunchTail(q,lie=>q.classes[lie+1]);changed+=Number(a.lie!==q.lie);multiple+=Number(a.draws>1);}
 expect(changed).toBeGreaterThan(0);expect(multiple).toBeGreaterThan(0);
});
