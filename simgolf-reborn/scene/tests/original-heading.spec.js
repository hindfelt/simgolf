import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalHeading} from '../src/simulation/original-heading.js';
import {originalDoglegFromPoints} from '../src/simulation/original-hole-variety.js';
const vectors=JSON.parse(readFileSync(new URL('./fixtures/original-heading.json',import.meta.url)));
test('integer headings match regression vectors executed from original x86 bytes',()=>{
 for(const [x,z,expected] of vectors)expect(originalHeading(x,z),`${x},${z}`).toBe(expected);
});
test('coordinate-based doglegs detect opposing bends and preserve other flags',()=>{
 const tee={x:0,z:0},green={x:0,z:-20};
 expect(originalDoglegFromPoints({tee,green,bend:{x:10,z:-10},flags:0x100}).flags).toBe(0x120);
 expect(originalDoglegFromPoints({tee,green,bend:{x:-10,z:-10},flags:0x100}).flags).toBe(0x140);
 expect(originalDoglegFromPoints({tee,green,bend:green,flags:0x160}).flags).toBe(0x100);
 expect(originalDoglegFromPoints({tee,green,bend:{x:0,z:-10}}).flags).toBe(0);
 expect(()=>originalHeading(1.5,2)).toThrow();
});
