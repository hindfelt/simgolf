import {test,expect} from '@playwright/test';
import {createGame} from '../src/simulation/game.js';
import {sceneryTrees,sceneryTreeVisible,sceneryTreeAt} from '../src/simulation/scenery-trees.js';
import {treeCollision,treeGroundBlocker} from '../src/simulation/trees.js';
import {key,inBounds} from '../src/simulation/world.js';
import {ownsLand,buyLand} from '../src/simulation/land-purchase.js';
import {coastalPreview} from '../src/rendering/coastal-preview.js';
import {compatibleGolfRuleset,compatibleCourseRuleset,PRE_VISIBLE_TREES_RULESET} from '../src/simulation/protocol.js';

test('owned coastal trees stop blocking shots when flooded and return when drained',()=>{
 const g=createGame(2002,'coast'),t=sceneryTrees(true).find(t=>t.x===-11&&t.z===-31),k=key(t.c,t.r);
 const from={x:t.x-.5,z:t.z},to={x:t.x+.5,z:t.z};
 const shot={from:{x:t.x-8,z:t.z},landing:{x:t.x+8,z:t.z},apex:t.height,curve:0,putt:false};
 expect(sceneryTreeAt(g,t.c,t.r)).toBe(true);expect(treeCollision(g,shot)).not.toBeNull();expect(treeGroundBlocker(g,from,to)(from,to)).toBe(true);
 g.tiles[k]={type:'water'};
 expect(sceneryTreeAt(g,t.c,t.r)).toBe(false);expect(treeCollision(g,shot)).toBeNull();expect(treeGroundBlocker(g,from,to)(from,to)).toBe(false);
 delete g.tiles[k];expect(sceneryTreeAt(g,t.c,t.r)).toBe(true);expect(treeCollision(g,shot)).not.toBeNull();
 g.removedTrees={[k]:true};expect(sceneryTreeAt(g,t.c,t.r)).toBe(false);
});
test('future and off-map coastal scenery agrees with preview and purchased parcels',()=>{
 const g=createGame(2002,'coast'),preview=coastalPreview(g),trees=sceneryTrees(true),before=JSON.stringify(g);
 for(const t of trees)expect(sceneryTreeVisible(g,t.c,t.r)).toBe(sceneryTreeVisible(preview,t.c,t.r));
 expect(JSON.stringify(g)).toBe(before);
 expect(trees.some(t=>!inBounds(t.c,t.r)&&!sceneryTreeVisible(g,t.c,t.r))).toBe(true);
 const future=trees.filter(t=>inBounds(t.c,t.r)&&!ownsLand(g,t.c,t.r));expect(future.length).toBeGreaterThan(0);
 const visible=future.map(t=>sceneryTreeVisible(g,t.c,t.r));g.cash=100000;while(g.landParcels<3)buyLand(g);
 expect(future.map(t=>sceneryTreeVisible(g,t.c,t.r))).toEqual(visible);
});
test('old coastal layouts remain importable without silently replaying changed physics',()=>{
 expect(compatibleCourseRuleset(PRE_VISIBLE_TREES_RULESET)).toBe(true);
 expect(compatibleGolfRuleset(PRE_VISIBLE_TREES_RULESET,'parklands','coast')).toBe(false);
 expect(compatibleGolfRuleset(PRE_VISIBLE_TREES_RULESET,'desert','classic')).toBe(true);
});
test('coastal rendered instances hide and restore with the same water edits',async({page})=>{
 await page.goto('/');await page.locator('#loading').waitFor({state:'hidden'});
 const scales=await page.evaluate(async()=>{
  const THREE=await import('/node_modules/three/build/three.module.js');
  const {buildFlora}=await import('/src/flora.js');
  const {createGame}=await import('/src/simulation/game.js');
  const {setLandscapeState}=await import('/src/landscape.js');
  const {key}=await import('/src/simulation/world.js');
  const g=createGame(2002,'coast');setLandscapeState(g);
  const scene=new THREE.Scene(),flora=buildFlora(scene,{editableWater:true,coastal:true});
  const mesh=scene.children.find(m=>m.geometry?.type==='CylinderGeometry'&&m.userData.transforms?.some(t=>t.tree?.x===-11));
  const i=mesh.userData.transforms.findIndex(t=>t.tree?.x===-11&&t.tree?.z===-31),matrix=new THREE.Matrix4();
  const scale=()=>{flora.update(g);mesh.getMatrixAt(i,matrix);return new THREE.Vector3().setFromMatrixScale(matrix).length();};
  const before=scale();g.tiles[key(16,1)]={type:'water'};g.revision++;const flooded=scale();delete g.tiles[key(16,1)];g.revision++;return [before,flooded,scale()];
 });
 expect(scales[0]).toBeGreaterThan(0);expect(scales[1]).toBe(0);expect(scales[2]).toBeCloseTo(scales[0],6);
});
