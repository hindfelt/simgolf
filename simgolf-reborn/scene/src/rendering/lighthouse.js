import * as THREE from "three";
import { height } from "../landscape.js";

export function lighthouse(scene, x, z) {
  const group = new THREE.Group();
  group.name = "lighthouse";
  group.position.set(x, height(x, z), z);
  const materials = new Map();
  function cylinder(top, bottom, h, y, color, segments = 16) {
    if (!materials.has(color))
      materials.set(
        color,
        new THREE.MeshStandardMaterial({ color, roughness: 0.9 }),
      );
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(top, bottom, h, segments),
      materials.get(color),
    );
    mesh.position.y = y;
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }
  cylinder(2.1, 2.3, 0.35, 0.175, 0x8d8b7e);
  for (let band = 0; band < 6; band++) {
    cylinder(
      1.45 - (band + 1) * 0.1,
      1.45 - band * 0.1,
      1.15,
      0.35 + (band + 0.5) * 1.15,
      band % 2 ? 0xa04e3e : 0xe2d9b9,
    );
  }
  cylinder(1.35, 1.35, 0.18, 7.3, 0x565a52);
  cylinder(0.85, 0.85, 1.15, 7.94, 0x78999c);
  cylinder(0.08, 1.2, 0.7, 8.85, 0x934a3b);
  cylinder(0.09, 0.09, 0.45, 9.35, 0x565a52, 8);
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI) / 6;
    const post = cylinder(0.035, 0.035, 0.7, 7.72, 0x565a52, 6);
    post.position.x = Math.cos(angle) * 1.25;
    post.position.z = Math.sin(angle) * 1.25;
  }
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(1.25, 0.045, 5, 24),
    materials.get(0x565a52),
  );
  rail.rotation.x = Math.PI / 2;
  rail.position.y = 8.07;
  group.add(rail);
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 1.35, 0.15),
    materials.get(0x565a52),
  );
  door.position.set(0, 1, 1.38);
  group.add(door);
  scene.add(group);
  return group;
}
