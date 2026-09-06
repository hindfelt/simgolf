import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { buildLandscape, height, riverZ } from "./landscape.js";
import { buildClubhouse, buildBridge, bench } from "./architecture.js";
import { buildFlora, buildFlowers } from "./flora.js";
import { buildActors } from "./actors.js";
import "./style.css";

const host = document.querySelector("#world");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x83917a);
scene.fog = new THREE.Fog(0x83917a, 185, 285);
let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
} catch (error) {
  document.querySelector("#loading").innerHTML =
    "<h2>This scene needs WebGL</h2><p>Please open it in a browser with hardware acceleration enabled.</p>";
  throw error;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.domElement.tabIndex = 0;
renderer.domElement.setAttribute(
  "aria-label",
  "Willow Brook 3D scene. Drag to pan, scroll to zoom.",
);
host.append(renderer.domElement);
const camera = new THREE.OrthographicCamera(-65, 65, 45, -45, 0.1, 340);
const initialTarget = new THREE.Vector3(-2, 0, 1);
camera.position.set(-52, 105, 124);
camera.lookAt(initialTarget);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(initialTarget);
controls.enableRotate = false;
controls.screenSpacePanning = false;
controls.enableDamping = true;
controls.dampingFactor = 0.12;
controls.panSpeed = 0.85;
controls.zoomSpeed = 0.7;
controls.minZoom = 0.7;
controls.maxZoom = 3.8;
controls.mouseButtons = {
  LEFT: THREE.MOUSE.PAN,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.PAN,
};
controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN };
scene.add(new THREE.HemisphereLight(0xe2ebdf, 0x6f7552, 1.65));
const sun = new THREE.DirectionalLight(0xffe4b2, 2.3);
sun.position.set(-48, 80, -38);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, {
  left: -88,
  right: 88,
  top: 88,
  bottom: -88,
  near: 1,
  far: 210,
});
sun.shadow.normalBias = 0.045;
sun.shadow.bias = -0.00006;
sun.shadow.radius = 2;
scene.add(sun);
scene.add(sun.target);
const fill = new THREE.DirectionalLight(0xc8d9e5, 0.4);
fill.position.set(50, 35, 80);
scene.add(fill);

let landscape, clubhouse, bridge, flora, flowers, actors;
const selectable = [];
const pickMaterial = new THREE.MeshBasicMaterial({ visible: false });
function pickBox(name, x, y, z, w, h, d) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), pickMaterial);
  m.position.set(x, y, z);
  m.userData.feature = name;
  scene.add(m);
  selectable.push(m);
  return m;
}

const features = {
  overview: {
    title: "An afternoon at Willow Brook",
    kicker: "THE FIRST FAIRWAY",
    description:
      "A living art study: warm stone, striped fairways, moving water and a little work for the groundskeeper.",
    target: [-2, 0, 1],
    zoom: 1,
  },
  clubhouse: {
    title: "The old country clubhouse",
    kicker: "ARCHITECTURE · PARKLAND",
    description:
      "Shingled roofs, deep verandas, framed windows and flower borders. A developed resort building for this art study.",
    target: [-29, 2, -22],
    zoom: 2.45,
    label: [-29, 15, -21],
  },
  bridge: {
    title: "Over the brook",
    kicker: "WATER · STONE · LIGHT",
    description:
      "Flowing water catches the afternoon light beneath the raised stone footbridge. Gravel paths lead back to the club.",
    target: [-7, 0, riverZ(-7)],
    zoom: 2.8,
    label: [-7, 2, riverZ(-7)],
  },
  garden: {
    title: "Do not forget the dandelions",
    kicker: "THE GROUNDSKEEPER’S CORNER",
    description:
      "Individual yellow flowers, seed heads and low leaf rosettes. The gardener is animated here; maintenance rules follow in the playable milestone.",
    target: [20, 0, 35],
    zoom: 3.1,
    label: [21, 3, 36],
  },
  green: {
    title: "One last shot",
    kicker: "HOLE 1 · THE GREEN",
    description:
      "A close-cut putting surface, pale sand, a moving flag and a golfer on the tee. The ball flight is an animation study.",
    target: [30, 0, -23],
    zoom: 2.6,
    label: [32, 3.5, -25],
  },
};
let focusAnimation = null,
  currentFeature = "overview",
  paused = matchMedia("(prefers-reduced-motion: reduce)").matches,
  elapsed = 0,
  ready = false;
function resize() {
  const aspect = innerWidth / innerHeight;
  const width = aspect < 0.8 ? 60 : 118;
  camera.left = -width / 2;
  camera.right = width / 2;
  camera.top = width / aspect / 2;
  camera.bottom = -width / aspect / 2;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}
