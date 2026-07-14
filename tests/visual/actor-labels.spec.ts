import { expect, test, type Page } from '@playwright/test';

const ACTOR_NAMES = ['Doris', 'Bogey Bill', 'Rae Woods', 'Daisy Divot'] as const;

async function renderProductionActorScene(page: Page, zoom: number) {
  await page.goto('/?actor-atlas=1');
  return page.evaluate(async ({ zoom, actorNames }) => {
    const [{ S, caches }, { draw }, { cameraPositionForWorldPoint }, { Tile }] = await Promise.all([
      import('/src/game/state.ts'),
      import('/src/game/render.ts'),
      import('/src/game/camera.ts'),
      import('/src/game/types.ts'),
    ]);

    document.body.innerHTML = '<canvas data-production-actor-scene="true" width="800" height="600"></canvas>';
    document.body.style.margin = '0';
    const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-production-actor-scene="true"]')!;
    const ctx = canvas.getContext('2d')!;
    const fillCalls: string[] = [];
    const strokeCalls: string[] = [];
    const fillText = ctx.fillText.bind(ctx);
    const strokeText = ctx.strokeText.bind(ctx);
    ctx.fillText = ((text: string, x: number, y: number, maxWidth?: number) => {
      fillCalls.push(String(text));
      if (maxWidth === undefined) fillText(text, x, y);
      else fillText(text, x, y, maxWidth);
    }) as CanvasRenderingContext2D['fillText'];
    ctx.strokeText = ((text: string, x: number, y: number, maxWidth?: number) => {
      strokeCalls.push(String(text));
      if (maxWidth === undefined) strokeText(text, x, y);
      else strokeText(text, x, y, maxWidth);
    }) as CanvasRenderingContext2D['strokeText'];

    S.tiles.fill(Tile.ROUGH);
    S.elevC.fill(0);
    S.owned.fill(1);
    S.holes = [];
    S.buildings = [];
    S.facilityActivities = [];
    S.balls = [];
    S.floaters = [];
    S.parts = [];
    S.player = null;
    S.selectedGolfer = null;
    S.hover = null;
    S.mode = 'build';
    S.rot = 0;
    S.time = 0;
    S.camShake = 0;
    S.view = { w: 800, h: 600 };
    S.golfers = [
      {
        name: actorNames[0], skill: 0.6, shirt: '#3f7fd0', skin: '#e0a878', cap: '#efefef',
        x: 7, y: 8, tx: 7, ty: 8, phase: 0, state: 'watch', t: 0, holeIdx: 0, strokes: 0,
        mood: 4, ball: null, lie: 'fair', chatCd: 0, scenicSaid: false, face: 1, view: 'front',
        energy: 1, hunger: 1, thirst: 1,
      },
      {
        name: actorNames[1], skill: 0.5, shirt: '#8e5bc0', skin: '#8d5a3a', cap: '#f0cf45',
        x: 17, y: 8, tx: 17, ty: 8, phase: 0, state: 'watch', t: 0, holeIdx: 0, strokes: 0,
        mood: 4, ball: null, lie: 'fair', chatCd: 0, scenicSaid: false, face: -1, view: 'side',
        energy: 1, hunger: 1, thirst: 1,
      },
    ];
    S.employees = [
      { id: 48, kind: 'ranger', hiredAt: 0 },
      { id: 49, kind: 'groundskeeper', hiredAt: 0 },
    ];
    caches.trees = [];
    caches.waterTiles = [];
    caches.wildlife = [{ kind: 'deer', x: 7, y: 16, s: 0.4 }];
    caches.naturePatches = [{ kind: 'divot', x: 17, y: 16, s: 0.6 }];
    caches.pathConnected.clear();
    caches.orthoDirty = true;
    caches.groundDirty = true;
    S.cam.z = zoom;
    const camera = cameraPositionForWorldPoint(12, 12, 800, 600);
    S.cam = { ...camera, z: zoom };

    draw(ctx, 800, 600);
    return { fillCalls, strokeCalls };
  }, { zoom, actorNames: [...ACTOR_NAMES] });
}

test.describe('production course actor labels', () => {
  test.use({ viewport: { width: 800, height: 600 } });

  test('draws ordinary golfer and staff names at native zoom', async ({ page }, testInfo) => {
    const calls = await renderProductionActorScene(page, 1);
    expect(calls.fillCalls.filter((label) => ACTOR_NAMES.includes(label as typeof ACTOR_NAMES[number])).sort()).toEqual([...ACTOR_NAMES].sort());
    expect(calls.strokeCalls.filter((label) => ACTOR_NAMES.includes(label as typeof ACTOR_NAMES[number])).sort()).toEqual([...ACTOR_NAMES].sort());
    await page.locator('canvas[data-production-actor-scene="true"]').screenshot({ path: testInfo.outputPath('actor-label-course-native-800x600.png') });
  });

  test('culls all ambient names from the fitted overview', async ({ page }, testInfo) => {
    const calls = await renderProductionActorScene(page, 0.4);
    expect(calls.fillCalls.filter((label) => ACTOR_NAMES.includes(label as typeof ACTOR_NAMES[number]))).toEqual([]);
    expect(calls.strokeCalls.filter((label) => ACTOR_NAMES.includes(label as typeof ACTOR_NAMES[number]))).toEqual([]);
    await page.locator('canvas[data-production-actor-scene="true"]').screenshot({ path: testInfo.outputPath('actor-label-course-low-800x600.png') });
  });
});
