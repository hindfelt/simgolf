import {airbornePoint} from '../simulation/shot-motion.js';
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
      const s=row.samples[0],points=[];
      for(let i=0;i<=40;i++) {
        const sample=airbornePoint(s,i/40*(s.obstruction?.t??1));
        points.push(new THREE.Vector3(sample.x,height(sample.x,sample.z)+.2+sample.lift,sample.z));
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
