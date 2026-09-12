import {aircraftPose} from "../simulation/aircraft.js";
import {practicePose} from "./practice-activity.js";
import {tennisPose,updateTennisBall} from "./tennis-activity.js";
import {facilityLighting} from './facility-lighting.js';
import {coastalPreview} from './coastal-preview.js';
import { boundaryEdges } from "./boundary-outline.js";
import { housing } from "./housing.js";
import { COAST_WATER } from "./coastal-style.js";
import { transportFacility } from "./transport-facilities.js";
import { regionalRecreation } from "./regional-recreation.js";
import { swimClub } from "./swim-club.js";
import { golfCart, cartGarage } from "./cart-garage.js";
import { ridesCart } from "../simulation/carts.js";
import { lie } from "../simulation/game.js";
import { snackBar } from "./snack-bar.js";
import { resortHotel } from "./hotel.js";
import { flowerbed } from "./flowerbed.js";
import { bridgeEdges, bridgeDeckHeights, bridgeWalkHeight } from "./bridge-layout.js";
import { connectedPathCells, connected } from "../simulation/game.js";
import { plantedTrees } from "./planted-trees.js";
import { tennisCourt } from "./tennis-court.js";
import { trainingFacility } from "./training-facilities.js";
import { TRAINING_FACILITIES, FACILITIES } from "../simulation/facilities.js";
import { lighthouse } from "./lighthouse.js";
import { church } from "./church.js";
import { buildHazardView } from "./hazards.js";
import { TERRAIN } from "../simulation/terrain.js";
import * as THREE from "three";
import { terrainContours, roundedTerrainPath } from "./terrain-outline.js";
import { GRID, key, center, onBridge, riverZ } from "../simulation/world.js";
import { height, courseHeight } from "../landscape.js";
import { person } from "../actors.js";
import { bench } from "../architecture.js";
function travelHeight(g, pos) {
  let y = bridgeWalkHeight(g,pos) ?? height(pos.x, pos.z);
  if (!g.starterBridgeRemoved && onBridge(pos.x, pos.z))
    y = Math.max(
      y,
      Math.sin(
        Math.PI * Math.max(0, Math.min(1, (pos.z - (riverZ(-7) - 5.2)) / 10.4)),
      ) * 1.3,
    );
  return y;
}

