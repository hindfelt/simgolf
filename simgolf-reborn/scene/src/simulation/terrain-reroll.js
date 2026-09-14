import {generateLandscape} from './generated-landscape.js';
// Compare buildable land/water and substantial height changes, not decoration.
export function terrainDifference(a,b){
 let changed=0;
 for(let k=0;k<45*42;k++)if((a.tiles[k]?.type==='water')!==(b.tiles[k]?.type==='water')||Math.abs((a.elevation[k]||0)-(b.elevation[k]||0))>=1.5)changed++;
 return changed/(45*42);
}
export function rerollTerrain(seed,style,nextSeed){
 if(style==='classic')return nextSeed();
 const previous=generateLandscape(seed>>>0,style);let best=seed,score=-1;
 for(let i=0;i<16;i++){
  const candidate=nextSeed(),difference=terrainDifference(previous,generateLandscape(candidate,style));
  if(difference>score){best=candidate;score=difference;}
  if(difference>=.22)break;
 }
 return best;
}
