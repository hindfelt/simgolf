import {test,expect} from '@playwright/test';
import {originalCandidateMotion} from '../src/simulation/original-candidate-motion.js';
import {originalBallPositionStep} from '../src/simulation/original-ball-position.js';
const state={x:26112,z:26112,height:100,speed:2048,verticalSpeed:128,heading:0x20000000,angularOffset:0x1000000};
test('candidate flight shares fixed-point movement and applies drag, gravity and turn',()=>{
 const position=originalBallPositionStep(state);
 const result=originalCandidateMotion(state,{groundBefore:10,groundAfter:30});
 expect(result).toEqual({...state,...position,height:84,speed:1984,verticalSpeed:64,heading:0x21000000,airborne:true});
 expect(state.height).toBe(100);
});
test('height threshold is evaluated before ground-height correction',()=>{
 expect(originalCandidateMotion({...state,height:1,verticalSpeed:0},{groundBefore:100,groundAfter:0})).toMatchObject({height:1,speed:2048,heading:state.heading,airborne:false,verticalSpeed:-64});
 expect(originalCandidateMotion({...state,height:2,verticalSpeed:0},{groundBefore:0,groundAfter:100})).toMatchObject({height:-98,speed:1984,airborne:true});
});
test('grounded stationary vertical fields do not receive gravity',()=>{
 expect(originalCandidateMotion({...state,height:0,verticalSpeed:0,speed:32},{groundBefore:0,groundAfter:0})).toMatchObject({height:0,verticalSpeed:0,speed:32,airborne:false});
});
