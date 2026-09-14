import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalExplanationPopup} from '../src/simulation/original-explanation-popup.js';
import {originalPopupCompleteExplanation} from '../src/simulation/original-complete-explanation.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-explanation-popup.json',import.meta.url)));
test('actual popup state and RNG match the original executable',()=>{
 for(const [q,expected] of rows){const before=structuredClone(q);expect(originalExplanationPopup(q)).toEqual(expected);expect(q).toEqual(before);}
});
test('complete explanation marks seen only when the original popup accepts it',()=>{
 const actor=new Uint8Array(256);new DataView(actor.buffer).setInt32(8,300,true);new DataView(actor.buffer).setInt32(12,250,true);
 const q={actorId:0,kind:1,value:-1,selectedDelta:1,difficulty:0,profileRecords:{0:new Uint8Array(560)},requestCodes:[1,-1],profilePhrases:[['Nice shot']],state:{...rows[0][0].state,actors:{0:actor},popupActive:0,popupPending:0,popupMode:0,sourceText:'',originalClock:1000,lastExplanationClock:0,explanationMaskLow:0,explanationMaskHigh:0,interfaceFlags:4}};
 const resolve=(e,s)=>({...s,sourceText:s.sourceText+'Gary'});
 const accepted=originalPopupCompleteExplanation(q,resolve);expect(accepted.popupRandomDraws).toBe(2);expect(accepted.state.popupText).toBe(accepted.state.sourceText);expect(accepted.state.lastExplanationClock).toBe(1000);expect(accepted.state.explanationMaskLow).toBe(2);expect(accepted.state.popupDuration).toBe(8);
 q.state.popupActive=1;const rejected=originalPopupCompleteExplanation(q,resolve);expect(rejected.popupRandomDraws).toBe(0);expect(rejected.state.lastExplanationClock).toBe(0);expect(rejected.state.explanationMaskLow).toBe(0);expect(rejected.state.seed).toBe(q.state.seed);
});
