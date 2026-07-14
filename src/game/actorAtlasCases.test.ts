import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ACTOR_ATLAS_CASES,
  ACTOR_ATLAS_CELL,
  ACTOR_ATLAS_COLUMNS,
  ACTOR_ATLAS_MIRRORS,
  ACTOR_ATLAS_ROWS,
  ACTOR_ATLAS_SCALES,
  ACTOR_ATLAS_SIZE,
  GOLFER_ATLAS_FRAMES,
  GOLFER_ATLAS_VIEWS,
  GOLFER_BUILD_FIXTURES,
  STAFF_ATLAS_FRAMES,
  STAFF_ATLAS_KINDS,
  STAFF_ATLAS_VIEWS,
} from './actorAtlasCases';
import { ACTOR_SCALE_MIN, actorSpriteScale } from './actorGeometry';
import { golferAppearance } from './sprites';

describe('deterministic actor atlas manifest', () => {
  it('covers every golfer build, pose, view, mirror and requested scale exactly once', () => {
    const golfers = ACTOR_ATLAS_CASES.filter((item) => item.actor === 'golfer');
    const expected = ACTOR_ATLAS_SCALES.length * GOLFER_BUILD_FIXTURES.length * GOLFER_ATLAS_FRAMES.length * GOLFER_ATLAS_VIEWS.length * ACTOR_ATLAS_MIRRORS.length;
    expect(golfers).toHaveLength(expected);

    for (const scale of ACTOR_ATLAS_SCALES)
      for (const fixture of GOLFER_BUILD_FIXTURES)
        for (const frame of GOLFER_ATLAS_FRAMES)
          for (const view of GOLFER_ATLAS_VIEWS)
            for (const mirror of ACTOR_ATLAS_MIRRORS) {
              expect(golfers.filter((item) => item.scaleId === scale.id && item.build === fixture.build && item.frame === frame && item.view === view && item.mirror === mirror.id)).toHaveLength(1);
            }
  });

  it('covers every staff role, animation frame, authored view, mirror and requested scale exactly once', () => {
    const staff = ACTOR_ATLAS_CASES.filter((item) => item.actor === 'staff');
    const expected = ACTOR_ATLAS_SCALES.length * STAFF_ATLAS_KINDS.length * STAFF_ATLAS_FRAMES.length * STAFF_ATLAS_VIEWS.length * ACTOR_ATLAS_MIRRORS.length;
    expect(staff).toHaveLength(expected);

    for (const scale of ACTOR_ATLAS_SCALES)
      for (const kind of STAFF_ATLAS_KINDS)
        for (const frame of STAFF_ATLAS_FRAMES)
          for (const view of STAFF_ATLAS_VIEWS)
            for (const mirror of ACTOR_ATLAS_MIRRORS) {
              expect(staff.filter((item) => item.scaleId === scale.id && item.kind === kind && item.frame === frame && item.view === view && item.mirror === mirror.id)).toHaveLength(1);
            }
  });

  it('uses verified identities for all builds and stable native/fitted scales', () => {
    for (const fixture of GOLFER_BUILD_FIXTURES) expect(golferAppearance(fixture.identity).build).toBe(fixture.build);
    expect(ACTOR_ATLAS_SCALES).toEqual([
      { id: 'native', zoom: 1, scale: 1 },
      { id: 'fitted', zoom: 0.4, scale: ACTOR_SCALE_MIN },
    ]);
    expect(actorSpriteScale(ACTOR_ATLAS_SCALES[1].zoom)).toBe(ACTOR_SCALE_MIN);
  });

  it('has unique ordered keys and a fixed integer-pixel canvas', () => {
    expect(ACTOR_ATLAS_CASES).toHaveLength(672);
    expect(new Set(ACTOR_ATLAS_CASES.map((item) => item.key)).size).toBe(ACTOR_ATLAS_CASES.length);
    expect(ACTOR_ATLAS_CASES[0]?.key).toBe('golfer:native:compact:idle:front:right');
    expect(ACTOR_ATLAS_CASES.at(-1)?.key).toBe('staff:fitted:refreshment:workB:side:left');
    expect(ACTOR_ATLAS_COLUMNS).toBe(24);
    expect(ACTOR_ATLAS_ROWS).toBe(28);
    expect(ACTOR_ATLAS_SIZE).toEqual({
      width: ACTOR_ATLAS_COLUMNS * ACTOR_ATLAS_CELL.width,
      height: ACTOR_ATLAS_ROWS * ACTOR_ATLAS_CELL.height,
    });
  });
});

describe('actor atlas route contract', () => {
  const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
  const atlasSource = readFileSync(new URL('../ui/ActorAtlas.tsx', import.meta.url), 'utf8');

  it('routes the explicit query fixture without mounting the live game canvas', () => {
    expect(appSource).toContain("new URLSearchParams(window.location.search).get('actor-atlas') === '1'");
    expect(appSource).toContain('if (showActorAtlas) return <ActorAtlas />');
  });

  it('uses production sprite APIs, nearest-neighbour drawing and an observable ready marker', () => {
    expect(atlasSource).toContain('golferSprite(');
    expect(atlasSource).toContain('courseStaffSprite(');
    expect(atlasSource).toContain('actorSpriteScale(item.zoom)');
    expect(atlasSource).toContain('actorDrawPlan({ x: centerX, y: footY }');
    expect(atlasSource).toContain('ctx.scale(plan.mirrorX ? -1 : 1, 1)');
    expect(atlasSource).toContain('ctx.imageSmoothingEnabled = false');
    expect(atlasSource).toContain("canvas.dataset.atlasReady = 'true'");
    expect(atlasSource).toContain("document.documentElement.dataset.actorAtlasReady = 'true'");
    expect(atlasSource).not.toMatch(/fillText|strokeText|ctx\.font/);
  });
});
