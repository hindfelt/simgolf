import { appearanceStyle } from "./simulation/appearance.js";
import { sampleShot } from "./shot.js";
import * as THREE from "three";
import { height, paths } from "./landscape.js";

export function person(scene, x, z, shirtColor, hatColor, appearance) {
  const style = appearance ? appearanceStyle(appearance) : null;
  shirtColor = style?.shirt ?? shirtColor;
  hatColor = style?.hat ?? hatColor;
  const group = new THREE.Group();
  scene.add(group);
  if (appearance) group.userData.appearance = structuredClone(appearance);
  group.position.set(x, height(x, z), z);
  const skin = new THREE.MeshStandardMaterial({
    color: style?.skin ?? 0xc9956e,
    roughness: 0.9,
  });
  const shirt = new THREE.MeshStandardMaterial({
    color: shirtColor,
    roughness: 0.95,
  });
  const pants = new THREE.MeshStandardMaterial({
    color: style?.pants ?? 0x5b625b,
    roughness: 1,
  });
  const shoes = new THREE.MeshStandardMaterial({
    color: 0x3f382e,
    roughness: 0.9,
  });
  function part(geo, mat, x, y, z, parent = group) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  }
  const torso = part(
    new THREE.CylinderGeometry(
      style?.knickers ? 0.25 : style?.female ? 0.18 : 0.2,
      style?.knickers ? 0.24 : style?.female ? 0.14 : 0.17,
      0.59,
      8,
    ),
    shirt,
    0,
    1.15,
    0,
  );
  torso.scale.z = 0.72;
  part(new THREE.CylinderGeometry(0.065, 0.075, 0.13, 6), skin, 0, 1.51, 0);
  part(new THREE.SphereGeometry(0.14, 10, 8), skin, 0, 1.68, 0).scale.set(
    0.86,
    1.18,
    0.92,
  );
  part(
    new THREE.SphereGeometry(0.145, 10, 6),
    new THREE.MeshStandardMaterial({ color: 0x5b4931, roughness: 1 }),
    0,
    1.75,
    -0.012,
  ).scale.y = 0.48;
  if (hatColor) {
    const hm = new THREE.MeshStandardMaterial({
      color: hatColor,
      roughness: 0.9,
    });
    part(new THREE.CylinderGeometry(0.125, 0.165, 0.1, 10), hm, 0, 1.8, 0);
    part(new THREE.CylinderGeometry(0.23, 0.23, 0.025, 12), hm, 0, 1.75, 0.035);
  }
  if (style?.skirt)
    part(
      new THREE.CylinderGeometry(0.15, 0.3, 0.4, 10),
      pants,
      0,
      0.79,
      0,
    ).name = "skirt";
  const legs = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.105, 0.88, 0);
    group.add(pivot);
    part(
      new THREE.CylinderGeometry(0.087, 0.068, 0.75, 7),
      style?.shorts || style?.skirt || style?.knickers ? skin : pants,
      0,
      -0.37,
      0,
      pivot,
    );
    if (style?.shorts || style?.knickers) {
      part(
        new THREE.CylinderGeometry(
          style.knickers ? 0.115 : 0.092,
          0.095,
          style.knickers ? 0.5 : 0.33,
          8,
        ),
        pants,
        0,
        style.knickers ? -0.23 : -0.15,
        0,
        pivot,
      ).name = style.knickers ? "knickers" : "shorts";
      if (style.knickers)
        part(
          new THREE.CylinderGeometry(0.08, 0.075, 0.25, 7),
          new THREE.MeshStandardMaterial({ color: 0xf0ebdd }),
          0,
          -0.6,
          0,
          pivot,
        ).name = "socks";
    }
    part(
      new THREE.BoxGeometry(0.15, 0.12, 0.29),
      shoes,
      0,
      -0.79,
      0.055,
      pivot,
    );
    legs.push(pivot);
  }
  const arms = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.21, 1.4, 0);
    group.add(pivot);
    part(
      new THREE.CylinderGeometry(0.087, 0.07, 0.24, 7),
      style?.tank ? skin : shirt,
      0,
      -0.1,
      0,
      pivot,
    );
    part(
      new THREE.CylinderGeometry(0.057, 0.045, 0.35, 7),
      style?.longSleeves ? shirt : skin,
      0,
      -0.37,
      0,
      pivot,
    );
    part(new THREE.SphereGeometry(0.059, 6, 5), skin, 0, -0.58, 0, pivot);
    arms.push(pivot);
  }
  return { group, legs, arms, torso };
}

function walkPosition(progress, lateral) {
  const points = paths[0].points.slice(5, 9);
  const lengths = points
    .slice(1)
    .map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
  let distance = progress * lengths.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (distance > lengths[i] && i < lengths.length - 1) {
      distance -= lengths[i];
      continue;
    }
    const [x, z] = points[i],
      dx = points[i + 1][0] - x,
      dz = points[i + 1][1] - z;
    const t = distance / lengths[i];
    return {
      x: x + dx * t + (dz / lengths[i]) * lateral,
      z: z + dz * t - (dx / lengths[i]) * lateral,
      heading: Math.atan2(dx, dz),
    };
  }
}

