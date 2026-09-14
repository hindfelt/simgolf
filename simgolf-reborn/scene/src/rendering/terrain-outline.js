// Trace the exposed edges of a tile union, then remove straight-through vertices.
// Rounding the union (rather than each tile) keeps broad fairways seamless.
export function terrainContours(cells) {
  const occupied = new Set(cells.map(([x, y]) => `${x},${y}`));
  const edges = new Map();
  function add(a, b) {
    const k = a.join(",");
    if (!edges.has(k)) edges.set(k, []);
    edges.get(k).push({ a, b });
  }
  for (const [x, y] of cells) {
    if (!occupied.has(`${x},${y - 1}`)) add([x, y], [x + 1, y]);
    if (!occupied.has(`${x + 1},${y}`)) add([x + 1, y], [x + 1, y + 1]);
    if (!occupied.has(`${x},${y + 1}`)) add([x + 1, y + 1], [x, y + 1]);
    if (!occupied.has(`${x - 1},${y}`)) add([x, y + 1], [x, y]);
  }
  const contours = [];
  while (edges.size) {
    const first = edges.values().next().value[0];
    let edge = first;
    const points = [];
    do {
      points.push(edge.a);
      const list = edges.get(edge.a.join(","));
      list.splice(list.indexOf(edge), 1);
      if (!list.length) edges.delete(edge.a.join(","));
      if (edge.b.join(",") === first.a.join(",")) break;
      const next = edges.get(edge.b.join(","));
      // At a diagonal contact, turn right to keep the two regions separate.
      const dx = edge.b[0] - edge.a[0],
        dy = edge.b[1] - edge.a[1];
      edge =
        next.find((e) => dx * (e.b[1] - e.a[1]) - dy * (e.b[0] - e.a[0]) > 0) ||
        next[0];
    } while (edge);
    contours.push(
      points.filter((p, i) => {
        const a = points[(i + points.length - 1) % points.length],
          b = points[(i + 1) % points.length];
        return (p[0] - a[0]) * (b[1] - p[1]) !== (p[1] - a[1]) * (b[0] - p[0]);
      }),
    );
  }
  return contours;
}
export function roundedTerrainPath(contours, scale, radius) {
  const path = new Path2D();
  for (const contour of contours) {
    const points = contour.map(([x, y]) => [x * scale, y * scale]);
    for (let i = 0; i < points.length; i++) {
      const a = points[(i + points.length - 1) % points.length],
        p = points[i],
        b = points[(i + 1) % points.length];
      const before = Math.hypot(p[0] - a[0], p[1] - a[1]),
        after = Math.hypot(b[0] - p[0], b[1] - p[1]);
      const r = Math.min(radius, before / 2, after / 2);
      const start = [
        p[0] + ((a[0] - p[0]) * r) / before,
        p[1] + ((a[1] - p[1]) * r) / before,
      ];
      if (i === 0) path.moveTo(...start);
      else path.lineTo(...start);
      path.arcTo(...p, ...b, r);
    }
    path.closePath();
  }
  return path;
}
