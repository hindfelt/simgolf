import {test,expect} from '@playwright/test';
import {serializeOriginalRuntime,restoreOriginalRuntime} from '../src/simulation/original-runtime-checkpoint.js';
import {aimingWorld} from './helpers/original-aiming-world.js';
import {originalWorldGolferUpdate,resumeOriginalWorldGolferUpdate} from '../src/simulation/original-world-golfer-update.js';
import {resumeOriginalAimingTurn} from '../src/simulation/original-aiming-tutorial.js';
const resolve=(event,state)=>{if(event.address===0x466fb0)state.sourceText='Player'+event.args[0];return {state,value:0,result:0,point:{x:0,y:0,visible:false},...(event.address===0x447a30?{soundEvents:[event]}:{})};};
const bindings={resolve,resolveWorld:(_,state)=>({state}),resumeTurn:resumeOriginalAimingTurn};
test('reload during a suspended native turn produces the same completed world and sound batch',()=>{
 const world=aimingWorld(),pending=originalWorldGolferUpdate(world,bindings),saved=serializeOriginalRuntime({world,pending});
 const restored=restoreOriginalRuntime(saved);
 expect(restored.pending.continuation.state.actors[2]).toBeInstanceOf(Uint8Array);
 expect(resumeOriginalWorldGolferUpdate(restored.pending,bindings)).toEqual(resumeOriginalWorldGolferUpdate(pending,bindings));
 expect(originalWorldGolferUpdate(restored.world,bindings)).toEqual(pending);
 expect(serializeOriginalRuntime({world,pending})).toBe(saved);
});
test('packed buffer overlaps and record aliases survive reload without sharing source memory',()=>{
 const buffer=new ArrayBuffer(512),actors=[new Uint8Array(buffer,0,256),new Uint8Array(buffer,256,256)],holes=[new Uint8Array(520)];
 const state={actors,raw:new Uint8Array(buffer),holes,holeRecords:holes};actors[1][0]=17;
 const restored=restoreOriginalRuntime(serializeOriginalRuntime(state));
 expect(restored.holes).toBe(restored.holeRecords);expect(restored.actors[0].buffer).toBe(restored.actors[1].buffer);
 restored.raw[256]=33;expect(restored.actors[1][0]).toBe(33);expect(actors[1][0]).toBe(17);
});
test('functions, malformed references and misaligned views reject',()=>{
 expect(()=>serializeOriginalRuntime({read:()=>0})).toThrow('checkpoint');
 const packed=JSON.parse(serializeOriginalRuntime({terrain:new Uint16Array(10)}));
 packed.nodes.find(n=>n[0]==='view')[3]=1;expect(()=>restoreOriginalRuntime(JSON.stringify(packed))).toThrow('checkpoint');
 packed.root={ref:99999};expect(()=>restoreOriginalRuntime(JSON.stringify(packed))).toThrow();
});
test('object keys cannot modify prototypes on restore',()=>{
 const input=JSON.parse('{"__proto__":{"polluted":true}}'),restored=restoreOriginalRuntime(serializeOriginalRuntime(input));
 expect(Object.getPrototypeOf(restored)).toBe(Object.prototype);expect({}.polluted).toBeUndefined();expect(Object.hasOwn(restored,'__proto__')).toBe(true);
});
test('signed zero and floating scratch preserve bit-sensitive continuation values',()=>{
 const state={angle:-0,scratch:new Float64Array([-0,Math.PI,-1.5])};
 const restored=restoreOriginalRuntime(serializeOriginalRuntime(state));
 expect(Object.is(restored.angle,-0)).toBe(true);expect(Object.is(restored.scratch[0],-0)).toBe(true);expect(restored.scratch).toEqual(state.scratch);
 expect(()=>serializeOriginalRuntime({angle:NaN})).toThrow('checkpoint');
});
