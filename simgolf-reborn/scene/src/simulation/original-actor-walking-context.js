// Native locals at 0x428ad1, captured by actor dispatch/turn ordering.
// The cached actor terrain is shared by reversal checks and walking costs.
export function originalActorWalkingContext(snapshot,locals){
 const state=structuredClone(snapshot);
 if(locals.next!=='0x428ad1')throw Error('Expected original walking continuation.');
 const {actorTile,actorIndex,actorTerrain,ballTerrain,previousFlags,partnerNotReady}=locals;
 if(!actorTile||![actorTile.x,actorTile.z,actorIndex,actorTerrain,ballTerrain,previousFlags].every(Number.isInteger)||typeof partnerNotReady!=='boolean')throw Error('Original walking locals unavailable.');
 if(actorIndex!==actorTile.x*50+actorTile.z||actorIndex<0||actorIndex>=2500||actorTerrain< -128||actorTerrain>127)throw Error('Invalid original walking tile locals.');
 return Object.assign(state,{entryValue:0,actorTile:{...actorTile},actorIndex,nextTerrain:actorTerrain,reversalCheck:actorTerrain,ballTerrain,cachedFlags:previousFlags>>>0,walkingOverride:Number(partnerNotReady),movementReady:1});
}
