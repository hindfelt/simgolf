import { elevationAt } from "./simulation/landforming.js";
let editedGround = null;
export function setLandscapeState(g) {
  editedGround = g;
}
import * as THREE from "three";

export function randomSource(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const random = randomSource(2002);
import {
  riverZ,
  riverWidth,
  riverPoints,
  riverDistance,
} from "./simulation/world.js";
export { riverZ, riverWidth, riverPoints, riverDistance };
export const bridgeLayout = { x: -7, z: riverZ(-7), halfSpan: 5.2 };
const north = bridgeLayout.z - bridgeLayout.halfSpan;
const south = bridgeLayout.z + bridgeLayout.halfSpan;
export const paths = [
  {
    width: 1.65,
    points: [
      [-61, 0],
      [-39, 0],
      [-29, 0],
      [-29, -5.5],
      [-19, -5.5],
      [-19, -12],
      [-7, -12],
      [-7, -20],
      [5, -20],
      [5, -28],
      [14, -28],
      [14, -36],
      [48, -36],
      [48, -52],
      [75, -52],
    ],
  },
  {
    width: 2.6,
    points: [
      [-39, 0],
      [-39, 15],
      [-7, 15],
      [-7, north + 0.6],
    ],
  },
  {
    width: 2.6,
    points: [
      [-7, south - 0.6],
      [-7, 50],
    ],
  },
  {
    width: 4.7,
    points: [
      [-29, -5.5],
      [-29, -9.7],
    ],
  },
];
// Use the same straight segments for painting and vegetation clearance.
export function isOnPath(x, z, margin = 0.2) {
  return paths.some((route) =>
    route.points.slice(1).some(([bx, bz], i) => {
      const [ax, az] = route.points[i];
      const dx = bx - ax,
        dz = bz - az;
      const t = Math.max(
        0,
        Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)),
      );
      return (
        (ax + t * dx - x) ** 2 + (az + t * dz - z) ** 2 <
        (route.width / 2 + margin) ** 2
      );
    }),
  );
}
function tracePath(ctx, points, scale) {
  ctx.beginPath();
  points.forEach(([x, z], i) => {
    const [px, py] = scale(x, z);
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  });
}
export function height(x, z) {
  const d = riverDistance(x, z);
  return (
    (editedGround ? elevationAt(editedGround, x, z) : 0) +
    0.14 +
    0.17 * Math.sin(x * 0.064) * Math.cos(z * 0.074) -
    (editedGround ? 0 : 1.48 * Math.exp(-Math.pow(d / 3.05, 4)))
  );
}

// Broad painted tile runs: crisp straight edges with small, softened corners.
export const fairwayPoints = [
  [-27, 13],
  [-27, -1],
  [-17, -1],
  [-17, -9],
  [-5, -9],
  [-5, -17],
  [7, -17],
  [7, -25],
  [31, -25],
  [31, -11],
  [19, -11],
  [19, -3],
  [7, -3],
  [7, 5],
  [-5, 5],
  [-5, 13],
];
export const greenPoints = [
  [24, -31],
  [39, -31],
  [39, -19],
  [24, -19],
];
export const bunkerPoints = [
  [
    [17, -32],
    [23, -32],
    [23, -29],
    [21, -29],
    [21, -25],
    [17, -25],
  ],
  [
    [41, -23],
    [46, -23],
    [46, -16],
    [42, -16],
    [42, -13],
    [37, -13],
    [37, -17],
    [41, -17],
  ],
];
export const teePoints = [
  [-35, 5],
  [-28, 5],
  [-28, 12],
  [-35, 12],
];
export const pointInPolygon = (x, z, points) => {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [a, b] = points[i],
      [c, d] = points[j];
    if (b > z !== d > z && x < ((c - a) * (z - b)) / (d - b) + a)
      inside = !inside;
  }
  return inside;
};

