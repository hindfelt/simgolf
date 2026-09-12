import {treeScale} from "./simulation/tree-scale.js";
import {sceneryTreeVisible} from './simulation/scenery-trees.js';
import { key, GRID } from "./simulation/world.js";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  height,
  courseHeight,
  riverZ,
  riverDistance as distanceToRiver,
  isOnPath,
  riverWidth,
  randomSource,
  makeTexture,
  pointInPolygon,
  fairwayPoints,
  greenPoints,
  teePoints,
} from "./landscape.js";

function batch(scene, geometry, material, transforms, shadows = true) {
  const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
  const d = new THREE.Object3D();
  for (let i = 0; i < transforms.length; i++) {
    const t = transforms[i];
    d.position.set(...t.p);
    d.rotation.set(...(t.r || [0, 0, 0]));
    d.scale.set(...(t.s || [1, 1, 1]));
    d.updateMatrix();
    mesh.setMatrixAt(i, d.matrix);
    if (t.c) mesh.setColorAt(i, new THREE.Color(t.c));
  }
  mesh.castShadow = shadows;
  mesh.receiveShadow = true;
  mesh.userData.transforms = transforms;
  scene.add(mesh);
  return mesh;
}

export function foliageTexture(pink = false) {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d");
  const rng = randomSource(76);
  // A branching spray of individual leaves, with transparent gaps all the way to its silhouette.
  for (let branch = 0; branch < 12; branch++) {
    const angle = (branch / 12) * Math.PI * 2;
    const ex = 256 + Math.cos(angle) * (140 + rng() * 80),
      ey = 256 + Math.sin(angle) * (140 + rng() * 80);
    ctx.strokeStyle = "#655334";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(256, 300);
    ctx.quadraticCurveTo(256 + (ex - 256) * 0.5, ey, ex, ey);
    ctx.stroke();
    for (let j = 0; j < 37; j++) {
      const t = 0.15 + rng() * 0.85;
      const x = 256 + (ex - 256) * t + (rng() - 0.5) * 105 * t,
        y = 285 + (ey - 285) * t + (rng() - 0.5) * 85 * t;
      const v = rng();
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + (rng() - 0.5) * 2);
      ctx.fillStyle = pink
        ? `rgb(${145 + v * 76},${99 + v * 70},${115 + v * 71})`
        : `rgb(${56 + v * 69},${77 + v * 70},${24 + v * 40})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, 8 + rng() * 6, 3 + rng() * 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = pink ? "#ffe1d63b" : "#c4ce8040";
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.lineTo(5, 0);
      ctx.stroke();
      ctx.restore();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function buildFlora(
  scene,
  { editableWater = false, coastal = false, environment = null } = {},
) {
  const desert = environment === "desert";
  const conifers = coastal && !desert;
  const rng = randomSource(117);
  const leaves = [],
    needles = [],
    pinkLeaves = [],
    trunks = [],
    branches = [],
    rocks = [],
    grass = [];
  function tree(x, z, size = 1, pink = false) {
    if (coastal && x >= 46) return;
    const arrays = [trunks, branches, leaves, pinkLeaves, needles],
      starts = arrays.map((a) => a.length);
    const ground = height(x, z),
      h = (5 + rng() * 2) * size;
    trunks.push({
      p: [x, ground + h * 0.43, z],
      s: [size, h * 0.86, size],
      r: [0, rng() * 6.28, (rng() - 0.5) * 0.08],
    });
    for (let j = 0; j < 9; j++) {
      const a = j * 2.4,
        reach = (1.2 + rng()) * size;
      const from = new THREE.Vector3(x, ground + h * 0.44, z),
        to = new THREE.Vector3(
          x + Math.cos(a) * reach,
          ground + h * 0.85 + rng() * size,
          z + Math.sin(a) * reach,
        );
      const mid = from.clone().add(to).multiplyScalar(0.5),
        direction = to.clone().sub(from);
      const q = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.clone().normalize(),
      );
      const e = new THREE.Euler().setFromQuaternion(q);
      branches.push({
        p: mid.toArray(),
        s: [size * 0.38, direction.length(), size * 0.38],
        r: [e.x, e.y, e.z],
      });
    }
    const target = pink ? pinkLeaves : leaves;
    for (let j = 0; j < 64; j++) {
      const angle = rng() * Math.PI * 2,
        rad = Math.sqrt(rng()) * 3.2 * size;
      const y =
        ground +
        h +
        0.7 * size +
        Math.sqrt(Math.max(0, 1 - (rad / (3.3 * size)) ** 2)) * 1.5 * size +
        (rng() - 0.5) * 2 * size;
      const scale = (1.6 + rng() * 1.1) * size;
      target.push({
        p: [x + Math.cos(angle) * rad, y, z + Math.sin(angle) * rad],
        r: [-0.2 + rng() * 1.8, rng() * Math.PI * 2, (rng() - 0.5) * 1.8],
        s: [scale, scale, scale],
        c: new THREE.Color().setHSL(
          0.19 + (rng() - 0.5) * 0.025,
          0.14,
          0.82 + rng() * 0.18,
        ),
      });
    }
    if (conifers && !pink) {
      // Keep the original RNG consumption so scenery positions, ownership and
      // removal keys remain identical. Only replace this tree's visual crown.
      branches.length = starts[1];
      leaves.length = starts[2];
      for (let tier = 0; tier < 8; tier++) {
        const fraction = tier / 8;
        const radius = size * (2 - fraction * 1.85);
        for (let branch = 0; branch < 8; branch++) {
          const angle = (branch * Math.PI) / 4 + tier * 0.6;
          const spread = size * (1.25 - fraction * 0.85);
          needles.push({
            p: [
              x + Math.cos(angle) * radius * 0.65,
              ground + h * (0.38 + fraction * 0.85),
              z + Math.sin(angle) * radius * 0.65,
            ],
            s: [spread, spread * 0.65, spread],
            r: [-0.65, angle, 0.3 * Math.sin(angle)],
            c: new THREE.Color(0xc6d8ca),
          });
        }
      }
    }
    if (desert) {
      // Preserve RNG consumption and tree identity so existing removals and
      // terrain edits still refer to the same plants after the visual change.
      leaves.push(...pinkLeaves.splice(starts[3]));
      const shrink=treeScale(environment,x,z);
      arrays.forEach((a,index)=>{
        for(let i=starts[index];i<a.length;i++){
          const t=a[i];t.p=[x+(t.p[0]-x)*shrink,ground+(t.p[1]-ground)*shrink,z+(t.p[2]-z)*shrink];
          t.s=t.s.map(v=>v*shrink);
          if(index===2)t.c=new THREE.Color(0xb6b49b);
        }
      });
      // Open canopies leave visible branches, instead of dense temperate crowns.
      leaves.splice(starts[2],leaves.length-starts[2],...leaves.slice(starts[2]).filter((_,i)=>i%2===0));
    }
    arrays.forEach((a, index) => {
      for (let i = starts[index]; i < a.length; i++)
        a[i].tree = {
          x,
          z,
          ground,
          k: key(
            Math.floor((x - GRID.minX) / 2),
            Math.floor((z - GRID.minZ) / 2),
          ),
        };
    });
  }
  let count = 0;
  for (let attempts = 0; attempts < 1200 && count < 155; attempts++) {
    const x = rng() * 139 - 69.5,
      z = rng() * 117 - 62;
    const background = z < -38,
      side = x < -48 || x > 49,
      foreground = z > 43 && (x < -15 || x > 27);
    if (
      !(background || side || foreground) ||
      Math.abs(z - riverZ(x)) < 5.5 ||
      (x > 5 && x < 38 && z > 25 && z < 54)
    )
      continue;
    tree(x, z, 0.7 + rng() * 0.6);
    count++;
  }
  for (const [x, z, s, p] of [
    [-45, -26, 1.1, 0],
    [-44, -12, 0.8, 0],
    [-11, -31, 1, 1],
    [46, -32, 1.0, 0],
    [49, 1, 1.05, 0],
    [40, 10, 0.8, 0],
    [-44, 17, 1, 0],
    [45, 49, 1, 0],
    [-27, 41, 1.1, 0],
    [-51, -35, 1, 1],
  ])
    tree(x, z, s, !!p);
  const leafMaterial = new THREE.MeshStandardMaterial({
    map: foliageTexture(),
    alphaTest: 0.45,
    side: THREE.DoubleSide,
    roughness: 1,
    color: desert ? 0xb8b69a : 0xe6e7c2,
    emissive: 0x293514,
    emissiveIntensity: 0.25,
  });
  const pinkMaterial = new THREE.MeshStandardMaterial({
    map: foliageTexture(true),
    alphaTest: 0.45,
    side: THREE.DoubleSide,
    roughness: 1,
  });
  const treeMeshes = [];
  if (conifers) {
    const crown = batch(
      scene,
      new THREE.PlaneGeometry(2.4, 2.4),
      new THREE.MeshStandardMaterial({
        map: foliageTexture(),
        alphaTest: 0.4,
        side: THREE.DoubleSide,
        color: 0xd0ddc7,
        emissive: 0x29402b,
        emissiveIntensity: 0.35,
        roughness: 1,
      }),
      needles,
    );
    crown.name = "coastal-conifers";
    treeMeshes.push(crown);
  }
  treeMeshes.push(
    batch(scene, new THREE.PlaneGeometry(2.4, 2.4), leafMaterial, leaves),
  );
  treeMeshes.push(
    batch(scene, new THREE.PlaneGeometry(2.4, 2.4), pinkMaterial, pinkLeaves),
  );
  treeMeshes[conifers ? 1 : 0].name = desert ? "desert-scrub-canopies" : "broadleaf-canopies";
  const barkTex = makeTexture("bark");
  barkTex.repeat.set(1, 3);
  const bark = new THREE.MeshStandardMaterial({
    map: barkTex,
    roughness: 1,
    color: 0xaaa18b,
  });
  treeMeshes.push(
    batch(scene, new THREE.CylinderGeometry(0.2, 0.38, 1, 8), bark, trunks),
  );
  treeMeshes.push(
    batch(scene, new THREE.CylinderGeometry(0.13, 0.3, 1, 6), bark, branches),
  );
  // Irregular river stones sit partly submerged, rather than forming an identical border.
  for (let x = -84; x < 84; x += 0.88) {
    for (const sign of [-1, 1]) {
      const z = riverZ(x) + sign * (riverWidth(x) + 0.15 + rng() * 1.3),
        s = 0.19 + rng() * 0.5;
      if (Math.abs(x + 7) < 2.8 || distanceToRiver(x, z) < 2.5) continue;
      if (editableWater) continue;
      rocks.push({
        p: [x + (rng() - 0.5) * 0.6, height(x, z) + s * 0.12, z],
        r: [rng() * 2, rng() * 6, rng() * 2],
        s: [s * 1.5, s * 0.8, s],
        c: new THREE.Color()
          .setHSL(0.11, 0.08, 0.28 + rng() * 0.24)
          .convertSRGBToLinear(),
      });
    }
  }
  const rockGeo = new THREE.IcosahedronGeometry(1, 1);
  batch(
    scene,
    rockGeo,
    new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }),
    rocks,
  );
  const bankPlants = [];
  for (let i = 0; i < 700; i++) {
    const x = rng() * 174 - 87,
      z = riverZ(x) + (i % 2 ? 1 : -1) * (riverWidth(x) + 1.0 + rng() * 1.5);
    if (
      Math.abs(x + 7) < 2.2 ||
      isOnPath(x, z, 0.5) ||
      distanceToRiver(x, z) < 3
    )
      continue;
    const size = 0.26 + rng() * 0.36;
    if (editableWater) continue;
    bankPlants.push({
      p: [x, height(x, z) + size * 0.4, z],
      r: [-0.3 + rng() * 1.1, rng() * 6.28, 0],
      s: [size, size, size],
    });
  }
  batch(scene, new THREE.PlaneGeometry(2.4, 2.4), leafMaterial, bankPlants);
  // Small grass blades at bank and woodland margins, leaving the mown surfaces readable.
  for (let i = 0; i < 15500; i++) {
    const x = rng() * 136 - 68,
      z = rng() * 112 - 55;
    if (isOnPath(x, z) || (coastal && x >= 46)) continue;
    const riverDistance = Math.abs(z - riverZ(x));
    if (
      riverDistance < 3.5 ||
      pointInPolygon(x, z, fairwayPoints) ||
      pointInPolygon(x, z, greenPoints) ||
      pointInPolygon(x, z, teePoints)
    )
      continue;
    if (x > -43 && x < -14 && z > -33 && z < -8) continue;
    if (
      riverDistance > 6 &&
      Math.abs(x) < 43 &&
      z < 35 &&
      z > -37 &&
      rng() < 0.9
    )
      continue;
    const s = 0.06 + rng() * 0.14;
    grass.push({
      p: [x, height(x, z), z],
      s: [s, s * 1.5, s],
      r: [0, rng() * 6.28, 0],
      c: new THREE.Color()
        .setHSL(0.19, 0.29, 0.24 + rng() * 0.17)
        .convertSRGBToLinear(),
    });
  }
  const blade = new THREE.BufferGeometry();
  blade.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [-0.4, 0, 0, 0, 1, 0.1, 0.1, 0, 0, 0, 0, -0.3, 0.2, 0.8, 0, 0, 0, 0.3],
      3,
    ),
  );
  blade.computeVertexNormals();
  batch(
    scene,
    blade,
    new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 1 }),
    grass,
    false,
  );
  let revision = -1;
  const dummy = new THREE.Object3D();
  return {
    treeCount: count + 10,
    pick(raycaster) {
      const hit = raycaster.intersectObjects(treeMeshes, false)[0];
      if (!hit) return null;
      const t = hit.object.userData.transforms[hit.instanceId]?.tree;
      return t
        ? { x: t.x, z: t.z, y: height(t.x, t.z), distance: hit.distance }
        : null;
    },
    update(g) {
      if (revision === g.revision) return;
      revision = g.revision;
      for (const mesh of treeMeshes) {
        mesh.userData.transforms.forEach((t, i) => {
          const tree = t.tree;
          dummy.position.set(
            t.p[0],
            t.p[1] + courseHeight(g, tree.x, tree.z) - tree.ground,
            t.p[2],
          );
          dummy.rotation.set(...(t.r || [0, 0, 0]));
          const c=Math.floor((tree.x-GRID.minX)/2),r=Math.floor((tree.z-GRID.minZ)/2);
          dummy.scale.set(...(!sceneryTreeVisible(g,c,r) ? [0,0,0] : t.s || [1,1,1]));
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
      }
    },
  };
}

export function buildFlowers(scene) {
  const rng = randomSource(802);
  const flowers = [],
    white = [],
    stems = [],
    rosettes = [],
    garden = [];
  const flowerParts = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const p = new THREE.SphereGeometry(0.06, 5, 3);
    p.scale(0.6, 0.32, 1.6);
    p.rotateY(a);
    p.translate(Math.sin(a) * 0.075, 0, Math.cos(a) * 0.075);
    flowerParts.push(p);
  }
  const flowerGeometry = mergeGeometries(flowerParts);
  flowerParts.forEach((p) => p.dispose());
  const leafParts = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [
          0,
          0.018,
          0,
          Math.sin(a - 0.2) * 0.2,
          0.015,
          Math.cos(a - 0.2) * 0.2,
          Math.sin(a) * 0.47,
          0.06,
          Math.cos(a) * 0.47,
          Math.sin(a + 0.2) * 0.2,
          0.02,
          Math.cos(a + 0.2) * 0.2,
        ],
        3,
      ),
    );
    g.setIndex([0, 1, 2, 0, 2, 3]);
    g.computeVertexNormals();
    leafParts.push(g);
  }
  const leafGeometry = mergeGeometries(leafParts);
  leafParts.forEach((p) => p.dispose());
  const patchGroup = new THREE.Group();
  scene.add(patchGroup);
  patchGroup.name = "dandelions";
  function dandelion(x, z, patch = false) {
    if (isOnPath(x, z)) return;
    const h = height(x, z),
      s = 0.6 + rng() * 0.4,
      fh = 0.24 + rng() * 0.23;
    const stem = { p: [x, h + fh * 0.5, z], s: [1, fh, 1] };
    const fl = {
      p: [x, h + fh, z],
      s: [s, s, s],
      r: [rng() * 0.3, rng() * 6, 0.1],
    };
    (patch ? garden : flowers).push(fl);
    stems.push(stem);
    rosettes.push({
      p: [x, h + 0.025, z],
      s: [s * 0.58, s * 0.58, s * 0.58],
      r: [0, rng() * 6, 0],
    });
    if (!patch && rng() < 0.18)
      white.push({ p: [x + 0.2, h + fh + 0.08, z], s: [0.085, 0.085, 0.085] });
  }
  for (let i = 0; i < 1500; i++) {
    const x = rng() * 125 - 62,
      z = rng() * 99 - 45;
    if (
      Math.abs(z - riverZ(x)) < 4 ||
      pointInPolygon(x, z, fairwayPoints) ||
      pointInPolygon(x, z, greenPoints) ||
      pointInPolygon(x, z, teePoints)
    )
      continue;
    if (x > -45 && x < -12 && z > -35 && z < -7) continue;
    if (z < 17 && Math.abs(x) < 44 && rng() < 0.88) continue;
    dandelion(x, z);
  }
  for (let i = 0; i < 130; i++) {
    const a = rng() * 6.28,
      r = Math.sqrt(rng()) * 3;
    dandelion(21 + Math.cos(a) * r, 36 + Math.sin(a) * r, true);
  }
  const yellow = new THREE.MeshStandardMaterial({
    color: 0xe9bd31,
    roughness: 0.9,
  });
  batch(scene, flowerGeometry, yellow, flowers, false);
  const patch = batch(patchGroup, flowerGeometry, yellow, garden, false);
  batch(
    scene,
    new THREE.CylinderGeometry(0.009, 0.012, 1, 4),
    new THREE.MeshStandardMaterial({ color: 0x688046 }),
    stems,
    false,
  );
  batch(
    scene,
    leafGeometry,
    new THREE.MeshStandardMaterial({
      color: 0x536b30,
      side: THREE.DoubleSide,
      roughness: 1,
    }),
    rosettes,
    false,
  );
  batch(
    scene,
    new THREE.IcosahedronGeometry(1, 1),
    new THREE.MeshStandardMaterial({ color: 0xe0dfc1, roughness: 1 }),
    white,
    false,
  );
  // Deliberate ornamental borders at the clubhouse, distinct from wild dandelions.
  const bedLeaves = [],
    blooms = [];
  for (let i = 0; i < 1000; i++) {
    let x, z;
    if (i < 500) {
      x = -44 + rng() * 31;
      z = -10 + rng() * 1.3;
      if (x > -33 && x < -25) continue;
    } else {
      x = (i % 2 ? -44 : -14) + (rng() - 0.5) * 1.4;
      z = -29 + rng() * 18;
    }
    if (isOnPath(x, z, 0.35)) continue;
    const h = height(x, z),
      s = 0.17 + rng() * 0.3;
    bedLeaves.push({
      p: [x, h + s * 0.6, z],
      s: [s * 1.8, s * 1.8, s * 1.8],
      r: [-0.3 + rng() * 1.5, rng() * 6, 0],
      c: new THREE.Color()
        .setHSL(0.24, 0.3, 0.22 + rng() * 0.1)
        .convertSRGBToLinear(),
    });
    blooms.push({
      p: [x, h + s * 1.5, z],
      s: [0.85, 0.85, 0.85],
      r: [0, rng() * 6, 0],
      c: [0xd9c8b2, 0xa95777, 0xbaa0c6, 0xc5b27a][i % 4],
    });
  }
  batch(
    scene,
    new THREE.PlaneGeometry(2.4, 2.4),
    new THREE.MeshStandardMaterial({
      map: foliageTexture(),
      alphaTest: 0.4,
      side: THREE.DoubleSide,
      roughness: 1,
      color: 0xffffff,
    }),
    bedLeaves,
  );
  batch(
    scene,
    flowerGeometry,
    new THREE.MeshStandardMaterial({ roughness: 1 }),
    blooms,
    false,
  );
  return { patchGroup, patch, count: flowers.length + garden.length };
}
