import * as THREE from "three";
import { RULES } from "../simulation/rules.js";
export function staffCoverage(scene, height) {
  const positions = new Float32Array(65 * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineDashedMaterial({
    color: 0xffef94,
    dashSize: 0.6,
    gapSize: 0.3,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    opacity: 0.95,
  });
  const line = new THREE.Line(geometry, material);
  line.visible = false;
  line.renderOrder = 10;
  line.frustumCulled = false;
  scene.add(line);
  let signature = "",
    snapshot = null;
  function update(g, staff, preview = null) {
    if (
      !staff ||
      !["ranger", "marshall"].includes(staff.role) ||
      (!preview && staff.phase !== "idle")
    ) {
      line.visible = false;
      snapshot = null;
      return;
    }
    const pos = preview || staff.pos,
      radius = RULES.rangerRadius;
    snapshot = { x: pos.x, z: pos.z, radius, preview: !!preview };
    const next = JSON.stringify([snapshot, g.revision]);
    line.visible = true;
    if (next === signature) return;
    signature = next;
    for (let i = 0; i <= 64; i++) {
      const angle = (i * Math.PI * 2) / 64,
        x = pos.x + Math.cos(angle) * radius,
        z = pos.z + Math.sin(angle) * radius;
      positions[i * 3] = x;
      positions[i * 3 + 1] = height(x, z) + 0.18;
      positions[i * 3 + 2] = z;
    }
    geometry.attributes.position.needsUpdate = true;
    line.computeLineDistances();
    material.color.setHex(preview ? 0x8de3e5 : 0xffef94);
  }
  return {
    update,
    snapshot: () => (snapshot ? { ...snapshot } : null),
    dispose() {
      scene.remove(line);
      geometry.dispose();
      material.dispose();
    },
  };
}
