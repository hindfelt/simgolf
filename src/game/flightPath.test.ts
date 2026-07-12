import { describe, expect, it } from 'vitest';
import { Tile } from './types';
import type { Ball, CourseTheme } from './types';
import { ballFlightPosition, firstTreeCanopyImpact, flightSampleCount, playerOnlyTreeCanopyImpact, treeDropPosition, type FlightCollisionEnvironment, type FlightPath } from './flightPath';
import { treeCollisionProfile, treeImpactKind } from './treeGeometry';

const environment = (trees: Array<[number, number]>, theme: CourseTheme = 'parklands', elevationAt: (x: number, y: number) => number = () => 0): FlightCollisionEnvironment => {
  const keys = new Set(trees.map(([x, y]) => `${x},${y}`));
  return {
    theme,
    tileAt: (x, y) => keys.has(`${x},${y}`) ? Tile.TREE : Tile.FAIR,
    elevationAt,
  };
};

const straightPath = (height: number, y = 5.5, lowFlight = false): FlightPath => ({
  fx: 1.5, fy: y, tx: 9.5, ty: y, h: height, shotShape: 'straight',
  curvePerpX: 0, curvePerpY: 1, curveDistance: 8, lowFlight,
});

describe('sampled player tree-canopy flight', () => {
  it('finds a low straight path while the same high path clears the visible crown', () => {
    const env = environment([[5, 5]]);
    expect(firstTreeCanopyImpact(straightPath(34), env)).toMatchObject({ treeX: 5, treeY: 5 });
    expect(firstTreeCanopyImpact(straightPath(78), env)).toBeNull();
  });

  it('lets a shaped route avoid a tree struck by the straight chord', () => {
    const env = environment([[5, 5]]);
    const straight = straightPath(34);
    const hook: FlightPath = {
      ...straight,
      tx: 9.5,
      ty: 5.5 - 8 * 0.38,
      shotShape: 'hook',
      curveDistance: 8,
    };
    expect(firstTreeCanopyImpact(straight, env)).not.toBeNull();
    expect(firstTreeCanopyImpact(hook, env)).toBeNull();
    const steps = flightSampleCount(hook);
    for (let i = 1; i <= steps; i++) {
      const before = ballFlightPosition(hook, (i - 1) / steps);
      const after = ballFlightPosition(hook, i / steps);
      expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeLessThanOrEqual(0.1);
    }
  });

  it('uses altitude-shaped crowns and leaves only the trunk below every canopy', () => {
    const flat = () => 0;
    const round = treeCollisionProfile(5, 5, 'parklands');
    expect(round.kind).toBe('round');
    const roundMid = (round.canopyBottom + round.canopyTop) / 2;
    expect(treeImpactKind(round, { x: round.center.x + round.canopyRadius * 0.9, y: round.center.y }, roundMid, flat)).toBe('canopy');
    expect(treeImpactKind(round, { x: round.center.x + round.canopyRadius * 0.5, y: round.center.y }, round.canopyBottom + 0.02, flat)).toBeNull();
    expect(treeImpactKind(round, { x: round.center.x + round.trunkRadius * 1.5, y: round.center.y }, round.canopyBottom - 1, flat)).toBeNull();
    expect(treeImpactKind(round, round.center, round.canopyBottom - 1, flat)).toBe('trunk');

    const pine = treeCollisionProfile(6, 1, 'links');
    expect(pine.kind).toBe('pine');
    expect(pine.canopyTop).toBeCloseTo(48 * pine.visualScale, 10);
    const span = pine.canopyTop - pine.canopyBottom;
    expect(treeImpactKind(pine, { x: pine.center.x + pine.canopyRadius * 0.45, y: pine.center.y }, pine.canopyBottom + span * 0.5, flat)).toBe('pine');
    expect(treeImpactKind(pine, { x: pine.center.x + pine.canopyRadius * 0.35, y: pine.center.y }, pine.canopyBottom + span * 0.9, flat)).toBeNull();
    expect(firstTreeCanopyImpact(straightPath(8, 5.86, true), environment([[5, 5]]))).toBeNull();
    expect(firstTreeCanopyImpact(straightPath(8, 5.5, true), environment([[5, 5]]))).toMatchObject({ kind: 'trunk' });
  });

  it('skips only the recovery origin candidate and still scans adjacent trees', () => {
    const recovery = straightPath(34);
    expect(firstTreeCanopyImpact(recovery, environment([[1, 5]]))).toBeNull();
    expect(firstTreeCanopyImpact(recovery, environment([[1, 5], [2, 5]]))).toMatchObject({ treeX: 2, treeY: 5 });
  });

  it('allows a straight source-tree escape but catches shaped re-entry after clearing it', () => {
    const env = environment([[1, 5]]);
    expect(firstTreeCanopyImpact(straightPath(34), env)).toBeNull();

    const returning: FlightPath = {
      fx: 1.5,
      fy: 5.5,
      tx: 1.5,
      ty: 5.5,
      h: 20,
      shotShape: 'hook',
      curvePerpX: 1,
      curvePerpY: 0,
      curveDistance: 20,
      lowFlight: false,
    };
    expect(firstTreeCanopyImpact(returning, env)).toMatchObject({ treeX: 1, treeY: 5, kind: 'trunk' });
    expect(firstTreeCanopyImpact(returning, env)!.t).toBeGreaterThan(0.5);
  });

  it('deterministically catches the descending destination canopy', () => {
    const impact = firstTreeCanopyImpact(straightPath(20), environment([[9, 5]]));
    expect(impact).toMatchObject({ treeX: 9, treeY: 5, kind: 'trunk' });
    expect(firstTreeCanopyImpact(straightPath(20), environment([[9, 5]]))).toEqual(impact);
  });

  it('drops near or behind contact without leaving the map', () => {
    const path = straightPath(34);
    const impact = firstTreeCanopyImpact(path, environment([[5, 5]]))!;
    const drop = treeDropPosition(path, impact);
    const before = ballFlightPosition(path, impact.t - 0.015);
    const tangent = { x: impact.x - before.x, y: impact.y - before.y };
    expect((drop.x - impact.x) * tangent.x + (drop.y - impact.y) * tangent.y).toBeLessThanOrEqual(0);
    expect(drop.x).toBeGreaterThanOrEqual(0.6);
    expect(drop.x).toBeLessThanOrEqual(64.4);
    expect(drop.y).toBeGreaterThanOrEqual(0.6);
    expect(drop.y).toBeLessThanOrEqual(64.4);
  });

  it('accounts for terrain elevation relative to the tree root', () => {
    const slope = (x: number) => x >= 5.5 ? 2 : 0;
    const env = environment([[5, 5]], 'parklands', slope);
    expect(firstTreeCanopyImpact(straightPath(55), environment([[5, 5]]))).toBeNull();
    expect(firstTreeCanopyImpact(straightPath(55), env)).not.toBeNull();
  });

  it('explicitly opts AI balls out while retaining the same player geometry', () => {
    const env = environment([[5, 5]]);
    const path = straightPath(34);
    expect(playerOnlyTreeCanopyImpact({ ...path, owner: 'P' }, env)).not.toBeNull();
    expect(playerOnlyTreeCanopyImpact({ ...path, owner: {} as Ball['owner'] }, env)).toBeNull();
  });
});
