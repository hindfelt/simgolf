import { test, expect } from "@playwright/test";
import {
  paths,
  teePoints,
  isOnPath,
  bridgeLayout,
  fairwayPoints,
  greenPoints,
  bunkerPoints,
  riverZ,
  riverWidth,
  pointInPolygon,
  riverDistance,
} from "../src/landscape.js";

test("the tee has a continuous grass buffer free of paths", () => {
  const xs = teePoints.map((p) => p[0]),
    zs = teePoints.map((p) => p[1]);
  for (let x = Math.min(...xs) - 1; x <= Math.max(...xs) + 1; x += 0.2)
    for (let z = Math.min(...zs) - 1; z <= Math.max(...zs) + 1; z += 0.2)
      expect(isOnPath(x, z, 0), `paving at ${x},${z}`).toBe(false);
});

test("bridge approaches are centred and straight for three metres outside each end", () => {
  for (const side of [-1, 1]) {
    const end = bridgeLayout.z + side * bridgeLayout.halfSpan;
    for (let d = -0.3; d <= 3; d += 0.25) {
      const z = end + side * d;
      expect(isOnPath(bridgeLayout.x, z, 0)).toBe(true);
      expect(isOnPath(bridgeLayout.x - 1.2, z, 0)).toBe(true);
      expect(isOnPath(bridgeLayout.x + 1.2, z, 0)).toBe(true);
    }
  }
});

test("fairway, green and tee keep straight tile-aligned edges", () => {
  for (const polygon of [
    fairwayPoints,
    greenPoints,
    teePoints,
    ...bunkerPoints,
  ])
    polygon.forEach(([x, z], i) => {
      const [nx, nz] = polygon[(i + 1) % polygon.length];
      expect(x === nx || z === nz).toBe(true);
    });
});

test("stream keeps straight reaches and constant width between stepped bends", () => {
  for (const [a, b] of [
    [-80, -50],
    [-30, 15],
    [30, 50],
    [70, 100],
  ]) {
    expect(riverZ(a)).toBe(riverZ(b));
    expect(riverWidth(a)).toBe(riverWidth(b));
  }
  expect(riverZ(-50)).not.toBe(riverZ(-30));
  expect(riverZ(15)).not.toBe(riverZ(30));
});

test("stepped water bends retain a full-width connecting reach", () => {
  for (const x of [-42, 24, 60])
    for (const dx of [-2, 0, 2])
      for (const z of [24, 26, 28])
        expect(riverDistance(x + dx, z)).toBeLessThanOrEqual(2.5);
});

test("paths use grid-aligned runs and stay outside playing surfaces", () => {
  for (const route of paths)
    for (let i = 1; i < route.points.length; i++) {
      const [ax, az] = route.points[i - 1],
        [bx, bz] = route.points[i];
      expect(ax === bx || az === bz).toBe(true);
      const length = Math.hypot(bx - ax, bz - az),
        dx = (bx - ax) / length,
        dz = (bz - az) / length;
      for (let d = 0; d <= length; d += 0.5)
        for (const side of [-0.5, 0, 0.5]) {
          const x = ax + dx * d + dz * route.width * side,
            z = az + dz * d - dx * route.width * side;
          for (const surface of [
            fairwayPoints,
            teePoints,
            greenPoints,
            ...bunkerPoints,
          ])
            expect(
              pointInPolygon(x, z, surface),
              `path overlaps turf at ${x},${z}`,
            ).toBe(false);
        }
    }
});
