import * as THREE from "three";
import { GRID, center } from "../simulation/world.js";
import { height } from "../landscape.js";

// Presentation-only variation never consumes the simulation's RNG stream.
export function buildHazardView(scene) {
  const capacity = GRID.width * GRID.height * 7;
  const grasses = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.11, 1, 4),
    new THREE.MeshStandardMaterial({ color: 0x668040, roughness: 1 }),
    capacity,
  );
  const shrubs = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.4, 1),
    new THREE.MeshStandardMaterial({
      color: 0x52683c,
      roughness: 1,
      flatShading: true,
    }),
    capacity,
  );
  const rocks = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.5, 1),
    new THREE.MeshStandardMaterial({
      color: 0x96917d,
      roughness: 1,
      flatShading: true,
    }),
    capacity,
  );
  for (const mesh of [grasses, shrubs, rocks]) {
    mesh.count = 0;
    mesh.castShadow = mesh.receiveShadow = true;
    scene.add(mesh);
  }
  const dummy = new THREE.Object3D();
  let revision = -1;
  return {
    update(g) {
      if (revision === g.revision) return;
      revision = g.revision;
      const counts = { grass: 0, shrub: 0, rock: 0 };
      for (const [key, t] of Object.entries(g.tiles)) {
        if (!["deep-rough", "brush", "rocks", "waste-bunker"].includes(t.type))
          continue;
        const p = center(
          Number(key) % GRID.width,
          Math.floor(Number(key) / GRID.width),
        );
        let seed = (Number(key) * 9173 + 6121) >>> 0;
        const rand = () => {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          return seed / 4294967296;
        };
        const count = t.type === "deep-rough" ? 7 : t.type === "brush" ? 5 : 3;
        for (let n = 0; n < count; n++) {
          const x = p.x + (rand() - 0.5) * 1.5,
            z = p.z + (rand() - 0.5) * 1.5;
          let mesh, index, h;
          if (t.type === "deep-rough") {
            mesh = grasses;
            index = counts.grass++;
            h = 0.22 + rand() * 0.3;
            dummy.scale.set(0.7 + rand() * 0.5, h, 0.7 + rand() * 0.5);
          } else if (t.type === "rocks") {
            mesh = rocks;
            index = counts.rock++;
            h = 0.4 + rand() * 0.6;
            dummy.scale.set(0.7 + rand() * 0.6, h, 0.7 + rand() * 0.6);
          } else {
            mesh = shrubs;
            index = counts.shrub++;
            h = t.type === "brush" ? 0.6 + rand() * 0.5 : 0.25 + rand() * 0.2;
            dummy.scale.set(h * 1.2, h, h * 1.2);
          }
          dummy.position.set(x, height(x, z) + h * 0.28, z);
          dummy.rotation.set(
            rand() * 0.12,
            rand() * Math.PI * 2,
            rand() * 0.12,
          );
          dummy.updateMatrix();
          mesh.setMatrixAt(index, dummy.matrix);
        }
      }
      for (const [mesh, count] of [
        [grasses, counts.grass],
        [shrubs, counts.shrub],
        [rocks, counts.rock],
      ]) {
        mesh.count = count;
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
      }
    },
  };
}
