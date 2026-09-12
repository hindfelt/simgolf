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
