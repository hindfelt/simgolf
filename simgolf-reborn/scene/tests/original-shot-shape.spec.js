import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalShotShape} from '../src/simulation/original-shot-shape.js';
const base={heading:0,angularOffset:1000,speed:3000,referenceSpeed:4000,strength:100,curve:0,actorFlags:2,activeActor:false,shotType:3};
test('shot shape matches original executable output fixtures',()=>{
 const rows=JSON.parse(readFileSync(new URL('./fixtures/original-shot-shape.json',import.meta.url),'utf8'));
 for(const [q,e] of rows)expect(originalShotShape(q)).toEqual(e);
});
test('straight shot preserves its selected type and caps speed at reference',()=>{
 expect(originalShotShape({...base,speed:5000})).toEqual({heading:0,angularOffset:1000,speed:4000,actorFlags:0,shotType:3,curveOffset:0});
});
test('draw and fade select opposite headings and stored curvature additions',()=>{
 const draw=originalShotShape({...base,curve:1,activeActor:true});
 const fade=originalShotShape({...base,curve:-1,activeActor:true});
 expect(draw.heading).toBe(0x15555554);expect(fade.heading).toBe(0xeaaaaaac);
 expect(draw.angularOffset).toBe(500);expect(fade.angularOffset).toBe(1000);
 expect(draw.curveOffset).toBe(-fade.curveOffset);expect(draw.shotType).toBe(1);expect(fade.shotType).toBe(-1);
 expect(originalShotShape({...base,curve:1,actorFlags:128}).heading).toBe(0xfffffff);
});
test('strength thresholds switch denominator and then use full-range reference',()=>{
 expect(originalShotShape({...base,curve:1,strength:249}).speed).toBe(3000+Math.trunc(48000/81));
 expect(originalShotShape({...base,curve:1,strength:250}).speed).toBe(3320);
 expect(originalShotShape({...base,curve:1,strength:300}).speed).toBe(4640);
});