function traceTurf(ctx, points, scale) {
  const radius = points === teePoints ? 0.65 : 1.0;
  const corners = points.map((p, i) => {
    const prev = points[(i + points.length - 1) % points.length],
      next = points[(i + 1) % points.length];
    const before = Math.hypot(prev[0] - p[0], prev[1] - p[1]),
      after = Math.hypot(next[0] - p[0], next[1] - p[1]);
    const r = Math.min(radius, before / 3, after / 3);
    return {
      p,
      entry: [
        p[0] + ((prev[0] - p[0]) * r) / before,
        p[1] + ((prev[1] - p[1]) * r) / before,
      ],
      exit: [
        p[0] + ((next[0] - p[0]) * r) / after,
        p[1] + ((next[1] - p[1]) * r) / after,
      ],
    };
  });
  ctx.beginPath();
  ctx.moveTo(...scale(...corners.at(-1).exit));
  for (const c of corners) {
    ctx.lineTo(...scale(...c.entry));
    ctx.quadraticCurveTo(...scale(...c.p), ...scale(...c.exit));
  }
  ctx.closePath();
}

export function makeTexture(kind) {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  const rng = randomSource(81);
  const colors = {
    roof: "#6d5140",
    wall: "#e2d9ba",
    stone: "#99988a",
    bark: "#61503a",
    wood: "#87704b",
  };
  ctx.fillStyle = colors[kind] || "#999";
  ctx.fillRect(0, 0, 512, 512);
  if (kind === "roof") {
    for (let y = 0; y < 512; y += 16)
      for (let x = -32; x < 512; x += 32) {
        const px = x + (y % 32 ? 16 : 0);
        const v = Math.floor(rng() * 25);
        ctx.fillStyle = `rgb(${100 + v},${76 + v},${56 + v})`;
        ctx.fillRect(px, y, 31, 15);
        ctx.fillStyle = "#d4b08a35";
        ctx.fillRect(px, y, 31, 1);
        ctx.fillStyle = "#231d2160";
        ctx.fillRect(px + 30, y, 1, 16);
        for (let j = 0; j < 3; j++) {
          ctx.strokeStyle = "#dbb98b14";
          ctx.beginPath();
          ctx.moveTo(px + rng() * 29, y + 1);
          ctx.lineTo(px + rng() * 29, y + 14);
          ctx.stroke();
        }
      }
  } else if (kind === "stone") {
    for (let y = 0; y < 512; y += 48)
      for (let x = -65; x < 512; x += 90) {
        const px = x + (y % 96 ? 40 : 0);
        const v = 110 + rng() * 48;
        ctx.fillStyle = `rgb(${v + 6},${v + 4},${v - 5})`;
        ctx.fillRect(px + 2, y + 2, 86, 44);
        ctx.strokeStyle = "#d8d5c35a";
        ctx.strokeRect(px + 3, y + 3, 83, 41);
      }
  } else if (kind === "wall") {
    for (let y = 0; y < 512; y += 16) {
      ctx.fillStyle = "#96896c45";
      ctx.fillRect(0, y, 512, 1);
      ctx.fillStyle = "#fffce640";
      ctx.fillRect(0, y + 1, 512, 1);
    }
  } else {
    for (let i = 0; i < 900; i++) {
      ctx.strokeStyle = `rgba(25,21,14,${rng() * 0.18})`;
      const x = rng() * 512,
        y = rng() * 512;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + 4, y + 30, x - 5, y + 60, x + 2, y + 100);
      ctx.stroke();
    }
  }
  const image = ctx.getImageData(0, 0, 512, 512);
  for (let i = 0; i < image.data.length; i += 4) {
    const n = (rng() - 0.5) * 15;
    image.data[i] += n;
    image.data[i + 1] += n;
    image.data[i + 2] += n;
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

function groundTexture(painter) {
  const c = document.createElement("canvas");
  c.width = 3072;
  c.height = 2560;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  const sx = c.width / 180,
    sz = c.height / 150;
  const scale = (x, z) => [(x + 90) * sx, (z + 75) * sz];
  const rng = randomSource(465);
  const pixels = ctx.createImageData(c.width, c.height);
  for (let y = 0; y < c.height; y++)
    for (let x = 0; x < c.width; x++) {
      const i = (y * c.width + x) * 4;
      const n =
        (rng() - 0.5) * 27 +
        5 * Math.sin(x * 0.012) * Math.sin(y * 0.009) +
        3 * Math.sin(x * 0.042 + y * 0.024);
      pixels.data[i] = 91 + n;
      pixels.data[i + 1] = 111 + n;
      pixels.data[i + 2] = 51 + n * 0.7;
      pixels.data[i + 3] = 255;
    }
  ctx.putImageData(pixels, 0, 0);
  // Widely spaced patches break up the lawn without introducing a tile grid.
  for (let i = 0; i < 1600; i++) {
    const x = rng() * c.width,
      y = rng() * c.height,
      r = 8 + rng() * 48;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, i % 3 ? "#c6b57a12" : "#304f3520");
    g.addColorStop(1, "#62744300");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.lineJoin = "miter";
  if (!editedGround) {
    tracePath(ctx, riverPoints, scale);
    ctx.strokeStyle = "#777458";
    ctx.lineWidth = 7.8 * sx;
    ctx.stroke();
    ctx.strokeStyle = "#555f48";
    ctx.lineWidth = 6.8 * sx;
    ctx.stroke();
  }
  if (painter) {
    painter(ctx, scale);
  } else {
    const paintTurf = (points, fill, outline, width) => {
      traceTurf(ctx, points, scale);
      ctx.strokeStyle = outline;
      ctx.lineWidth = width * sx;
      ctx.stroke();
      ctx.fillStyle = fill;
      ctx.fill();
    };
    paintTurf(fairwayPoints, "#708d42", "#455f31", 0.5);
    ctx.save();
    traceTurf(ctx, fairwayPoints, scale);
    ctx.clip();
    ctx.translate(...scale(0, 0));
    ctx.rotate(-0.59);
    for (let y = -1800; y < 1800; y += 84) {
      ctx.fillStyle = "#b9c37e28";
      ctx.fillRect(-2200, y, 4400, 41);
      ctx.fillStyle = "#2d5a1c0b";
      ctx.fillRect(-2200, y + 41, 4400, 42);
    }
    ctx.restore();
    paintTurf(greenPoints, "#7f9d4e", "#647f3c", 1.0);
    ctx.save();
    traceTurf(ctx, greenPoints, scale);
    ctx.clip();
    for (let y = 0; y < c.height; y += 31) {
      ctx.fillStyle = "#d6da9620";
      ctx.fillRect(0, y, c.width, 15);
    }
    ctx.restore();
    paintTurf(teePoints, "#809a4a", "#536c37", 0.4);
    for (const pts of bunkerPoints) {
      paintTurf(pts, "#a8986b", "#516338", 0.65);
      traceTurf(ctx, pts, scale);
      ctx.save();
      ctx.clip();
      const bounds = pts.map((p) => scale(...p));
      const x = Math.min(...bounds.map((p) => p[0])),
        y = Math.min(...bounds.map((p) => p[1]));
      const g = ctx.createLinearGradient(x, y, x + 20, y + 80);
      g.addColorStop(0, "#b0a17b");
      g.addColorStop(0.35, "#c9bf98");
      g.addColorStop(1, "#c5bc9c");
      ctx.fillStyle = g;
      ctx.fill();
      for (let i = 0; i < 3500; i++) {
        ctx.fillStyle = i % 2 ? "#78674916" : "#fff7d230";
        ctx.fillRect(x + rng() * 220, y + rng() * 220, 1, 1);
      }
      ctx.restore();
    }
    // Outline the whole network first, then fill it: intersections have no internal seams.
    ctx.lineCap = "butt";
    ctx.lineJoin = "miter";
    for (const [color, extra] of [
      ["#3f5333", 0.35],
      ["#8d8a79", 0],
      ["#bcb59924", -0.5],
    ]) {
      for (const route of paths) {
        tracePath(ctx, route.points, scale);
        ctx.strokeStyle = color;
        ctx.lineWidth = (route.width + extra) * sx;
        ctx.stroke();
      }
    }
  }
  // Fine blades and gravel-sized grain over the painted materials.
  const current = ctx.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < current.data.length; i += 4) {
    const n = (rng() - 0.5) * 8;
    current.data[i] += n;
    current.data[i + 1] += n;
    current.data[i + 2] += n;
  }
  ctx.putImageData(current, 0, 0);
  // Grain must not inherit the wide, round path brush.
  ctx.lineWidth = 0.65;
  ctx.lineCap = "butt";
  for (let i = 0; i < 95000; i++) {
    const x = rng() * c.width,
      y = rng() * c.height;
    ctx.strokeStyle = i % 2 ? "#e1d79b13" : "#263d2816";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.6, y - 1.8);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;
  return texture;
}

