import {test,expect} from '@playwright/test';
import * as THREE from 'three';
import {facilityLighting} from '../src/rendering/facility-lighting.js';
test('connection lighting is reversible, leaves scenery unchanged and isolates shared materials',()=>{
 const material=new THREE.MeshStandardMaterial({color:0xdacba1}),original=material.color.clone();
 const group=new THREE.Group(),other=new THREE.Mesh(new THREE.BoxGeometry(),material);
 group.add(new THREE.Mesh(new THREE.BoxGeometry(),material));
 facilityLighting(group,'disconnected');const dim=group.children[0].material.color.clone();
 expect(dim.r).toBeLessThan(original.r);expect(other.material.color.equals(original)).toBe(true);
 facilityLighting(group,'connected');expect(group.children[0].material.color.equals(original)).toBe(true);
 expect(group.children[0].material.emissiveIntensity).toBe(.16);
 facilityLighting(group,'disconnected');expect(group.children[0].material.color.equals(dim)).toBe(true);
 facilityLighting(group,'scenery');expect(group.children[0].material.color.equals(original)).toBe(true);
});

test('rendered hotel brightens on connection and dims again when its path is broken',async({page})=>{
 await page.goto('/');await page.waitForFunction(()=>window.__gameTest);
 const result=await page.evaluate(async()=>{
  const THREE=await import('/node_modules/three/build/three.module.js');
  const {createGame,build}=await import('/src/simulation/game.js');
  const {buildCourseView}=await import('/src/rendering/course.js');
  const {setLandscapeState}=await import('/src/landscape.js');
  const g=createGame();build(g,'hotel',22,14);setLandscapeState(g);
  const scene=new THREE.Scene(),view=buildCourseView(scene);view.update(g,0);
  const hotel=scene.children.find(o=>o.userData.facilityType==='hotel');
  const statuses=[hotel.userData.connectionStatus];
  for(let c=8;c<=22;c++)build(g,'path',c,11);
  view.update(g,0);statuses.push(hotel.userData.connectionStatus);
  build(g,'rough',15,11);view.update(g,0);statuses.push(hotel.userData.connectionStatus);
  return statuses;
 });
 expect(result).toEqual(['disconnected','connected','disconnected']);
});
