import {test,expect} from '@playwright/test';
import {createGame,serialize} from '../src/simulation/game.js';
test('desert coast uses sparse scrub, preserving removal and terrain following',async({page})=>{
 await page.goto('/');await page.waitForFunction(()=>window.__gameTest);
 const result=await page.evaluate(async()=>{
  const THREE=await import('/node_modules/three/build/three.module.js');
  const {buildFlora}=await import('/src/flora.js');
  const {createGame}=await import('/src/simulation/game.js');
  const {setLandscapeState}=await import('/src/landscape.js');
  const {GRID,key,inBounds}=await import('/src/simulation/world.js');
  const g=createGame(1234,'coast','desert');setLandscapeState(g);
  const scene=new THREE.Scene(),flora=buildFlora(scene,{editableWater:true,coastal:true,environment:'desert'});flora.update(g);
  const mesh=scene.getObjectByName('desert-scrub-canopies');
  const index=mesh.userData.transforms.findIndex(({tree})=>{const c=Math.floor((tree.x-GRID.minX)/2),r=Math.floor((tree.z-GRID.minZ)/2);return inBounds(c,r)&&g.tiles[key(c,r)]?.type!=='water';});
  const tree=mesh.userData.transforms[index].tree,c=Math.floor((tree.x-GRID.minX)/2),r=Math.floor((tree.z-GRID.minZ)/2),m=new THREE.Matrix4();
  mesh.getMatrixAt(index,m);const before=m.elements[13];
  for(let dc=-1;dc<=1;dc++)for(let dr=-1;dr<=1;dr++)g.elevation[key(c+dc,r+dr)]=(g.elevation[key(c+dc,r+dr)]||0)+1;
  g.revision++;flora.update(g);mesh.getMatrixAt(index,m);const rise=m.elements[13]-before;
  (g.removedTrees??={})[tree.k]=true;g.revision++;flora.update(g);mesh.getMatrixAt(index,m);
  return {conifers:!!scene.getObjectByName('coastal-conifers'),count:mesh.count,rise,removed:m.determinant()===0};
 });
 expect(result.conifers).toBe(false);expect(result.count).toBeGreaterThan(0);expect(result.rise).toBeCloseTo(1);expect(result.removed).toBe(true);
});
test('desert coastal game renders without errors',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(raw=>localStorage.setItem('simgolf-reborn.course.v1',raw),serialize(createGame(1234,'coast','desert')));
 await page.goto('/');await page.locator('#loading').waitFor({state:'hidden'});
 await page.screenshot({path:'/tmp/simgolf-desert-flora.png'});expect(errors).toEqual([]);
});
