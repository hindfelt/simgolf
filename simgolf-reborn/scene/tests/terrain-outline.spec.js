import { test, expect } from "@playwright/test";
import { terrainContours } from "../src/rendering/terrain-outline.js";
const area = (loop) =>
  loop.reduce((sum, p, i) => {
    const q = loop[(i + 1) % loop.length];
    return sum + p[0] * q[1] - q[0] * p[1];
  }, 0) / 2;
test("joined tiles produce one perimeter without interior seams", () => {
  const loops = terrainContours([
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ]);
  expect(loops).toHaveLength(1);
  expect(loops[0]).toHaveLength(4);
  expect(area(loops[0])).toBe(4);
});
test("stepped shapes, holes and diagonal contacts retain their topology", () => {
  const stepped = terrainContours([
    [0, 0],
    [1, 0],
    [1, 1],
  ]);
  expect(stepped[0]).toHaveLength(6);
  expect(area(stepped[0])).toBe(3);
  expect(
    terrainContours([
      [0, 0],
      [1, 1],
    ]),
  ).toHaveLength(2);
  const ring = [];
  for (let x = 0; x < 3; x++)
    for (let y = 0; y < 3; y++) if (x !== 1 || y !== 1) ring.push([x, y]);
  const loops = terrainContours(ring);
  expect(loops).toHaveLength(2);
  expect(loops.reduce((sum, l) => sum + area(l), 0)).toBe(8);
});
