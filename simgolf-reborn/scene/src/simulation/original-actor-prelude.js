import {originalRandom} from './original-rng.js';
const uint=n=>Number.isInteger(n)&&n>=0&&n<=0xffffffff;
const int=n=>Number.isInteger(n)&&n>=-0x80000000&&n<=0x7fffffff;
const byte=n=>Number.isInteger(n)&&n>=0&&n<=255;
const word=n=>Number.isInteger(n)&&n>=-32768&&n<=32767;
function validate(s){
 if(!s||!Number.isInteger(s.slot)||s.slot<0||s.slot>=152||![s.seed,s.phaseCounter,s.stateFlags].every(uint)||
  ![s.difficulty,s.screenX,s.focusActor].every(int)||![s.countdown,s.remarkByte].every(byte)||!word(s.actorWord)||
  !Array.isArray(s.visualOwners)||s.visualOwners.length!==16||!s.visualOwners.every(word))throw Error('Invalid original actor prelude snapshot.');
 return s;
}
// 0x42819c–0x428272: normal-actor visual association and countdown.
// Raw field names deliberately avoid assigning unverified gameplay meanings.
export function originalActorPrelude(snapshot,resolve) {
 let state=structuredClone(validate(snapshot));let visualSlot=-1;const calls=[];
 for(let i=0;i<16;i++)if(state.visualOwners[i]===state.slot)visualSlot=i;
 if(visualSlot!==-1&&!(state.stateFlags&0x40000)) {
  state.visualOwners[visualSlot]=-1;visualSlot=-1;
 }
 let randomDraws=0;
 if(state.countdown!==0&&(state.phaseCounter&7)===0) {
  state.countdown--;
  if(state.countdown===1) {
   const rng=originalRandom(state.seed),value=rng.next(6);
   state.seed=rng.state;randomDraws=rng.draws;
   if(value>=((state.difficulty+1)|0)) {
    if(typeof resolve!=='function')throw Error('Original actor countdown requires an explicit resolver.');
    const event={address:0x466ea0,args:[state.slot]};calls.push(event);
    const reply=resolve(structuredClone(event),structuredClone(state));
    if(!reply||typeof reply.then==='function')throw Error('Expected synchronous original actor prelude state.');
    state=structuredClone(validate(reply));
   }
  }
  if(state.countdown===6&&state.remarkByte===50&&state.screenX!==-1&&!(state.stateFlags&0x100000)&&state.actorWord===4)state.focusActor=state.slot;
 }
 return {state,visualSlot,centreFlag:0,randomDraws,calls};
}
