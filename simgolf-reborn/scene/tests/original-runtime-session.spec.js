import {test,expect} from '@playwright/test';
import {createOriginalRuntimeSession,restoreOriginalRuntimeSession} from '../src/simulation/original-runtime-session.js';
import {resumeOriginalAimingTurn} from '../src/simulation/original-aiming-tutorial.js';
import {aimingWorld} from './helpers/original-aiming-world.js';
const options={ruleset:'test-recovered-aiming-1'};
function bindings(){return {resumeTurn:resumeOriginalAimingTurn,resolve:(event,state)=>{if(event.address===0x466fb0)state.sourceText='Player'+event.args[0];return {state,value:0,result:0,point:{x:0,y:0,visible:false},...(event.address===0x447a30?{soundEvents:[event]}:{})};},resolveWorld:(_,state)=>({state})};}
test('session keeps suspension speculative and commits the resumed tick once',()=>{
 const initial=aimingWorld(),session=createOriginalRuntimeSession(initial,bindings(),options);
 expect(session.step()).toMatchObject({completed:false,revision:0,next:'0x42b647'});expect(session.read()).toEqual(initial);expect(session.drainSounds()).toEqual([]);
 expect(()=>session.step()).toThrow('Resume');expect(session.resume()).toEqual({completed:true,revision:1});
 expect(session.read().phaseCounter).toBe(31);expect(session.read().selectionMode).toBe(3);
 expect(session.drainSounds()).toEqual([{address:0x447a30,args:[42,100,0,0,0]}]);expect(session.drainSounds()).toEqual([]);expect(()=>session.resume()).toThrow('No original');
});
test('pending session restores but completed historical audio does not replay',()=>{
 const session=createOriginalRuntimeSession(aimingWorld(),bindings(),options);session.step();
 const restored=restoreOriginalRuntimeSession(session.checkpoint(),bindings(),options);
 expect(restored.status()).toEqual({revision:0,suspended:true});restored.resume();session.resume();expect(restored.read()).toEqual(session.read());
 const completed=restoreOriginalRuntimeSession(restored.checkpoint(),bindings(),options);expect(completed.drainSounds()).toEqual([]);expect(completed.status()).toEqual({revision:1,suspended:false});
 expect(()=>restoreOriginalRuntimeSession(session.checkpoint(),bindings(),{ruleset:'different'})).toThrow('Incompatible');
});
test('failed later system leaves committed state and pending retry unchanged',()=>{
 const deps=bindings(),session=createOriginalRuntimeSession(aimingWorld(),deps,options);session.step();const checkpoint=session.checkpoint();
 deps.resolveWorld=()=>{throw Error('unavailable');};expect(()=>session.resume()).toThrow('unavailable');expect(session.checkpoint()).toBe(checkpoint);expect(session.drainSounds()).toEqual([]);
 deps.resolveWorld=(_,state)=>({state});expect(session.resume().completed).toBe(true);expect(session.drainSounds()).toHaveLength(1);
 const copy=session.read();copy.actors[2][0]=99;expect(session.read().actors[2][0]).not.toBe(99);
});