resize();
addEventListener("resize", resize);
function selectFeature(name, move = true) {
  const f = features[name];
  if (!f) return;
  currentFeature = name;
  document.querySelector("#selection-title").textContent = f.title;
  document.querySelector("#selection-kicker").textContent = f.kicker;
  document.querySelector("#selection-description").textContent = f.description;
  document
    .querySelectorAll("[data-focus]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.focus === name)),
    );
  const label = document.querySelector("#label");
  label.textContent = f.title;
  label.hidden = !f.label;
  if (move) {
    focusAnimation = {
      from: controls.target.clone(),
      to: new THREE.Vector3(...f.target),
      zoomFrom: camera.zoom,
      zoomTo: f.zoom,
      start: performance.now(),
    };
  }
}
controls.addEventListener("start", () => {
  focusAnimation = null;
  document.querySelector("#gesture-hint").style.opacity = ".35";
});
document
  .querySelectorAll("[data-focus]")
  .forEach((b) =>
    b.addEventListener("click", () => selectFeature(b.dataset.focus)),
  );
document
  .querySelector("#home")
  .addEventListener("click", () => selectFeature("overview"));
function zoom(factor) {
  focusAnimation = null;
  camera.zoom = THREE.MathUtils.clamp(
    camera.zoom * factor,
    controls.minZoom,
    controls.maxZoom,
  );
  camera.updateProjectionMatrix();
}
document.querySelector("#zoom-in").addEventListener("click", () => zoom(1.25));
document.querySelector("#zoom-out").addEventListener("click", () => zoom(0.8));
function updatePause() {
  document.querySelector("#pause").setAttribute("aria-pressed", String(paused));
  document
    .querySelector("#pause")
    .setAttribute(
      "aria-label",
      paused ? "Resume animation" : "Pause animation",
    );
  document.querySelector("#pause").textContent = paused ? "▶" : "Ⅱ";
  document.querySelector("#animation-status").textContent = paused
    ? "ANIMATION PAUSED"
    : "SCENE RUNNING";
}
document.querySelector("#pause").addEventListener("click", () => {
  paused = !paused;
  updatePause();
});
updatePause();
function toggleUI() {
  const hidden = document.body.classList.toggle("ui-hidden");
  document.querySelector("#restore-ui").hidden = !hidden;
}
document.querySelector("#view-toggle").addEventListener("click", toggleUI);
document.querySelector("#restore-ui").addEventListener("click", toggleUI);
const help = document.querySelector("#help-dialog");
document
  .querySelector("#help")
  .addEventListener("click", () => help.showModal());
document
  .querySelector("#close-help")
  .addEventListener("click", () => help.close());
const conceptOverlay = document.querySelector("#concept-overlay");
document.querySelector("#concept-toggle").addEventListener("click", () => {
  conceptOverlay.hidden = false;
  document.querySelector("#close-concept").focus();
});
document.querySelector("#close-concept").addEventListener("click", () => {
  conceptOverlay.hidden = true;
  document.querySelector("#concept-toggle").focus();
});
addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLButtonElement || help.open) return;
  if (e.code === "Space") {
    e.preventDefault();
    paused = !paused;
    updatePause();
  }
  if (e.key.toLowerCase() === "h") toggleUI();
  if (e.key === "Escape") {
    conceptOverlay.hidden = true;
    selectFeature("overview");
  }
  if (e.key === "Home") selectFeature("overview");
  if (e.key === "+") zoom(1.25);
  if (e.key === "-") zoom(0.8);
});
const raycaster = new THREE.Raycaster();
let pointerStart = null,
  pointers = new Set(),
  gestureMoved = false;
renderer.domElement.addEventListener("pointerdown", (e) => {
  pointers.add(e.pointerId);
  if (pointers.size === 1) {
    pointerStart = [e.clientX, e.clientY];
    gestureMoved = false;
  } else gestureMoved = true;
});
renderer.domElement.addEventListener("pointermove", (e) => {
  if (
    pointerStart &&
    Math.hypot(e.clientX - pointerStart[0], e.clientY - pointerStart[1]) > 6
  )
    gestureMoved = true;
});
renderer.domElement.addEventListener("pointercancel", (e) => {
  pointers.delete(e.pointerId);
  pointerStart = null;
});
renderer.domElement.addEventListener("pointerup", (e) => {
  pointers.delete(e.pointerId);
  if (!pointerStart || gestureMoved || !ready) return;
  raycaster.setFromCamera(
    new THREE.Vector2(
      (e.clientX / innerWidth) * 2 - 1,
      (-e.clientY / innerHeight) * 2 + 1,
    ),
    camera,
  );
  const hits = raycaster.intersectObjects(selectable);
  if (hits.length) selectFeature(hits[0].object.userData.feature, false);
  pointerStart = null;
});

