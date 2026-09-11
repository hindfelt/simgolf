import {createGame,build,addHole,openHole,serialize,restore} from './game.js';
import {cellAt} from './world.js';

// A reproducible, playable fixture, built with the same validation and prices
// as an ordinary resort. No free money or altered production arrival rules.
export function createPlaytestCourse(){
 const g=createGame(2002);
 const place=(type,c,r,id)=>{
  const result=build(g,type,c,r,1,id);
  if(!result.ok)throw Error(`Playtest ${type}: ${result.message}`);
 };
 const point=(type,x,z,id)=>{const {c,r}=cellAt(x,z);place(type,c,r,id);};
 point('tee',-29,7,'hole-1');point('green',1,-13,'hole-1');
 const second=addHole(g);if(!second.ok)throw Error(second.message);
 point('tee',11,-13,second.holeId);point('green',29,7,second.holeId);
 for(const h of g.holes){const result=openHole(g,h.id);if(!result.ok)throw Error(result.message);}
 place('helipad',14,14);
 for(let c=8;c<=14;c++)place('path',c,11);
 // Only the fixture starts with an imminent visit, so feedback does not need
 // ten minutes of waiting. Subsequent visits retain ordinary rare scheduling.
 g.nextHelicopter=0;
 return restore(serialize(g));
}
