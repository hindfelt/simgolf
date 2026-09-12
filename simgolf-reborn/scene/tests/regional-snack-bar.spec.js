import {test,expect} from '@playwright/test';
test('regional snack pavilions keep their footprint and render distinct materials',async({page})=>{
 await page.goto('/terrain-preview.html?environment=tropical');
 const sizes=await page.evaluate(async()=>{
  const THREE=await import('/node_modules/three/build/three.module.js');
  const {snackBar}=await import('/src/rendering/snack-bar.js');
  const scene=new THREE.Scene(),sizes=[];
  ['parklands','tropical','links'].forEach((env,i)=>{const g=snackBar(scene,(i-1)*8,0,env);g.position.y=0;const b=new THREE.Box3().setFromObject(g);sizes.push(b.getSize(new THREE.Vector3()).toArray());});
  scene.add(new THREE.HemisphereLight(0xffffff,0x778866,2));const sun=new THREE.DirectionalLight(0xffeac4,3);sun.position.set(-10,20,15);scene.add(sun);
  const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(1000,460);renderer.setClearColor(0xbfcab3);
  const camera=new THREE.PerspectiveCamera(35,1000/460,.1,100);camera.position.set(8,18,34);camera.lookAt(0,1,0);renderer.render(scene,camera);document.body.replaceChildren(renderer.domElement);return sizes;
 });
 expect(sizes[1][0]).toBeCloseTo(sizes[0][0]);expect(sizes[1][2]).toBeCloseTo(sizes[0][2]);expect(sizes[2][0]).toBeCloseTo(sizes[0][0]);
 await page.locator('canvas').screenshot({path:'/tmp/baron-regional-snack.png'});
});

test('regional pro shops keep their footprint and render distinct materials',async({page})=>{
 await page.goto('/terrain-preview.html?environment=tropical');
 const sizes=await page.evaluate(async()=>{
  const THREE=await import('/node_modules/three/build/three.module.js');
  const {proShop}=await import('/src/rendering/pro-shop.js');
  const scene=new THREE.Scene(),sizes=[];
  ['parklands','tropical','links'].forEach((env,i)=>{const g=proShop(scene,(i-1)*8,0,env);g.position.y=0;const b=new THREE.Box3().setFromObject(g);sizes.push(b.getSize(new THREE.Vector3()).toArray());});
  scene.add(new THREE.HemisphereLight(0xffffff,0x778866,2));const sun=new THREE.DirectionalLight(0xffeac4,3);sun.position.set(-10,20,15);scene.add(sun);
  const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(1000,460);renderer.setClearColor(0xbfcab3);
  const camera=new THREE.PerspectiveCamera(35,1000/460,.1,100);camera.position.set(8,18,34);camera.lookAt(0,1,0);renderer.render(scene,camera);document.body.replaceChildren(renderer.domElement);return sizes;
 });
 expect(sizes[1][0]).toBeCloseTo(sizes[0][0]);expect(sizes[1][2]).toBeCloseTo(sizes[0][2]);expect(sizes[2][0]).toBeCloseTo(sizes[0][0]);
 await page.locator('canvas').screenshot({path:'/tmp/baron-regional-pro-shop.png'});
});

test('placed regional shops rebuild on environment and rotation changes',async({page})=>{
 await page.goto('/terrain-preview.html?environment=tropical');
 const result=await page.evaluate(async()=>{
  const THREE=await import('/node_modules/three/build/three.module.js');
  const {createGame,build}=await import('/src/simulation/game.js');
  const {buildCourseView}=await import('/src/rendering/course.js');
  const game=createGame(2002,'classic','tropical');build(game,'pro-shop',22,14);
  const scene=new THREE.Scene(),view=buildCourseView(scene);view.update(game,0);
  const find=()=>scene.children.find(o=>o.userData.facilityType==='pro-shop');
  const first=find();if(!first)throw Error('Shop was not placed');
  const colors=o=>o.children.map(m=>m.material.color.getHex());
  const tropical=colors(first);game.environment='links';view.update(game,0);const second=find();
  const links=colors(second);game.facilities.find(f=>f.type==='pro-shop').rotation=1;game.revision++;view.update(game,0);
  return {replaced:first!==second,removed:!scene.children.includes(first),tropical,links,rotation:find().rotation.y,count:scene.children.filter(o=>o.userData.facilityType==='pro-shop').length};
 });
 expect(result.replaced).toBe(true);expect(result.removed).toBe(true);expect(result.tropical).not.toEqual(result.links);expect(result.rotation).toBeCloseTo(Math.PI/2);expect(result.count).toBe(1);
});

test('regional homes keep their footprint and render distinct materials',async({page})=>{
 await page.goto('/terrain-preview.html?environment=tropical');
 const sizes=await page.evaluate(async()=>{
  const THREE=await import('/node_modules/three/build/three.module.js');
  const {housing}=await import('/src/rendering/housing.js');
  const scene=new THREE.Scene(),sizes=[];
  ['parklands','tropical','links'].forEach((env,i)=>{const g=housing(scene,'home',(i-1)*8,0,env);g.position.y=0;const b=new THREE.Box3().setFromObject(g);sizes.push(b.getSize(new THREE.Vector3()).toArray());});
  scene.add(new THREE.HemisphereLight(0xffffff,0x778866,2));const sun=new THREE.DirectionalLight(0xffeac4,3);sun.position.set(-10,20,15);scene.add(sun);
  const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(1000,460);renderer.setClearColor(0xbfcab3);
  const camera=new THREE.PerspectiveCamera(35,1000/460,.1,100);camera.position.set(8,18,34);camera.lookAt(0,1,0);renderer.render(scene,camera);document.body.replaceChildren(renderer.domElement);return sizes;
 });
 expect(sizes[1][0]).toBeCloseTo(sizes[0][0]);expect(sizes[1][2]).toBeCloseTo(sizes[0][2]);expect(sizes[2][0]).toBeCloseTo(sizes[0][0]);
 await page.locator('canvas').screenshot({path:'/tmp/baron-regional-homes.png'});
});
