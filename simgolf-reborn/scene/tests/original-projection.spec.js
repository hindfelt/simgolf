import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalProjection} from '../src/simulation/original-projection.js';
import {originalProjectionTable} from '../src/simulation/original-projection-table.js';
test('projection matches original x86 quadrant and scaling boundary vectors',()=>{
 const rows=JSON.parse(readFileSync(new URL('./fixtures/original-projection.json',import.meta.url),'utf8'));
 for(const [heading,radius,x,z] of rows)expect(originalProjection(heading,radius),`${heading}, ${radius}`).toEqual({x,z});
});
test('cosine component uses wrapped quarter-turn and table is immutable',()=>{
 for(const angle of [0,0x20000000,0x40000000,0x80000000,0xffffffff])
 expect(originalProjection(angle,2000).z).toBe(originalProjection((angle+0x40000000)>>>0,2000).x);
 expect(originalProjectionTable).toHaveLength(257);
 expect(Object.isFrozen(originalProjectionTable)).toBe(true);
 expect(originalProjectionTable[0]).toBe(0);
 expect(originalProjectionTable[255]).toBe(65535);
 expect(originalProjectionTable[256]).toBe(0);
});
