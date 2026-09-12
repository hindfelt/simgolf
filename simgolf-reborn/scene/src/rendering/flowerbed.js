import * as THREE from "three";
import { height } from "../landscape.js";
export function flowerbed(scene, x, z) {
  const group = new THREE.Group();
  group.position.set(x, height(x, z), z);
  scene.add(group);
  const add = (geo, color, x, y, z) => {
    const m = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ color, roughness: 1 }),
    );
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    group.add(m);
    return m;
  };
  add(new THREE.BoxGeometry(1.75, 0.13, 1.75), 0x856546, 0, 0.07, 0);
  add(new THREE.BoxGeometry(1.5, 0.14, 1.5), 0x4b3c28, 0, 0.1, 0);
  const heads = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.12, 6, 4),
    new THREE.MeshStandardMaterial({ roughness: 0.9 }),
    48,
  );
  const stems = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.025, 0.03, 0.32, 4),
    new THREE.MeshStandardMaterial({ color: 0x52783a }),
    16,
  );
  const dummy = new THREE.Object3D(),
    colors = [0xe9dca9, 0xb74b83, 0xdb745f, 0xa69bd1];
  for (let i = 0; i < 16; i++) {
    const px = ((i % 4) - 1.5) * 0.35,
      pz = (Math.floor(i / 4) - 1.5) * 0.35,
      y = 0.4 + (i % 3) * 0.035;
    dummy.position.set(px, y - 0.16, pz);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    stems.setMatrixAt(i, dummy.matrix);
    for (let petal = 0; petal < 3; petal++) {
      const a = (petal * Math.PI * 2) / 3;
      dummy.position.set(px + Math.cos(a) * 0.06, y, pz + Math.sin(a) * 0.06);
      dummy.scale.set(1, 0.7, 1);
      dummy.updateMatrix();
      heads.setMatrixAt(i * 3 + petal, dummy.matrix);
      heads.setColorAt(i * 3 + petal, new THREE.Color(colors[i % 4]));
    }
  }
  heads.castShadow = stems.castShadow = true;
  group.add(heads, stems);
  return group;
}
