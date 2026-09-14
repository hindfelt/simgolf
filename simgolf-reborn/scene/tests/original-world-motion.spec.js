import {test,expect} from '@playwright/test';
import {originalWorldMotion} from '../src/simulation/original-world-motion.js';
import {createOriginalRuntimeSession,restoreOriginalRuntimeSession} from '../src/simulation/original-runtime-session.js';
function records(){const r=new Int32Array(2304);for(let i=0;i<r.length;i+=9)r[i]=-1;return r;}
test('grounded records stop and expire only after the signed age comparison',()=>{
 const motionRecords=records();motionRecords.set([100,200,0,0,300,0,0,77,88]);
 const first=originalWorldMotion({motionRecords,phaseCounter:1024}).state.motionRecords;
 expect(first[0]).toBe(100);expect(first.slice(2,6)).toEqual(new Int32Array([0,0,0,0]));
 expect(originalWorldMotion({motionRecords,phaseCounter:1025}).state.motionRecords[0]).toBe(-1);
 expect(Array.from(first.slice(7,9))).toEqual([77,88]);expect(motionRecords[4]).toBe(300);
});
test('runtime dispatch executes recovered motion and restored continuation matches',()=>{
 const motionRecords=records();motionRecords.set([100,200,1000,0,160,320,0,77,88]);
 const initial={actors:Array.from({length:152},()=>new Uint8Array(256)),seed:17,phaseCounter:30,globalFlags:0,modeByte:1,modeCounter:0,updateScratch:0,motionRecords};
 const calls=[],deps={resolveWorld:(address,state)=>{calls.push(address);return {state};}},options={ruleset:'test-motion'};
 const session=createOriginalRuntimeSession(initial,deps,options);session.step();
 expect(calls).toEqual([0x4029e0]);expect(session.read().motionRecords.slice(0,6)).toEqual(new Int32Array([100,190,1010,0,150,256]));
 const restored=restoreOriginalRuntimeSession(session.checkpoint(),deps,options);session.step();restored.step();expect(restored.read()).toEqual(session.read());
});
