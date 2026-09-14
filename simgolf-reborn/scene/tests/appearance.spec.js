import { test, expect } from "@playwright/test";
import * as THREE from "three";
import { person } from "../src/actors.js";
import { appearanceStyle } from "../src/simulation/appearance.js";
import { rosterOpponent } from "../src/simulation/roster-opponent.js";
import {
  createCompetition,
  restoreCompetition,
} from "../src/simulation/competition.js";
import { createGame, build } from "../src/simulation/game.js";
import { exportCourse } from "../src/simulation/course-package.js";
import { exportGolfer } from "../src/simulation/golfer-package.js";
test("all eight source clothing styles produce their mapped materials and garments", () => {
  for (let body = 0; body < 8; body++) {
    const a = { body, skin: 3, hat: 0, shirt: 6, pants: 4 },
      style = appearanceStyle(a);
    const model = person(new THREE.Scene(), 0, 0, 0xffffff, 0xffffff, a);
    expect(model.group.userData.appearance).toEqual(a);
    expect(model.torso.material.color.getHex()).toBe(style.shirt);
    const parts = [];
    model.group.traverse((p) => {
      if (p.isMesh) parts.push(p);
    });
    expect(parts.some((p) => p.material.color.getHex() === style.skin)).toBe(
      true,
    );
    expect(parts.some((p) => p.material.color.getHex() === style.hat)).toBe(
      true,
    );
    expect(parts.filter((p) => p.name === "skirt")).toHaveLength(
      body === 7 ? 1 : 0,
    );
    expect(parts.filter((p) => p.name === "shorts")).toHaveLength(
      [3, 5].includes(body) ? 2 : 0,
    );
    expect(parts.filter((p) => p.name === "knickers")).toHaveLength(
      body === 1 ? 2 : 0,
    );
    for (const p of parts) {
      p.geometry.dispose();
      p.material.dispose();
    }
  }
});
test("appearance is frozen with the entrant, restored, and malformed codes reject", async () => {
  const g = createGame();
  build(g, "tee", 7, 20);
  build(g, "green", 36, 5);
  const rival = rosterOpponent("Susan Amateur");
  const config = {
    id: "appearance-match",
    course: await exportCourse(g),
    rounds: 1,
    entrants: [
      { id: "owner", name: "Gary", golfer: exportGolfer(g) },
      { id: "rival", ...rival },
    ],
  };
  const host = await createCompetition(config);
  const savedAppearance = structuredClone(rival.appearance);
  rival.appearance.shirt = 0;
  expect(host.roundSnapshot("rival").pro.appearance).toEqual(savedAppearance);
  const loaded = await restoreCompetition(host.save());
  expect(loaded.roundSnapshot("rival").pro.appearance).toEqual(savedAppearance);
  expect(loaded.snapshot()).toEqual(host.snapshot());
  config.entrants[1].appearance = { ...savedAppearance, body: 8 };
  await expect(createCompetition(config)).rejects.toThrow(/appearance/);
});

test("render an inspection sheet using the production golfer models", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 600 });
  await page.goto("/");
  await page.waitForFunction(() => !!window.__gameTest);
  await page.locator("#pause").click();
  await page.evaluate(async () => {
    const THREE = await import("/node_modules/three/build/three.module.js");
    const { person } = await import("/src/actors.js");
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe9e6d7);
    const camera = new THREE.OrthographicCamera(-10, 10, 3.4, -3.4, 0.1, 100);
    camera.position.set(0, 5, 12);
    camera.lookAt(0, 0.85, 0);
    scene.add(new THREE.HemisphereLight(0xfff4dc, 0x6a7559, 2));
    const light = new THREE.DirectionalLight(0xfff4df, 3);
    light.position.set(-5, 8, 5);
    scene.add(light);
    for (let body = 0; body < 8; body++) {
      const p = person(scene, 0, 0, 0, 0, {
        body,
        skin: body % 4,
        hat: body,
        shirt: body + 1,
        pants: body + 1,
      });
      p.group.position.set((body - 3.5) * 2.4, 0, 0);
      p.group.rotation.y = 0.25;
    }
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(1440, 600);
    renderer.setPixelRatio(1);
    const holder = document.createElement("div");
    holder.style.cssText =
      "position:fixed;inset:0;z-index:9999;background:#e9e6d7;";
    holder.append(renderer.domElement);
    const title = document.createElement("h1");
    title.textContent = "Original clothing categories · 3D model study";
    title.style.cssText =
      "position:absolute;top:24px;left:40px;color:#263c33;font:26px Georgia;";
    holder.append(title);
    const labels = document.createElement("div");
    labels.style.cssText =
      "position:absolute;left:2%;right:2%;bottom:80px;display:grid;grid-template-columns:repeat(8,1fr);text-align:center;color:#263c33;font:17px Georgia";
    for (const name of [
      "Long sleeves",
      "Knickers",
      "Short sleeves",
      "Short pants",
      "Long sleeves / pants",
      "Short sleeves / shorts",
      "Short sleeves / pants",
      "Tank top / skirt",
    ]) {
      const label = document.createElement("div");
      label.textContent = name;
      labels.append(label);
    }
    holder.append(labels);
    document.body.append(holder);
    renderer.render(scene, camera);
  });
  await page.screenshot({
    path: "../graphics/samples/professional-body-styles.png",
  });
});
