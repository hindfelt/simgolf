// Original world-call boundary, 0x4172ce–0x41732d. This is one section of
// the world tick, not the full tick or the body of the golfer scheduler.
// Resolvers must perform synchronous speculative state updates; presentation
// and network publication happen only after the host accepts the whole result.
const uint=n=>Number.isInteger(n)&&n>=0&&n<=0xffffffff;
function valid(state) {
 if(!state||![state.phaseCounter,state.globalFlags,state.updateScratch,state.modeCounter,state.seed].every(uint)||
  !Number.isInteger(state.modeByte)||state.modeByte<0||state.modeByte>255)throw Error('Invalid original world update snapshot.');
 return state;
}
export function originalWorldUpdate(snapshot,resolve) {
 let state=structuredClone(valid(snapshot));const calls=[];
 state.updateScratch=0; // 0x59a188 is reset even when flag 4 skips this block.
 if(state.globalFlags&4)return {state,calls,skipped:true};
 function call(address) {
  if(typeof resolve!=='function')throw Error('Original world callbacks require an explicit resolver.');
  calls.push(address);
  const reply=resolve(address,structuredClone(state));
  if(!reply||typeof reply.then==='function')throw Error('Expected synchronous original world callback state.');
  state=structuredClone(valid(reply));
 }
 call(0x428100); // Entire original golfer loop, including non-shot work.
 call(0x4029e0);
 call(0x409980);
 if(state.modeByte===0&&state.modeCounter===0)call(0x46df40);
 state.phaseCounter=(state.phaseCounter+1)>>>0;
 if(state.globalFlags&8)state.phaseCounter=(state.phaseCounter+(state.phaseCounter&1))>>>0;
 return {state,calls,skipped:false};
}
