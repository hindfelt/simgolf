import {test,expect} from '@playwright/test';
test('tropical offshore water shares its palette and hotel uses a lower lodge form',async({page})=>{
 await page.goto('/terrain-preview.html?seed=2002&landscape=coast&environment=tropical');
 await expect(page.locator('#status')).toHaveCount(0);
 await page.screenshot({path:'/tmp/baron-tropical-coast.png'});
 const result=await page.evaluate(async()=>{
  const THREE=await import('/node_modules/three/build/three.module.js');
  const {buildOcean}=await import('/src/rendering/ocean.js');
  const {resortHotel}=await import('/src/rendering/hotel.js');
  const {createGame}=await import('/src/simulation/game.js');
  const scene=new THREE.Scene(),water=buildOcean(scene),g=createGame(2002,'coast','tropical'),before=JSON.stringify(g);
  const pixels=()=>{const c=scene.getObjectByName('offshore-ocean').material.map.image;return Array.from(c.getContext('2d').getImageData(0,0,1,1).data);};
  water.update(g);const tropical=pixels();g.environment='links';water.update(g);const links=pixels();g.environment='tropical';water.update(g);
  const same=pixels().every((v,i)=>v===tropical[i]),unchanged=JSON.stringify(g)===before;
  const a=resortHotel(scene,0,0,'tropical'),b=resortHotel(scene,0,0,'parklands');
  const size=o=>new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3()).toArray();
  const lodge=size(a),hotel=size(b);b.visible=false;
  const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(700,520);renderer.setClearColor(0xbfcab3);renderer.outputColorSpace=THREE.SRGBColorSpace;
  const art=new THREE.Scene();art.add(a);art.add(new THREE.HemisphereLight(0xffffff,0x778866,2));const sun=new THREE.DirectionalLight(0xffeac4,3);sun.position.set(-10,20,15);art.add(sun);
  const camera=new THREE.PerspectiveCamera(35,700/520,.1,100);camera.position.set(14,12,18);camera.lookAt(0,2,0);renderer.render(art,camera);
  renderer.domElement.id='hotel-review';document.body.replaceChildren(renderer.domElement);
  return {tropical,links,same,unchanged,lodge,hotel};
 });
 expect(result.tropical[1]-result.tropical[0]).toBeGreaterThan(90);expect(result.links).not.toEqual(result.tropical);expect(result.same).toBe(true);expect(result.unchanged).toBe(true);
 expect(result.lodge[1]).toBeLessThan(result.hotel[1]);expect(result.lodge[0]).toBe(result.hotel[0]);expect(result.lodge[2]).toBe(result.hotel[2]);
 await page.locator('#hotel-review').screenshot({path:'/tmp/baron-tropical-hotel.png'});
});

test('course renderer passes the environment to placed hotels and placement previews',async({page})=>{
 await page.goto('/terrain-preview.html?seed=2002&landscape=river&environment=tropical');await expect(page.locator('#status')).toHaveCount(0);
 const sizes=await page.evaluate(async()=>{
  const THREE=await import('/node_modules/three/build/three.module.js');
  const {createGame,build}=await import('/src/simulation/game.js');
  const {buildCourseView}=await import('/src/rendering/course.js');
  const g=createGame(2002,'classic','tropical');build(g,'hotel',22,14);
  const scene=new THREE.Scene(),view=buildCourseView(scene);view.update(g,0);
  const size=o=>new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3()).y;
  const placed=size(scene.children.find(o=>o.userData.facilityType==='hotel'));
  const f={type:'hotel',c:22,r:14,rotation:0};
  view.previewFacility(f,true,'tropical');const tropical=size(scene.children.at(-1));
  view.previewFacility(f,true,'parklands');const parklands=size(scene.children.at(-1));
  return {placed,tropical,parklands};
 });
 expect(sizes.tropical).toBeCloseTo(sizes.placed);expect(sizes.parklands).toBeGreaterThan(sizes.tropical);
});