// Leave a frame for the loading state before constructing the detailed scene.
await new Promise((resolve) =>
  requestAnimationFrame(() => setTimeout(resolve, 20)),
);
try {
  landscape = buildLandscape(scene);
  clubhouse = buildClubhouse(scene);
  bridge = buildBridge(scene);
  flora = buildFlora(scene);
  flowers = buildFlowers(scene);
  actors = buildActors(scene);
  for (const [x, z, r] of [
    [-40, -1, 0.6],
    [-12, -13, 0.6],
    [8, -26, 0.6],
    [-16, 34, 0.4],
    [31, 36, -0.4],
  ])
    bench(scene, x, z, r);
  pickBox("clubhouse", -29, 6, -23, 28, 14, 22);
  pickBox("bridge", -7, 1, riverZ(-7), 4, 3, 11);
  pickBox("garden", 21, 1, 36, 9, 3, 8);
  pickBox("green", 32, 0.5, -25, 16, 1, 13);
  renderer.compile(scene, camera);
  ready = true;
  document.querySelector("#loading").classList.add("done");
} catch (error) {
  document.querySelector("#loading").innerHTML =
    "<h2>The scene could not finish loading.</h2><p>Reload to try again.</p>";
  throw error;
}

let previous = performance.now(),
  frames = 0,
  frameWindow = previous,
  measuredFps = 0;
const projected = new THREE.Vector3();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - previous) / 1000, 0.05);
  previous = now;
  if (document.hidden || !conceptOverlay.hidden) return;
  if (!paused) elapsed += dt;
  if (focusAnimation) {
    const t = Math.min(1, (now - focusAnimation.start) / 950),
      ease = t * t * (3 - 2 * t),
      next = focusAnimation.from.clone().lerp(focusAnimation.to, ease);
    camera.position.add(next.clone().sub(controls.target));
    controls.target.copy(next);
    camera.zoom = THREE.MathUtils.lerp(
      focusAnimation.zoomFrom,
      focusAnimation.zoomTo,
      ease,
    );
    camera.updateProjectionMatrix();
    if (t === 1) focusAnimation = null;
  }
  controls.update();
  const old = controls.target.clone();
  controls.target.x = THREE.MathUtils.clamp(controls.target.x, -55, 55);
  controls.target.z = THREE.MathUtils.clamp(controls.target.z, -43, 48);
  camera.position.add(controls.target.clone().sub(old));
  landscape.animate(elapsed);
  actors.animate(elapsed);
  const f = features[currentFeature];
  if (f.label) {
    projected.set(...f.label).project(camera);
    const el = document.querySelector("#label");
    el.style.left = `${(projected.x * 0.5 + 0.5) * innerWidth}px`;
    el.style.top = `${(-projected.y * 0.5 + 0.5) * innerHeight - 13}px`;
    el.hidden =
      projected.z > 1 ||
      projected.x < -1 ||
      projected.x > 1 ||
      projected.y < -1 ||
      projected.y > 1 ||
      document.body.classList.contains("ui-hidden");
  }
  renderer.render(scene, camera);
  frames++;
  if (now - frameWindow > 2000) {
    measuredFps = Math.round((frames * 1000) / (now - frameWindow));
    document.querySelector("#performance").textContent =
      `${measuredFps} fps · Live 3D`;
    frames = 0;
    frameWindow = now;
  }
}
requestAnimationFrame(frame);

// Read-only diagnostics for browser validation; no game rules are represented by this art scene.
window.__artTest = {
  terrainColor: (x, z) => {
    const canvas = landscape.terrain.material.map.image;
    return Array.from(
      canvas
        .getContext("2d")
        .getImageData(
          Math.floor(((x + 90) / 180) * canvas.width),
          Math.floor(((z + 75) / 150) * canvas.height),
          1,
          1,
        ).data,
    );
  },
  getState: () => ({
    ready,
    paused,
    elapsed,
    feature: currentFeature,
    zoom: camera.zoom,
    target: controls.target.toArray(),
    fps: measuredFps,
    drawCalls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    trees: flora.treeCount,
    dandelions: flowers.count,
    viewport: [innerWidth, innerHeight],
    conceptVisible: !conceptOverlay.hidden,
    ball: {
      position: actors.ball.position.toArray(),
      phase: actors.ball.userData.phase,
    },
  }),
};
