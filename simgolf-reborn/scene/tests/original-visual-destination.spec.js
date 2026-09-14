import {test,expect} from '@playwright/test';
import {originalVisualDestination} from '../src/simulation/original-visual-destination.js';
function fixture(){const b=new Uint8Array(76),v=new DataView(b.buffer);b[0x12]=1;b[0x13]=252;b[0x10]=20;b[0x11]=20;v.setInt32(0,20*1024,true);v.setInt32(4,20*1024,true);return {visualRecords:[b],terrain:new Uint8Array(2500),tileFlags:new Uint16Array(2500)};}
test('destination scan ignores blocked terrain and keeps source unchanged',()=>{
 const s=fixture();s.tileFlags[20*50+20]=2048;s.terrain[20*50+20]=20;s.tileFlags[21*50+20]=2048;
 const before=structuredClone(s),out=originalVisualDestination(s,0);
 expect(out.locals.selection).toBe(1);expect(out.locals.index).toBe(21);expect(out.locals.row).toBe(20);expect(s).toEqual(before);
});
test('special visual selection gate skips before requiring map storage',()=>{
 const s=fixture();s.visualRecords[0][0x13]=250;s.selectedActor=2;s.worldFlags=0;delete s.terrain;
 expect(originalVisualDestination(s,0).next).toBe('skip');
 s.selectedActor=-1;s.worldFlags=0x200000;s.actors=[new Uint8Array(256),new Uint8Array(256)];s.actors[1][0x29]=1;
 expect(originalVisualDestination(s,0).next).toBe('skip');
});
test('motion fallback reads the two native words preceding the motion table',()=>{
 const s=fixture();s.visualRecords[0][0x12]=8;s.motionRecords=new Int32Array(2304);s.motionRecords.fill(-1);s.motionRecords[0]=0;s.motionPrefix=Int32Array.of(20736,20736);
 const out=originalVisualDestination(s,0);expect(out.locals.selection).toBe(2);expect(out.locals.index).toBe(0);expect(out.locals.x).toBe(20736);expect(out.locals.z).toBe(20736);
});