const colors = Object.fromEntries(
  Object.entries(TERRAIN)
    .filter(([type]) => type !== "rough")
    .map(([type, t]) => [type, t.color]),
);
export function buildCourseView(scene) {
  const hazards = buildHazardView(scene);
  const trees = plantedTrees(scene);
  const canvas = document.createElement("canvas"),
    px = 32;
  canvas.width = GRID.width * px;
  canvas.height = GRID.height * px;
  const ctx = canvas.getContext("2d"),
    texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const geo = new THREE.PlaneGeometry(
    GRID.width * 2,
    GRID.height * 2,
    GRID.width * 4,
    GRID.height * 4,
  );
  geo.rotateX(-Math.PI / 2);
  geo.translate(GRID.minX + GRID.width, 0, GRID.minZ + GRID.height);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++)
    pos.setY(i, height(pos.getX(i), pos.getZ(i)) + 0.045);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.1,
      roughness: 1,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    }),
  );
  mesh.receiveShadow = true;
  scene.add(mesh);
  const avatarMap = new Map(),
    facilityMap = new Map();
  const weedHeads = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.12, 6, 4),
    new THREE.MeshStandardMaterial({ color: 0xf7cf37, roughness: 1 }),
    180 * 7,
  );
  const weedLeaves = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.25, 6, 4),
    new THREE.MeshStandardMaterial({ color: 0x57702e, roughness: 1 }),
    180 * 7,
  );
  weedHeads.count = weedLeaves.count = 0;
  scene.add(weedHeads, weedLeaves);
  const dummy = new THREE.Object3D();
  let revision = -1,
    weedRevision = -1;
  const flag = new THREE.Group();
  scene.add(flag);
  function add(geometry, color, x, y, z, parent = flag) {
    const m = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ color, roughness: 0.85 }),
    );
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  }
  add(new THREE.CylinderGeometry(0.035, 0.035, 3.2, 7), 0xf4e7cd, 0, 1.6, 0);
  add(
    new THREE.PlaneGeometry(1.1, 0.6),
    0xb84945,
    0.55,
    2.85,
    0,
  ).material.side = THREE.DoubleSide;
  const cup = add(new THREE.CircleGeometry(0.15, 16), 0x233122, 0, 0.08, 0);
  cup.rotation.x = -Math.PI / 2;
  const markers = new THREE.Group();
  scene.add(markers);
  for (const x of [-1.4, 1.4])
    add(new THREE.SphereGeometry(0.16, 8, 6), 0xf2ecdc, x, 0.15, 0, markers);
  const teeArrow = add(
    new THREE.ConeGeometry(0.45, 0.9, 3),
    0xf3ebc4,
    0,
    0.13,
    1.2,
    markers,
  );
  teeArrow.rotation.x = Math.PI / 2;
  const guide = new THREE.Line(
    new THREE.BufferGeometry(),
    new THREE.LineDashedMaterial({
      color: 0xffffdd,
      dashSize: 1,
      gapSize: 0.6,
      transparent: true,
      opacity: 0.85,
      depthTest: false,
      depthWrite: false,
    }),
  );
  guide.renderOrder = 7;
  scene.add(guide);
  const holeViews = new Map();
  flag.visible = markers.visible = guide.visible = false;
  const construction = new THREE.Group();
  scene.add(construction);
  function rebuild(g) {
    for (let i = 0; i < pos.count; i++)
      pos.setY(i, height(pos.getX(i), pos.getZ(i)) + 0.045);
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    while (construction.children.length) {
      const child = construction.children[0];
      child.traverse((o) => {
        o.geometry?.dispose();
        o.material?.dispose();
      });
      construction.remove(child);
    }
    for (const k of Object.keys(g.bridges || {})) {
      const c = Number(k) % GRID.width,
        r = Math.floor(Number(k) / GRID.width),
        p = center(c, r);
      const edges = bridgeEdges(g, c, r);
      const eastWest = edges.some((e) => e.dc && e.deck);
      const deck = new THREE.Group();
      deck.name = `bridge-deck-${k}`;
      deck.position.set(p.x, bridgeDeckHeights(g)[k] - 0.09, p.z);
      construction.add(deck);
      add(new THREE.BoxGeometry(2.01, 0.18, 2.01), 0x977b51, 0, 0, 0, deck);
      // Side stringers and a second handrail make the deck read as a wooden
      // bridge at the normal isometric zoom, rather than floating thin rails.
      const posts = new Set();
      for (const { dc, dr, rail, deck: adjacentDeck } of edges) {
        if (!rail && !adjacentDeck) {
          const bankY=courseHeight(g,p.x+dc*2,p.z+dr*2)+.045-deck.position.y;
          const vertices=[];
          for(const [reach,side] of [[1,-1],[2,-1],[1,1],[1,1],[2,-1],[2,1]])
            vertices.push(dc*reach+dr*side,reach===1?.09:bankY,dr*reach+dc*side);
          const geometry=new THREE.BufferGeometry();
          geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
          const ramp=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0x977b51,roughness:.85,side:THREE.DoubleSide}));
          ramp.name='bridge-bank-approach';ramp.receiveShadow=true;deck.add(ramp);
        }
        if (!rail) continue;
        add(new THREE.BoxGeometry(dc ? 0.12 : 2, 0.18, dr ? 0.12 : 2),
          0x725739, dc*0.92, -0.13, dr*0.92, deck);
        add(new THREE.BoxGeometry(dc ? 0.07 : 2, 0.08, dr ? 0.07 : 2),
          0xa58b60, dc*0.92, 0.4, dr*0.92, deck);
        add(
          new THREE.BoxGeometry(dc ? 0.08 : 2, 0.1, dr ? 0.08 : 2),
          0xb39a6b,
          dc * 0.92,
          0.75,
          dr * 0.92,
          deck,
        );
        for (const t of [-0.92, 0.92]) {
          const x = dc ? dc * 0.92 : t,
            z = dr ? dr * 0.92 : t,
            k = `${x},${z}`;
          if (posts.has(k)) continue;
          posts.add(k);
          add(
            new THREE.BoxGeometry(0.1, 0.85, 0.1),
            0x725739,
            x,
            0.37,
            z,
            deck,
          );
        }
      }
      for (let t = -0.9; t < 1; t += 0.22)
        add(
          new THREE.BoxGeometry(
            eastWest ? 0.025 : 1.85,
            0.02,
            eastWest ? 1.85 : 0.025,
          ),
          0x5d4a34,
          eastWest ? t : 0,
          0.1,
          eastWest ? 0 : t,
          deck,
        );
    }
    for (const k of Object.keys(g.outOfBounds || {})) {
      const c = Number(k) % GRID.width,
        r = Math.floor(Number(k) / GRID.width),
        p = center(c, r);
      if (c > 0 && c < GRID.width - 1 && r > 0 && r < GRID.height - 1 &&
          [[1,0],[-1,0],[0,1],[0,-1]].every(([dc,dr]) => g.outOfBounds[key(c+dc,r+dr)])) continue;
      add(new THREE.BoxGeometry(0.13, 1.2, 0.13), 0xf5f1df,
        p.x, height(p.x, p.z) + 0.6, p.z, construction);
    }
    const boundaryLine = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(boundaryEdges(g.outOfBounds).flatMap(edge =>
        edge.map(([x, z]) => new THREE.Vector3(x, height(x, z) + 0.14, z)))),
      new THREE.LineBasicMaterial({ color: 0xf5f1df, transparent: true, opacity: 0.75, depthWrite: false }),
    );
    construction.add(boundaryLine);
    const connectedPaths = connectedPathCells(g);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const kind of Object.keys(colors)) {
      const entries = Object.entries(g.tiles).filter(
        ([, t]) => t.type === kind,
      );
      const cells = entries.map(([k]) => [
        Number(k) % GRID.width,
        Math.floor(Number(k) / GRID.width),
      ]);
      // Continue the contour beyond the canvas so the sea has no grass collar
      // at the artificial edge of the buildable property.
      if (kind === "water" && g.landscapeStyle === "coast")
        for (const [c, r] of [...cells])
          if (c === GRID.width - 1) cells.push([GRID.width, r]);
      const contours = terrainContours(cells);
      const outline = roundedTerrainPath(
        contours,
        px,
        kind === "path" ? px * 0.25 : px * 0.9,
      );
      ctx.save();
      ctx.clip(outline, "evenodd");
      for (const [k, t] of entries) {
        const c = Number(k) % GRID.width,
          r = Math.floor(Number(k) / GRID.width),
          p = center(c, r);
        const muddy = kind === "path" && !connectedPaths.has(Number(k));
        ctx.fillStyle = muddy
          ? "#776847"
          : kind === "water" && g.environment === "tropical"
            ? "#42b8ad"
          : kind === "water" && g.landscapeStyle === "coast"
            ? COAST_WATER
            : colors[t.type];
        ctx.fillRect(c * px, r * px, px, px);
        if (["fairway", "firm", "green", "tee"].includes(t.type)) {
          ctx.fillStyle = c % 2 ? "#b9c37e28" : "#2d5a1c0b";
          ctx.fillRect(c * px, r * px, px, px);
        }
        // Stable fine grain gives editable tiles the same textured finish as the base lawn.
        for (let n = 0; n < 35; n++) {
          const x = (n * 17 + c * 7) % px,
            y = (n * 11 + r * 3) % px;
          ctx.fillStyle = n % 2 ? "#e5dfa01c" : "#25351e15";
          ctx.fillRect(c * px + x, r * px + y, 1, 1);
        }
        if (muddy) {
          const horizontal = [-1, 1].some(
            (dx) => g.tiles[key(c + dx, r)]?.type === "path",
          );
          const vertical = [-1, 1].some(
            (dz) => g.tiles[key(c, r + dz)]?.type === "path",
          );
          ctx.fillStyle = "#5f543a";
          for (const offset of [0.28, 0.7]) {
            if (horizontal || !vertical)
              ctx.fillRect(c * px, r * px + px * offset, px, px * 0.09);
            if (vertical)
              ctx.fillRect(c * px + px * offset, r * px, px * 0.09, px);
          }
        }
        if (t.crabgrass) {
          ctx.strokeStyle = "#395723";
          ctx.lineWidth = 2;
          for (let n = 0; n < 7; n++) {
            const x = c * px + 6 + ((n * 9) % 20),
              y = r * px + 6 + ((n * 7) % 20);
            for (let blade = 0; blade < 5; blade++) {
              const angle = (blade * Math.PI * 2) / 5;
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(x + Math.cos(angle) * 5, y + Math.sin(angle) * 5);
              ctx.stroke();
            }
          }
        }
        if (t.wear) {
          ctx.fillStyle = "#9b875d";
          for (let n = 0; n < Math.min(t.wear, 8); n++)
            ctx.fillRect(
              c * px + 5 + ((n * 7) % 22),
              r * px + 5 + ((n * 11) % 22),
              3,
              2,
            );
        }
      }
      if (kind === "pot-bunker") {
        ctx.strokeStyle = "#514f30";
        ctx.lineWidth = px * 0.85;
        ctx.stroke(outline);
      }
      // A continuous grass collar hugs the complete shape, including rounded corners.
      // Clip the stroke inward so paths and neighbouring surfaces stay unobstructed.
      ctx.strokeStyle = kind === "water" && g.environment === "tropical" ? "#dfd6a3" : kind === "path" ? "#586344" : "#456534";
      ctx.lineWidth = kind === "path" ? px * 0.16 : px * 0.55;
      ctx.lineJoin = "round";
      ctx.stroke(outline);
      ctx.restore();
    }
    const grain = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let seed = 9173;
    for (let i = 0; i < grain.data.length; i += 4) {
      if (!grain.data[i + 3]) continue;
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const n = (seed / 4294967296 - 0.5) * 18;
      grain.data[i] += n;
      grain.data[i + 1] += n;
      grain.data[i + 2] += n;
    }
    ctx.putImageData(grain, 0, 0);
    texture.needsUpdate = true;
    for (const [id, visual] of holeViews)
      if (!g.holes.some((h) => h.id === id)) {
        scene.remove(visual.flag, visual.markers, visual.guide);
        visual.guide.geometry.dispose();
        visual.flag.children[1].material.dispose();
        visual.label.material.map.dispose();
        visual.label.material.dispose();
        holeViews.delete(id);
      }
    for (const [id, group] of facilityMap)
      if (
        !g.facilities.some(
          (f) => f.id === id && f.type === group.userData.facilityType,
        )
      ) {
        disposeGroup(group);
        facilityMap.delete(id);
      }
    for (const [index, hole] of g.holes.entries()) {
      let visual = holeViews.get(hole.id);
      if (!visual) {
        const f = flag.clone(true),
          m = markers.clone(true),
          line = guide.clone();
        line.geometry = new THREE.BufferGeometry();
        f.children[1].material = f.children[1].material.clone();
        const labelCanvas = document.createElement("canvas");
        labelCanvas.width = labelCanvas.height = 64;
        const labelContext = labelCanvas.getContext("2d");
        labelContext.fillStyle = "#f9f0c5";
        labelContext.font = "bold 46px Georgia";
        labelContext.textAlign = "center";
        labelContext.fillText(String(index + 1), 32, 48);
        const label = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: new THREE.CanvasTexture(labelCanvas),
            depthTest: false,
          }),
        );
        label.position.set(0, 4.2, 0);
        label.scale.set(1.8, 1.8, 1);
        f.add(label);
        line.renderOrder = 7;
        scene.add(f, m, line);
        visual = { flag: f, markers: m, guide: line, label, number: index + 1 };
        holeViews.set(hole.id, visual);
      }
      if (visual.number !== index + 1) {
        const canvas = visual.label.material.map.image,
          ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, 64, 64);
        ctx.fillText(String(index + 1), 32, 48);
        visual.label.material.map.needsUpdate = true;
        visual.number = index + 1;
      }
      visual.flag.visible = !!hole.green;
      visual.markers.visible = !!hole.tee;
      if (hole.green) {
        const p = hole.green;
        visual.flag.position.set(p.x, height(p.x, p.z), p.z);
        visual.flag.children[1].material.color.set(
          hole.open ? 0xc84141 : 0xe5c557,
        );
      }
      if (hole.tee) {
        const p = hole.tee;
        visual.markers.position.set(p.x, height(p.x, p.z) + 0.06, p.z);
        visual.markers.rotation.y = ((p.direction || 0) * Math.PI) / 4;
      }
      visual.guide.visible = !!(hole.tee && hole.green && !hole.open);
      if (visual.guide.visible) {
        visual.guide.geometry.dispose();
        visual.guide.geometry = new THREE.BufferGeometry().setFromPoints(
          [hole.tee, hole.green].map(
            (p) => new THREE.Vector3(p.x, height(p.x, p.z) + 0.18, p.z),
          ),
        );
        visual.guide.computeLineDistances();
      }
    }
    for (const f of g.facilities) {
      let group=facilityMap.get(f.id);
      if(!group){
        group=makeFacility(f);
        group.userData.facilityType=f.type;
        facilityMap.set(f.id,group);
      }
      facilityLighting(group,FACILITIES[f.type]?.scenery ? 'scenery' : connected(g,f) ? 'connected' : 'disconnected');
    }
  }
  function makeFacility(f) {
    const p = center(f.c, f.r);
    let group;
    if (["building-lot", "home"].includes(f.type))
      group = housing(scene, f.type, p.x, p.z);
    else if (["marina", "helipad", "airstrip"].includes(f.type))
      group = transportFacility(scene, f.type, p.x, p.z);
    else if (f.type === "lighthouse") group = lighthouse(scene, p.x, p.z);
    else if (f.type === "church") group = church(scene, p.x, p.z);
    else if (f.type === "snack") group = snackBar(scene, p.x, p.z);
    else if (f.type === "cart-garage") group = cartGarage(scene, p.x, p.z);
    else if (f.type === "hotel") group = resortHotel(scene, p.x, p.z);
    else if (f.type === "flowerbed") group = flowerbed(scene, p.x, p.z);
    else if (["stable", "spa"].includes(f.type))
      group = regionalRecreation(scene, f.type, p.x, p.z);
    else if (f.type === "swim-club") group = swimClub(scene, p.x, p.z);
    else if (f.type === "tennis-court") group = tennisCourt(scene, p.x, p.z);
    else if (TRAINING_FACILITIES.includes(f.type))
      group = trainingFacility(scene, f.type, p.x, p.z);
    else if (f.type === "ballwasher") {
      group = new THREE.Group();
      group.position.set(p.x, height(p.x, p.z), p.z);
      scene.add(group);
      add(
        new THREE.CylinderGeometry(0.12, 0.16, 1.3, 8),
        0x354b44,
        0,
        0.65,
        0,
        group,
      );
      add(new THREE.BoxGeometry(0.65, 0.65, 0.5), 0x64794b, 0, 1.35, 0, group);
      add(
        new THREE.CylinderGeometry(0.09, 0.09, 0.3, 8),
        0xb8b6a0,
        0,
        1.8,
        0,
        group,
      );
      add(new THREE.BoxGeometry(0.35, 0.1, 0.12), 0x473828, 0, 1.95, 0, group);
      add(
        new THREE.BoxGeometry(0.25, 0.55, 0.06),
        0xf0e7cc,
        0.38,
        1.15,
        0,
        group,
      );
    } else if (f.type === "bench") group = bench(scene, p.x, p.z, Math.PI / 2);
    else {
      group = new THREE.Group();
      group.position.set(p.x, height(p.x, p.z), p.z);
      scene.add(group);
      add(new THREE.BoxGeometry(3.6, 2.6, 3.3), 0xe3d5b1, 0, 1.3, 0, group);
      const roof = add(
        new THREE.CylinderGeometry(0, 3.3, 1.2, 4),
        0x78573a,
        0,
        3.15,
        0,
        group,
      );
      roof.rotation.y = Math.PI / 4;
      add(new THREE.BoxGeometry(2.9, 1, 0.1), 0x354b44, 0, 1.65, 1.7, group);
      add(new THREE.BoxGeometry(3.2, 0.16, 0.7), 0xbdaa79, 0, 1.05, 1.9, group);
    }
    group.rotation.y = ((f.rotation || 0) * Math.PI) / 2;
    return group;
  }
  let preview = null,
    previewType = null;
  function disposeGroup(group) {
    group.traverse((o) => {
      o.geometry?.dispose();
      if (o.material)
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          m.map?.dispose();
          m.dispose();
        }
    });
    scene.remove(group);
  }
  return {
    pickTree(raycaster) {
      return trees.pick(raycaster);
    },
    previewFacility(f, valid = true) {
      if (!f) {
        if (preview) preview.visible = false;
        return;
      }
      if (previewType !== f.type) {
        if (preview) disposeGroup(preview);
        preview = makeFacility(f);
        previewType = f.type;
        preview.traverse((o) => {
          if (!o.material) return;
          o.material = Array.isArray(o.material)
            ? o.material.map((m) => m.clone())
            : o.material.clone();
          for (const m of Array.isArray(o.material)
            ? o.material
            : [o.material]) {
            m.transparent = true;
            m.opacity = 0.48;
            m.depthWrite = false;
          }
          o.castShadow = false;
        });
      }
      const p = center(f.c, f.r);
      preview.position.set(p.x, height(p.x, p.z), p.z);
      preview.rotation.y = ((f.rotation || 0) * Math.PI) / 2;
      preview.visible = true;
      preview.traverse((o) => {
        for (const m of o.material
          ? Array.isArray(o.material)
            ? o.material
            : [o.material]
          : [])
          if (m.emissive) m.emissive.set(valid ? 0x183500 : 0x8a1308);
      });
    },
    visibleActors() {
      return [...avatarMap].map(([id, a]) => ({
        id,
        appearance: a.group.userData.appearance ?? null,
        cart: a.cart?.visible
          ? { x: a.cart.position.x, z: a.cart.position.z }
          : null,
        x: a.group.position.x,
        z: a.group.position.z,
        ball: a.ball
          ? {
              x: a.ball.position.x,
              z: a.ball.position.z,
              visible: a.ball.visible,
            }
          : null,
      }));
    },
    update(g, time, opponents = []) {
      hazards.update(g);
      trees.update(g);
      if (revision !== g.revision) {
        revision = g.revision;
        rebuild(coastalPreview(g));
      }
      if (weedRevision !== g.weedRevision) {
        weedRevision = g.weedRevision;
        let n = 0;
        for (const w of g.weeds)
          for (let j = 0; j < 7; j++) {
            const x = w.x + Math.sin(j * 7 + w.id) * 0.65,
              z = w.z + Math.cos(j * 11 + w.id) * 0.65,
              y = height(x, z) + 0.11;
            dummy.position.set(x, y + 0.17, z);
            dummy.scale.set(1, 0.65, 1);
            dummy.updateMatrix();
            weedHeads.setMatrixAt(n, dummy.matrix);
            dummy.position.y = y - 0.035;
            dummy.scale.set(1, 0.16, 1.2);
            dummy.updateMatrix();
            weedLeaves.setMatrixAt(n, dummy.matrix);
            n++;
          }
        weedHeads.count = weedLeaves.count = n;
        weedHeads.instanceMatrix.needsUpdate =
          weedLeaves.instanceMatrix.needsUpdate = true;
        weedHeads.computeBoundingSphere();
        weedLeaves.computeBoundingSphere();
      }
      for(const f of g.facilities) if(f.type==='tennis-court'){
        const group=facilityMap.get(f.id);if(group)updateTennisBall(group,g,f);
      }
      for(const f of g.facilities)if(f.type==='marina'){
        const boat=facilityMap.get(f.id)?.userData.marinaBoat;
        if(boat){boat.visible=!!f.marinaActivity && f.marinaActivity.phase!=='idle';
      boat.position.z=1.7+(f.marinaActivity?.offset||0);boat.rotation.y=f.marinaActivity?.direction===-1?Math.PI:0;}
      }
      for(const f of g.facilities)if(f.type==='airstrip'){
        const plane=facilityMap.get(f.id)?.userData.aircraft,pose=aircraftPose(f.aircraft,g.time);
        if(plane){plane.visible=!!pose;if(pose){plane.position.set(pose.x,pose.y,pose.z);plane.rotation.y=pose.heading;plane.userData.propeller.rotation.x=pose.propeller?g.time*45:0;}}
      }
      const people = [
          ...g.guests,
          ...g.staff,
          ...(g.pro ? [g.pro] : []),
          ...opponents,
        ],
        ids = new Set(people.map((p) => p.visualId ?? p.id));
      for (const [id, a] of avatarMap)
        if (!ids.has(id)) {
          disposeGroup(a.group);
          if (a.ball) disposeGroup(a.ball);
          if (a.cart) disposeGroup(a.cart);
          avatarMap.delete(id);
        }
      for (const p of people) {
        const actorId = p.visualId ?? p.id;
        let a = avatarMap.get(actorId);
        const appearanceKey = JSON.stringify([
          p.appearance ?? null,
          p.role ?? null,
        ]);
        if (a && a.appearanceKey !== appearanceKey) {
          disposeGroup(a.group);
          if (a.ball) disposeGroup(a.ball);
          if (a.cart) disposeGroup(a.cart);
          avatarMap.delete(actorId);
          a = null;
        }
        if (!a) {
          a = person(
            scene,
            p.pos.x,
            p.pos.z,
            p.visualColor ??
              (p.pro
                ? 0xa52d32
                : p.ball
                  ? [0x3e6788, 0xb15d3b, 0x917099][p.id % 3]
                  : p.role === "marshall"
                    ? 0x344570
                    : p.role === "consultant"
                      ? 0x61a9a0
                      : p.role === "celebrity"
                        ? 0xb9648c
                        : p.role === "club-pro"
                          ? 0xd4c9ae
                          : p.role === "ranger"
                            ? 0x544c80
                            : p.role === "vendor"
                              ? 0xc4943e
                              : p.role === "technician"
                                ? 0x477a92
                                : 0x657645),
            0xe0d6af,
            p.appearance,
          );
          if (p.ball) {
            a.ball = add(
              new THREE.SphereGeometry(0.12, 10, 8),
              p.visualColor ? 0xf5d355 : 0xfffaf0,
              0,
              0,
              0,
              scene,
            );
            const club = add(
              new THREE.CylinderGeometry(0.02, 0.02, 0.9, 6),
              0x918f82,
              0,
              -0.68,
              0,
              a.arms[1],
            );
            const clubHead = add(
              new THREE.BoxGeometry(0.17, 0.08, 0.09),
              0xa5a49c,
              0,
              -1.1,
              0,
              a.arms[1],
            );
            a.golfEquipment=[club,clubHead];
          }
          if(p.ball){
            a.racket=new THREE.Group();a.arms[1].add(a.racket);
            add(new THREE.CylinderGeometry(.025,.025,.4,6),0x44494b,0,-.8,0,a.racket);
            add(new THREE.TorusGeometry(.23,.035,5,12),0xe3ddd0,0,-1.15,0,a.racket);
            for(const offset of [-.12,0,.12]) add(new THREE.BoxGeometry(.36,.012,.012),0xc1c8b9,0,-1.15+offset,0,a.racket);
          }
          if (p.role === "vendor") {
            add(
              new THREE.BoxGeometry(0.55, 0.4, 0.4),
              0xb84132,
              0,
              -0.65,
              0.05,
              a.arms[0],
            );
            add(
              new THREE.BoxGeometry(0.58, 0.07, 0.43),
              0xe6ddc5,
              0,
              -0.43,
              0.05,
              a.arms[0],
            );
          }
          if (p.hasCart) a.cart = golfCart(scene);
          a.appearanceKey = appearanceKey;
          avatarMap.set(actorId, a);
        }
        const tennis=tennisPose(g,p),practice=practicePose(g,p),activity=tennis||practice,display=activity||p.pos;
        const y = activity ? travelHeight(g,p.pos)*(1-activity.blend)+(height(activity.center.x,activity.center.z)+.25)*activity.blend : travelHeight(g,p.pos);
        a.group.position.set(display.x,y,display.z);
        a.group.rotation.y=activity?activity.heading:p.heading||0;
        if(a.racket){a.racket.visible=!!tennis;a.golfEquipment.forEach(mesh=>mesh.visible=!tennis);}
        const step =
          ["walking", "departing", "angry"].includes(p.phase) && p.path?.length
            ? Math.sin(time * 12 + p.id) * 0.5
            : 0;
        a.legs[0].rotation.x = step;
        a.legs[1].rotation.x = -step;
        a.arms[0].rotation.x = -step * 0.65;
        a.arms[1].rotation.x = step * 0.65;
        a.torso.rotation.x = ["cleaning", "repairing"].includes(p.phase)
          ? 0.5
          : 0;
        if (a.cart) {
          a.cart.visible = !!p.cartPosition;
          if (p.cartPosition) {
            a.cart.position.set(
              p.cartPosition.x,
              travelHeight(g, p.cartPosition),
              p.cartPosition.z,
            );
            a.cart.rotation.y = p.cartPosition.heading;
          }
          if (ridesCart(p, lie(g, p.pos))) {
            a.legs.forEach((leg) => (leg.rotation.x = -1.35));
            a.arms.forEach((arm) => (arm.rotation.x = -0.9));
          }
        }
        if (p.role === "vendor") a.arms[0].rotation.x = -0.5;
        if (p.phase === "refreshing") a.arms[1].rotation.x = -1.2;
        if (p.phase === "repairing")
          a.arms[1].rotation.x = -0.5 + Math.sin(time * 6) * 0.2;
        if (p.phase === "shot")
          a.arms[1].rotation.x = -Math.max(0, 1 - (p.shot?.time || 0)) * 1.4;
        if(practice)a.arms[1].rotation.x=practice.swing;
        if(tennis){a.arms[1].rotation.x=tennis.swing;a.legs[0].rotation.x=Math.sin(g.time*5)*.1;a.legs[1].rotation.x=-a.legs[0].rotation.x;}
        if (a.ball) {
          a.ball.visible = !p.paid && p.phase !== "finished";
          a.ball.position.set(
            p.ball.x,
            height(p.ball.x, p.ball.z) + 0.17 + (p.ballHeight || 0),
            p.ball.z,
          );
        }
      }
    },
  };
}
