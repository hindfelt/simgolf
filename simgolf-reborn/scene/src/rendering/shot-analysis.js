import * as THREE from "three";
export const ANALYSIS_COLORS = ["#fff5a4", "#f39783", "#80d7ff", "#d7a0ff"];
export function analysisOverlay(scene, height) {
  const group = new THREE.Group();
  scene.add(group);
  function clear() {
    for (const line of [...group.children]) {
      line.geometry.dispose();
      line.material.dispose();
      group.remove(line);
    }
  }
  function show(rows) {
    clear();
    rows.forEach((row, index) => {
      const s = row.samples[0],
        dx = s.landing.x - s.from.x,
        dz = s.landing.z - s.from.z,
        len = Math.hypot(dx, dz) || 1,
        points = [];
      for (let i = 0; i <= 40; i++) {
        const t = (i / 40) * (s.obstruction?.t ?? 1),
          bend = Math.sin(Math.PI * t) * s.curve,
          x = s.from.x + dx * t - (dz / len) * bend,
          z = s.from.z + dz * t + (dx / len) * bend;
        points.push(
          new THREE.Vector3(
            x,
            height(x, z) + 0.2 + 4 * s.apex * t * (1 - t),
            z,
          ),
        );
      }
      points.push(
        new THREE.Vector3(s.end.x, height(s.end.x, s.end.z) + 0.2, s.end.z),
      );
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({
          color: ANALYSIS_COLORS[index],
          depthTest: false,
          depthWrite: false,
        }),
      );
      line.renderOrder = 11;
      group.add(line);
    });
  }
  return { show, clear };
}
