import * as THREE from "three";
import { GRID } from "../simulation/world.js";
import { height } from "../landscape.js";
import { TERRAIN } from "../simulation/terrain.js";

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
  ctx.fillStyle = TERRAIN.water.color;
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
  return {
    update(g) {
      ocean.visible = g.landscapeStyle === "coast";
    },
  };
}
