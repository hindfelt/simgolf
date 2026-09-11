import {coastalWater} from '../simulation/coast.js';
import * as THREE from "three";
import { GRID } from "../simulation/world.js";
import { height, courseHeight } from "../landscape.js";
import { COAST_WATER, coastalBanks } from "./coastal-style.js";

// Decorative water outside the playable grid. Ownership and shot rules remain
// governed by the simulation; this surface cannot be built on or ray-picked.
export function buildOcean(scene) {
  const edge = GRID.minX + GRID.width * GRID.size;
  const geometry = new THREE.PlaneGeometry(260, 460, 130, 230);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(edge + 130, 0, 0);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++)
    p.setY(i, height(p.getX(i), p.getZ(i)) + 0.045);
  geometry.computeVertexNormals();
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = COAST_WATER;
  ctx.fillRect(0, 0, 128, 128);
  const grain = ctx.getImageData(0, 0, 128, 128);
  let seed = 9173;
  for (let i = 0; i < grain.data.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const n = (seed / 4294967296 - 0.5) * 18;
    for (let channel = 0; channel < 3; channel++) grain.data[i + channel] += n;
  }
  ctx.putImageData(grain, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(32.5, 57.5);
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 1,
  });
  const ocean = new THREE.Mesh(geometry, material);
  ocean.name = "offshore-ocean";
  ocean.receiveShadow = true;
  scene.add(ocean);
  const continuation=new THREE.Mesh(new THREE.BufferGeometry(),material);
  continuation.name='coast-beyond-map';continuation.receiveShadow=true;scene.add(continuation);
  let coastSeed;
  function rebuildContinuation(seed){
    const vertices=[],uv=[];
    for(let r=-100;r<150;r++){
      if(r>=0 && r<GRID.height)continue;
      for(let c=0;c<GRID.width;c++){
        if(!coastalWater(seed,c,r))continue;
        const x=GRID.minX+c*GRID.size,z=GRID.minZ+r*GRID.size;
        for(const [dx,dz] of [[0,0],[0,2],[2,0],[2,0],[0,2],[2,2]]){
          vertices.push(x+dx,height(x+dx,z+dz)+0.047,z+dz);
          uv.push((x+dx-edge)/260,(z+dz+230)/460);
        }
      }
    }
    continuation.geometry.dispose();const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();
    continuation.geometry=geo;
  }
  // Small faceted stone banks follow editable water, rather than fixed scenery.
  const stones = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.85, 1, 2, 5, 1),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }),
    GRID.width * GRID.height * 12,
  );
  stones.name = "coastal-stone-banks";
  stones.count = 0;
  stones.receiveShadow = true;
  stones.castShadow = true;
  scene.add(stones);
  const dummy = new THREE.Object3D();
  const shade = new THREE.Color();
  let revision = -1,
    currentGame;
  return {
    update(g) {
      ocean.visible = g.landscapeStyle === "coast";
      stones.visible = ocean.visible;
      continuation.visible=ocean.visible;
      if(ocean.visible && coastSeed!==(g.landSeed??2002)){
        coastSeed=g.landSeed??2002;rebuildContinuation(coastSeed);
      }
      if (currentGame === g && revision === g.revision) return;
      currentGame = g;
      revision = g.revision;
      let count = 0;
      for (const { c, r, dc, dr } of coastalBanks(g, GRID)) {
        for (let n = 0; n < 3; n++) {
          const jitter = ((c * 31 + r * 17 + n * 13) % 19) / 19;
          const along = (n - 1) * 0.58;
          const x = GRID.minX + (c + 0.5) * GRID.size + dc * 0.75 + dr * along;
          const z = GRID.minZ + (r + 0.5) * GRID.size + dr * 0.75 + dc * along;
          const waterY = courseHeight(g, x - dc * 0.75, z - dr * 0.75);
          const landY = courseHeight(g, x + dc * 0.75, z + dr * 0.75);
          const bankRise = Math.max(0, landY - waterY);
          const rockHeight = 0.12 + jitter * 0.08 + bankRise * 0.5;
          dummy.position.set(x, waterY + bankRise * 0.5 - 0.05, z);
          dummy.scale.set(
            0.43 + jitter * 0.12,
            rockHeight,
            0.43 + jitter * 0.1,
          );
          // Tall faces remain upright so their top follows the grass lip and
          // their base stays at the water even after repeated terrain edits.
          dummy.rotation.set(0, jitter * Math.PI, 0);
          dummy.updateMatrix();
          stones.setMatrixAt(count, dummy.matrix);
          shade.setHSL(0.58, 0.035, 0.38 + jitter * 0.2);
          stones.setColorAt(count++, shade);
        }
      }
      stones.count = count;
      stones.instanceMatrix.needsUpdate = true;
      if (stones.instanceColor) stones.instanceColor.needsUpdate = true;
      stones.computeBoundingSphere();
    },
  };
}
