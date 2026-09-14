import {test,expect} from '@playwright/test';
import {generateLandscape} from '../src/simulation/generated-landscape.js';
import {rerollTerrain,terrainDifference} from '../src/simulation/terrain-reroll.js';
import {createGame,serialize,restore} from '../src/simulation/game.js';
import {coastalWater} from '../src/simulation/coast.js';
import {coastalPreview} from '../src/rendering/coastal-preview.js';
test('coastal seeds change major geography and reroll rejects similar candidates',()=>{
 for(const style of ['coast','island','river','rolling']){
  const a=generateLandscape(11,style),b=generateLandscape(999,style);
  expect(terrainDifference(a,b)).toBeGreaterThan(.12);
  let next=11;const selected=rerollTerrain(11,style,()=>next++);
  expect(selected).not.toBe(11);expect(terrainDifference(a,generateLandscape(selected,style))).toBeGreaterThan(.2);
  expect(generateLandscape(selected,style)).toEqual(generateLandscape(selected,style));
 }
});
test('new generator survives saves; existing coastal saves retain their exterior',()=>{
 const g=createGame(11,'coast');expect(restore(serialize(g)).terrainGeneration).toBe(2);
 delete g.terrainGeneration;const loaded=restore(serialize(g));expect(loaded.terrainGeneration).toBeUndefined();
 const preview=coastalPreview(loaded);
 for(let r=42;r<72;r++)for(let c=0;c<45;c++){
  // Historical fixed building plots can protect a few cells from water.
  if(preview.tiles[r*45+c]?.type==='water')expect(coastalWater(11,c,r,'coast')).toBe(true);
 }
});
