import {test,expect} from '@playwright/test';
import {originalGolferEffects} from '../src/simulation/original-golfer-effects.js';

test('unbound effects retain the caller result and current actor revision',()=>{
 const observed=[],dispatch=originalGolferEffects((event,state)=>{observed.push([event.address,state.actorId,state.seed]);return {state,value:12};});
 const s={actorId:7,seed:23};expect(dispatch({address:0x4235c0},s)).toEqual({state:s,value:12});
 expect(observed).toEqual([[0x4235c0,7,23]]);
});
test('planner binding is refreshed per invocation and cannot mutate the input',()=>{
 const observed=[],s={actorId:3,seed:5},event={address:0x4235c0,args:[3,0,-1,0,0]};
 const dispatch=originalGolferEffects(undefined,(e,state)=>{observed.push(state.seed);e.args[0]=100;state.seed=999;return null;});
 expect(()=>dispatch(event,s)).toThrow('binding unavailable');s.seed=6;
 expect(()=>dispatch(event,s)).toThrow('binding unavailable');expect(observed).toEqual([5,6]);expect(s.seed).toBe(6);expect(event.args[0]).toBe(3);
});
test('async planner bindings and unresolved effects fail explicitly',()=>{
 expect(()=>originalGolferEffects(undefined,()=>Promise.resolve({}))({address:0x4235c0},{})).toThrow('binding unavailable');
 expect(()=>originalGolferEffects()({address:0x4096e0},{})).toThrow('explicit resolver');
});
