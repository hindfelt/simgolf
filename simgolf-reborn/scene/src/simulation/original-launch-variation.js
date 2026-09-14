import {originalRandom} from './original-rng.js';
// 0x424083–0x424131 plus 0x42414a. Raw actor/map fields are explicit;
// their browser mappings must not be inferred from UI names.
export function originalLaunchVariation({globalFlags,skillMask,difficulty,actorClass,
 abilityFlags,abilityValue,targetFlags,attitude,seed}) {
 if(![globalFlags,skillMask,difficulty,actorClass,abilityFlags,abilityValue,targetFlags,attitude].every(Number.isInteger)||
 difficulty<0||difficulty>3||actorClass<0||actorClass>255||abilityValue<0||abilityValue>255||attitude< -128||attitude>127)
 throw Error('Invalid original launch variation inputs.');
 let budget=globalFlags&1?10:20;
 if((skillMask&4)&&difficulty!==0&&(actorClass&0xe0)!==0x20)budget+=Math.trunc(budget/(4-difficulty));
 if(abilityFlags&0x10)budget+=Math.trunc(abilityValue*budget/8);
 if(targetFlags&0x80)budget-=10;
 if(attitude<2)budget=Math.trunc(budget/2);
 const bound=Math.trunc(budget/2),rng=originalRandom(seed);
 const draw=rng.next(Math.max(1,bound&0xffff));
 return {budget,bound,variation:draw+bound+4,seed:rng.state,draws:rng.draws};
}