export function buildLandscape(scene, painter) {
  const geo = new THREE.PlaneGeometry(260, 230, 520, 300);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, height(pos.getX(i), pos.getZ(i)));
    geo.attributes.uv.setXY(
      i,
      (pos.getX(i) + 90) / 180,
      1 - (pos.getZ(i) + 75) / 150,
    );
  }
  geo.computeVertexNormals();
  const lawnMap = groundTexture(painter);
  const detailCanvas = document.createElement("canvas");
  detailCanvas.width = detailCanvas.height = 256;
  detailCanvas
    .getContext("2d")
    .drawImage(lawnMap.image, 40, 40, 256, 256, 0, 0, 256, 256);
  const detailMap = new THREE.CanvasTexture(detailCanvas);
  detailMap.colorSpace = THREE.SRGBColorSpace;
  detailMap.wrapS = detailMap.wrapT = THREE.RepeatWrapping;
  detailMap.anisotropy = 8;
  const groundMaterial = new THREE.MeshStandardMaterial({
    map: lawnMap,
    roughness: 1,
  });
  const regionalGround = {
    links: [0.55, 0.58, 0.31, 0.55],
    desert: [0.78, 0.57, 0.34, 0.9],
    tropical: [0.3, 0.6, 0.22, 0.45],
  };
  const groundTint = {
    value: new THREE.Vector4(
      ...(regionalGround[editedGround?.environment] || [1, 1, 1, 0]),
    ),
  };
  groundMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.regionalGround = groundTint;
    shader.uniforms.grassDetail = { value: detailMap };
    shader.fragmentShader =
      "uniform sampler2D grassDetail;\nuniform vec4 regionalGround;\n" +
      shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
      if(vMapUv.x<0.0 || vMapUv.x>1.0 || vMapUv.y<0.0 || vMapUv.y>1.0){diffuseColor.rgb=texture2D(grassDetail,vMapUv*vec2(12.0,10.0)).rgb;}
      float grassLuma = dot(diffuseColor.rgb,vec3(0.2126,0.7152,0.0722));
      diffuseColor.rgb = mix(diffuseColor.rgb,regionalGround.rgb * grassLuma * 2.0,regionalGround.a);
    `,
    );
  };
  const terrain = new THREE.Mesh(geo, groundMaterial);
  terrain.receiveShadow = true;
  terrain.name = "terrain";
  scene.add(terrain);
  // Union of water tiles gives bends a full-width connection instead of a narrow diagonal join.
  const positions = [],
    uvs = [];
  for (let x = -130; x < 130; x += 0.5)
    for (let z = 18; z < 34; z += 0.5) {
      if (riverDistance(x + 0.25, z + 0.25) > 2.5) continue;
      for (const [dx, dz] of [
        [0, 0],
        [0, 0.5],
        [0.5, 0],
        [0.5, 0],
        [0, 0.5],
        [0.5, 0.5],
      ]) {
        positions.push(x + dx, -0.63, z + dz);
        uvs.push((x + dx + 130) / 260, (z + dz - 18) / 16);
      }
    }
  const waterGeo = new THREE.BufferGeometry();
  waterGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  waterGeo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  waterGeo.computeVertexNormals();
  const waterMaterial = new THREE.MeshStandardMaterial({
    color: 0x5d9894,
    roughness: 0.23,
    metalness: 0.32,
    transparent: true,
    opacity: 0.86,
  });
  waterMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.flowTime = { value: 0 };
    waterMaterial.userData.shader = shader;
    shader.vertexShader =
      "varying vec3 streamPosition;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nstreamPosition = position;",
      );
    shader.fragmentShader =
      "uniform float flowTime; varying vec3 streamPosition;\n" +
      shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      float wave = sin(streamPosition.x*3.7 + streamPosition.z*12.0 + sin(streamPosition.x*.73-streamPosition.z*.8)*3.0 + flowTime*1.4)*.5 + .5;
      float smallWave = sin(streamPosition.x*7.3 - streamPosition.z*17.0 + sin(streamPosition.z*.4+streamPosition.x*.35)*5.0 - flowTime*2.0)*.5+.5;
      float reflection = sin(streamPosition.x*.29 + sin(streamPosition.z*.73)*2.0)*.5+.5;
      diffuseColor.rgb *= .65 + reflection*.27 + wave*smallWave*.22;
      diffuseColor.rgb += vec3(.06,.08,.07) * pow(wave*smallWave, 8.0);
    `,
    );
  };
  const water = new THREE.Mesh(waterGeo, waterMaterial);
  water.receiveShadow = true;
  scene.add(water);
  const waterCanvas = document.createElement("canvas");
  waterCanvas.width = waterCanvas.height = 256;
  const wc = waterCanvas.getContext("2d");
  wc.fillStyle = "#8080ff";
  wc.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y++) {
    const v = Math.round(
      128 + 20 * Math.sin(y * 0.22) + 8 * Math.sin(y * 0.77),
    );
    wc.fillStyle = `rgb(128,${v},251)`;
    wc.fillRect(0, y, 256, 1);
  }
  const normal = new THREE.CanvasTexture(waterCanvas);
  normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
  normal.repeat.set(30, 4);
  waterMaterial.normalMap = normal;
  waterMaterial.normalScale.set(0.28, 0.28);
  // Broken, short reflections imply flow without painting white lines across the stream.
  const rippleGeo = new THREE.PlaneGeometry(1, 0.024);
  rippleGeo.rotateX(-Math.PI / 2);
  const ripples = new THREE.InstancedMesh(
    rippleGeo,
    new THREE.MeshBasicMaterial({
      color: 0xc7dbce,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
    }),
    220,
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 220; i++) {
    const x = random() * 174 - 87;
    dummy.position.set(
      x,
      -0.607,
      riverZ(x) + (random() - 0.5) * riverWidth(x) * 1.5,
    );
    dummy.scale.set(0.2 + random() * 0.9, 1, 1);
    dummy.rotation.y = (random() - 0.5) * 0.4;
    dummy.updateMatrix();
    ripples.setMatrixAt(i, dummy.matrix);
  }
  scene.add(ripples);
  return {
    terrain,
    reshape: () => {
      groundTint.value.set(
        ...(regionalGround[editedGround?.environment] || [1, 1, 1, 0]),
      );
      water.visible = ripples.visible = !editedGround;
      for (let i = 0; i < pos.count; i++)
        pos.setY(i, height(pos.getX(i), pos.getZ(i)));
      pos.needsUpdate = true;
      geo.computeVertexNormals();
      geo.computeBoundingSphere();
    },
    water,
    animate: (time) => {
      if (waterMaterial.userData.shader)
        waterMaterial.userData.shader.uniforms.flowTime.value = time;
      normal.offset.x = time * 0.013;
      normal.offset.y = time * 0.018;
      ripples.material.opacity = 0.19 + Math.sin(time * 0.7) * 0.035;
    },
  };
}
