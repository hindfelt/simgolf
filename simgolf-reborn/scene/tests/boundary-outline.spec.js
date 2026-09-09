import { test, expect } from '@playwright/test';
import { boundaryEdges } from '../src/rendering/boundary-outline.js';
import { key } from '../src/simulation/world.js';

test('adjoining marked tiles have a continuous outline with no internal edges', () => {
  expect(boundaryEdges({ [key(4,4)]: true })).toHaveLength(4);
  const area = { [key(4,4)]: true, [key(5,4)]: true };
  expect(boundaryEdges(area)).toHaveLength(6);
  const degrees = new Map();
  for (const edge of boundaryEdges(area)) for (const point of edge) {
    const id = point.join(','); degrees.set(id, (degrees.get(id) || 0) + 1);
  }
  expect([...degrees.values()].every(n => n === 2)).toBe(true);
  delete area[key(5,4)];
  expect(boundaryEdges(area)).toHaveLength(4);
});
