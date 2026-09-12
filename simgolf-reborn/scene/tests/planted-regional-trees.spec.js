import {test,expect} from '@playwright/test';

test('coastal planting uses tapered crowns, remains pickable and switches to desert scrub',async({page})=>{
 await page.goto('/terrain-preview.html?seed=45834163&landscape=coast&environment=parklands');
 await expect(page.locator('#status')).toHaveCount(0);
 const result=await page.evaluate(async()=>{
  const THREE=await import('/node_modules/three/build/three.module.js');
  const {plantedTrees}=await import('/src/rendering/planted-trees.js');
  const {createGame}=await import('/src/simulation/game.js');
  const {center,key}=await import('/src/simulation/world.js');
  const {courseHeight}=await import('/src/landscape.js');
  const scene=new THREE.Scene(),trees=plantedTrees(scene),g=createGame();
  g.tiles={[key(20,20)]:{type:'tree'}};g.landscapeStyle='coast';g.environment='parklands';trees.update(g);
  const crown=scene.getObjectByName('planted-coastal-conifers'),m=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),scale=new THREE.Vector3();
  crown.getMatrixAt(0,m);m.decompose(p,q,scale);const lower=scale.x;
  crown.getMatrixAt(63,m);m.decompose(p,q,scale);const upper=scale.x;
  const base=center(20,20),ground=courseHeight(g,base.x,base.z);
  scene.updateMatrixWorld(true);
  const hit=trees.pick(new THREE.Raycaster(new THREE.Vector3(base.x,ground+1,base.z+10),new THREE.Vector3(0,0,-1)));
  g.environment='desert';trees.update(g);
  const desert=!!scene.getObjectByName('planted-desert-scrub');
  g.tiles={};g.revision++;trees.update(g);
  return {lower,upper,hit:!!hit,desert,remaining:scene.children.reduce((n,m)=>n+m.count,0)};
 });
 expect(result.lower).toBeGreaterThan(result.upper);expect(result.hit).toBe(true);expect(result.desert).toBe(true);expect(result.remaining).toBe(0);
});

test('palms and links scrub can be picked, raised and removed',async({page})=>{
 await page.goto('/terrain-preview.html?seed=2002&landscape=river&environment=tropical');
 await expect(page.locator('#status')).toHaveCount(0);
 const result=await page.evaluate(async()=>{
  const THREE=await import('/node_modules/three/build/three.module.js');
  const {plantedTrees}=await import('/src/rendering/planted-trees.js');
  const {createGame}=await import('/src/simulation/game.js');
  const {center,key}=await import('/src/simulation/world.js');
  const scene=new THREE.Scene(),trees=plantedTrees(scene),g=createGame(2002,'classic','tropical'),k=key(20,20),base=center(20,20);
  g.tiles={[k]:{type:'tree'}};trees.update(g);
  const crown=scene.getObjectByName('planted-palms'),m=new THREE.Matrix4();crown.getMatrixAt(0,m);const before=m.elements[13];
  g.elevation={[k]:2};g.revision++;trees.update(g);crown.getMatrixAt(0,m);const delta=m.elements[13]-before;
  scene.updateMatrixWorld(true);
  const hit=trees.pick(new THREE.Raycaster(new THREE.Vector3(base.x,2.5,base.z+10),new THREE.Vector3(0,0,-1)));
  g.environment='links';trees.update(g);const scrub=!!scene.getObjectByName('planted-gorse');
  g.tiles={};g.revision++;trees.update(g);
  return {delta,hit:!!hit,scrub,remaining:scene.children.reduce((n,m)=>n+m.count,0)};
 });
 expect(result.delta).toBeGreaterThan(0);expect(result.hit).toBe(true);expect(result.scrub).toBe(true);expect(result.remaining).toBe(0);
});