export function buildActors(scene) {
  const golfer = person(scene, -32, 8.5, 0xa83231, 0xe8d7b3);
  golfer.group.rotation.y = -1.7;
  const club = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 1.06, 6),
    new THREE.MeshStandardMaterial({
      color: 0xabaeab,
      metalness: 0.75,
      roughness: 0.3,
    }),
  );
  club.position.set(0, -0.95, 0.07);
  club.rotation.x = -0.3;
  golfer.arms[1].add(club);
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.07, 0.13),
    new THREE.MeshStandardMaterial({
      color: 0x647275,
      metalness: 0.6,
      roughness: 0.3,
    }),
  );
  head.position.set(0, -0.54, 0);
  club.add(head);
  const companion = person(scene, -34, 9.3, 0xdbd3ad, 0xaaa389);
  companion.group.rotation.y = 1.1;
  const walker = person(scene, -18, -8, 0x466389, 0xe5dbc8);
  const partner = person(scene, -16.8, -8, 0xd2c7ae, null);
  const gardener = person(scene, 19, 35, 0x547884, 0xcfb575);
  gardener.group.rotation.y = -1;
  // A small hand tool and a wheeled carrier identify the groundskeeper at close range.
  const tool = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 1, 6),
    new THREE.MeshStandardMaterial({ color: 0x97825b, roughness: 0.8 }),
  );
  tool.position.set(0, -0.7, 0.1);
  gardener.arms[1].add(tool);
  const trolley = new THREE.Group();
  trolley.position.set(18, height(18, 36), 36);
  scene.add(trolley);
  const tray = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.35, 1.02),
    new THREE.MeshStandardMaterial({ color: 0x6b7840, roughness: 0.9 }),
  );
  tray.position.y = 0.53;
  trolley.add(tray);
  for (const x of [-0.4, 0.4]) {
    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.23, 0.23, 0.08, 12),
      new THREE.MeshStandardMaterial({ color: 0x393b30, roughness: 0.9 }),
    );
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.26, 0.2);
    trolley.add(wheel);
  }
  const flagGroup = new THREE.Group();
  flagGroup.position.set(32, height(32, -25), -25);
  scene.add(flagGroup);
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 3.2, 8),
    new THREE.MeshStandardMaterial({
      color: 0xe8e4d2,
      roughness: 0.55,
      metalness: 0.1,
    }),
  );
  pole.position.y = 1.6;
  pole.castShadow = true;
  flagGroup.add(pole);
  const flagGeo = new THREE.PlaneGeometry(1.18, 0.56, 16, 5);
  flagGeo.translate(0.59, 2.87, 0);
  const flag = new THREE.Mesh(
    flagGeo,
    new THREE.MeshStandardMaterial({
      color: 0xc04c45,
      roughness: 0.8,
      side: THREE.DoubleSide,
    }),
  );
  flagGroup.add(flag);
  const hole = new THREE.Mesh(
    new THREE.CircleGeometry(0.105, 16),
    new THREE.MeshBasicMaterial({ color: 0x23302a }),
  );
  hole.rotation.x = -Math.PI / 2;
  hole.position.y = 0.018;
  flagGroup.add(hole);
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.065, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0xfff7df, roughness: 0.5 }),
  );
  scene.add(ball);
  const markerMat = new THREE.MeshStandardMaterial({
    color: 0xece2c5,
    roughness: 0.8,
  });
  for (const x of [-33.2, -29.7]) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 5), markerMat);
    m.position.set(x, height(x, 8.4) + 0.08, 8.4);
    scene.add(m);
  }
  const flagPositions = flagGeo.attributes.position;
  return {
    golfer,
    gardener,
    flagGroup,
    ball,
    animate(time) {
      for (let i = 0; i < flagPositions.count; i++) {
        const x = flagPositions.getX(i);
        flagPositions.setZ(
          i,
          Math.sin(time * 3.2 - x * 4) * 0.105 * x +
            Math.sin(time * 2 + x * 6) * 0.025 * x,
        );
      }
      flagPositions.needsUpdate = true;
      flagGeo.computeVertexNormals();
      const cycle = time % 14;
      const swing = cycle < 1.4 ? Math.sin((cycle / 1.4) * Math.PI) : 0;
      golfer.arms[1].rotation.x = -0.25 - swing * 1.8;
      golfer.arms[0].rotation.x = -0.35 - swing * 1.5;
      golfer.torso.rotation.y = swing * 0.18;
      const shot = sampleShot(time);
      ball.visible = true;
      ball.position.set(
        shot.x,
        height(shot.x, shot.z) + 0.065 + shot.lift,
        shot.z,
      );
      ball.userData.phase = shot.phase;
      const walkPhase = time * 0.1,
        t = (Math.sin(walkPhase) + 1) / 2;
      for (const [who, offset] of [
        [walker, 0],
        [partner, 1.05],
      ]) {
        const { x, z, heading } = walkPosition(t, offset === 0 ? -0.32 : 0.32);
        who.group.position.set(x, height(x, z), z);
        who.group.rotation.y =
          heading + (Math.cos(walkPhase) > 0 ? 0 : Math.PI);
        who.legs[0].rotation.x = Math.sin(time * 3 + offset) * 0.27;
        who.legs[1].rotation.x = -Math.sin(time * 3 + offset) * 0.27;
        who.arms[0].rotation.x = -Math.sin(time * 3 + offset) * 0.19;
        who.arms[1].rotation.x = Math.sin(time * 3 + offset) * 0.19;
      }
      gardener.group.rotation.x = -0.16 - (Math.sin(time * 0.7) + 1) * 0.1;
      gardener.arms[1].rotation.x = -0.25 + Math.sin(time * 1.8) * 0.1;
    },
  };
}
