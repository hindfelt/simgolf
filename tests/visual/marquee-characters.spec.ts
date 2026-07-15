import { expect, test, type Locator, type Page } from '@playwright/test';
import { SPECIAL_GUESTS } from '../../src/game/specialGuests';
import type { SpecialGuestKind } from '../../src/game/types';

const VIEWS = ['front', 'rear', 'side'] as const;
const TEXT_MASK_COLOR = '#ff00ff';
const TICKER_SNAPSHOT_CSS = `
  .simFotoTicker {
    border-radius: 0 !important;
    background: #7a79c3 !important;
    box-shadow: none !important;
  }
  .simFotoCopy {
    overflow: hidden !important;
    text-shadow: none !important;
  }
`;

async function renderProductionMarqueeScene(page: Page) {
  await page.goto('/?actor-atlas=1');
  return page.evaluate(async ({ views }) => {
    const [{ S, caches }, { draw }, { cameraPositionForWorldPoint }, { Tile }, { SPECIAL_GUESTS }] = await Promise.all([
      import('/src/game/state.ts'),
      import('/src/game/render.ts'),
      import('/src/game/camera.ts'),
      import('/src/game/types.ts'),
      import('/src/game/specialGuests.ts'),
    ]);

    document.body.innerHTML = '<canvas data-production-marquee-scene="true" width="800" height="600"></canvas>';
    document.body.style.margin = '0';
    document.body.style.background = '#17232b';
    const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-production-marquee-scene="true"]')!;
    const ctx = canvas.getContext('2d')!;
    const fillCalls: string[] = [];
    const strokeCalls: string[] = [];
    ctx.fillText = ((text: string) => {
      fillCalls.push(String(text));
    }) as CanvasRenderingContext2D['fillText'];
    ctx.strokeText = ((text: string) => {
      strokeCalls.push(String(text));
    }) as CanvasRenderingContext2D['strokeText'];

    S.tiles.fill(Tile.ROUGH);
    S.elevC.fill(0);
    S.owned.fill(1);
    S.holes = [];
    S.buildings = [];
    S.facilityActivities = [];
    S.employees = [];
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
    S.camTarget = null;
    S.view = { w: 800, h: 600 };

    const positions = [
      { x: 8, y: 18 },
      { x: 13, y: 13 },
      { x: 18, y: 8 },
      { x: 15, y: 25 },
      { x: 20, y: 20 },
      { x: 25, y: 15 },
    ];
    const guests = [SPECIAL_GUESTS.picky, SPECIAL_GUESTS.ivana];
    S.golfers = guests.flatMap((guest, guestIndex) => views.map((view, viewIndex) => {
      const position = positions[guestIndex * views.length + viewIndex];
      return {
        name: guest.name,
        skill: guest.skill,
        length: guest.skill,
        accuracy: guest.skill,
        imagination: guest.skill,
        shirt: guest.visual.shirt,
        skin: guest.visual.skin,
        cap: guest.visual.cap,
        x: position.x,
        y: position.y,
        tx: position.x,
        ty: position.y,
        phase: 0,
        state: 'watch' as const,
        t: 0,
        holeIdx: 0,
        strokes: 0,
        mood: 4,
        ball: null,
        lie: 'fair' as const,
        chatCd: 0,
        scenicSaid: false,
        face: guest.kind === 'picky' ? -1 : 1,
        view,
        energy: 1,
        hunger: 1,
        thirst: 1,
        specialGuest: guest.kind,
      };
    }));

    caches.trees = [];
    caches.waterTiles = [];
    caches.wildlife = [];
    caches.naturePatches = [];
    caches.pathConnected.clear();
    caches.orthoDirty = true;
    caches.groundDirty = true;
    S.cam.z = 1;
    const camera = cameraPositionForWorldPoint(16, 16, 800, 600);
    S.cam = { ...camera, z: 1 };

    draw(ctx, 800, 600);
    return { fillCalls, strokeCalls };
  }, { views: [...VIEWS] });
}

async function enterSandbox(page: Page) {
  await page.goto('/');
  await page.getByText('Sandbox on Maple Crossing — unlimited funds & land', { exact: true }).click();
  await expect(page.locator('.controllerShell')).toHaveAttribute('data-mode', 'build');
}

async function seedGuestTicker(page: Page, kind: SpecialGuestKind) {
  return page.evaluate(async (guestKind) => {
    const [{ useUI }, { setSpeed }, { SPECIAL_GUESTS, specialGuestPortrait }] = await Promise.all([
      import('/src/ui/store.ts'),
      import('/src/game/engine.ts'),
      import('/src/game/specialGuests.ts'),
    ]);
    const guest = SPECIAL_GUESTS[guestKind];
    setSpeed(0);
    useUI.getState().set({
      tickers: [{
        id: guestKind === 'picky' ? 8101 : 8102,
        name: guest.name,
        txt: guestKind === 'picky' ? 'The county inspection begins now.' : 'I have arrived to judge the resort.',
        cls: 'money',
        character: specialGuestPortrait(guestKind),
      }],
      modal: null,
      clubhouseMenu: false,
      buildPanel: false,
      staffPanel: false,
      reportsPanel: false,
      regularsPanel: false,
      scorecardsPanel: false,
      onlinePanel: false,
      proPanel: false,
    });
    return {
      identity: guest.visual.identity,
      signature: guest.visual.signature,
      expression: guest.defaultExpression,
      name: guest.name,
      title: guest.title,
    };
  }, kind);
}

async function openGuestModal(page: Page, kind: SpecialGuestKind) {
  await page.evaluate(async (guestKind) => {
    const [{ useUI }, { S }] = await Promise.all([
      import('/src/ui/store.ts'),
      import('/src/game/state.ts'),
    ]);
    if (guestKind === 'picky') {
      // Mirror a legal career offer instead of the all-owned Sandbox state:
      // a 2×2 home parcel, four edge-adjacent deeds for sale, and the remaining
      // parcels locked. The golden therefore proves every visual cell state.
      S.owned.fill(0);
      for (const parcel of [0, 1, 4, 5]) S.owned[parcel] = 1;
      S.specialVisitors.landOffer = { id: 42, parcelIndices: [2, 6, 8, 9], price: 3_500, remaining: 90 };
      useUI.getState().set({ modal: { kind: 'landOffer' } });
    } else {
      useUI.getState().set({ modal: { kind: 'landmarkGift' } });
    }
  }, kind);
}

async function expectNoOverflow(locator: Locator) {
  const overflow = await locator.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
  expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.clientHeight);
}

test.describe('marquee character production art', () => {
  test.use({ viewport: { width: 800, height: 600 } });

  test('renders Picky and Ivana through the course renderer in front, rear, and side views', async ({ page }) => {
    const calls = await renderProductionMarqueeScene(page);
    for (const guest of Object.values(SPECIAL_GUESTS)) {
      expect(calls.fillCalls.filter((label) => label === guest.name)).toHaveLength(VIEWS.length);
      expect(calls.strokeCalls.filter((label) => label === guest.name)).toHaveLength(VIEWS.length);
    }
    await expect(page.locator('canvas[data-production-marquee-scene="true"]')).toHaveScreenshot('marquee-guests-course.png');
  });

  for (const kind of ['picky', 'ivana'] as const) {
    const expected = SPECIAL_GUESTS[kind];
    const modalKind = kind === 'picky' ? 'landOffer' : 'landmarkGift';
    const modalTitle = kind === 'picky' ? 'County land offer' : "A patron's gift";
    const modalExpression = kind === 'picky' ? 'cross' : 'triumphant';

    test(`${expected.name} keeps one registry identity across ticker and dialog`, async ({ page }) => {
      await enterSandbox(page);
      const profile = await seedGuestTicker(page, kind);
      expect(profile).toEqual({
        identity: expected.visual.identity,
        signature: expected.visual.signature,
        expression: expected.defaultExpression,
        name: expected.name,
        title: expected.title,
      });

      const ticker = page.locator(`.simFotoTicker[data-special-guest="${kind}"]`);
      await expect(ticker).toBeVisible();
      await expect(ticker.locator('.simFotoCopy b')).toHaveText(expected.name);
      await expect(ticker.locator('.simFotoCopy small')).toHaveText(expected.title);
      const tickerPortrait = ticker.locator('.characterPortrait');
      await expect(tickerPortrait).toHaveAttribute('data-character-id', expected.visual.identity);
      await expect(tickerPortrait).toHaveAttribute('data-character-signature', expected.visual.signature);
      await expect(tickerPortrait).toHaveAttribute('data-expression', expected.defaultExpression);
      await expect(tickerPortrait.locator('canvas')).toHaveAttribute('width', '48');
      await expect(tickerPortrait.locator('canvas')).toHaveAttribute('height', '64');
      await expectNoOverflow(ticker);
      // Rounded gradient card chrome rasterizes differently in macOS and
      // Ubuntu Chromium. Flatten only the snapshot fixture; production chrome,
      // semantic copy, geometry, overflow, and portrait pixels are asserted
      // independently above.
      await page.addStyleTag({ content: TICKER_SNAPSHOT_CSS });
      await expect(ticker).toHaveScreenshot(`${kind}-ticker.png`, {
        mask: [ticker.locator('.simFotoCopy')],
        maskColor: TEXT_MASK_COLOR,
      });

      await openGuestModal(page, kind);
      const modal = page.locator(`.modal[data-modal-kind="${modalKind}"]`);
      await expect(modal).toBeVisible();
      await expect(modal.getByRole('heading', { name: modalTitle })).toBeVisible();
      await expect(modal.locator('.guestHeading')).toHaveAttribute('data-special-guest', kind);
      await expect(modal.locator('.guestHeading .tag')).toHaveText(`${expected.name} · ${expected.title}`);
      const modalPortrait = modal.locator('.characterPortrait');
      await expect(modalPortrait).toHaveAttribute('data-character-id', expected.visual.identity);
      await expect(modalPortrait).toHaveAttribute('data-character-signature', expected.visual.signature);
      await expect(modalPortrait).toHaveAttribute('data-expression', modalExpression);
      await expectNoOverflow(modal);
      if (kind === 'picky') {
        await expect(modal.locator('.parcelOfferGrid button.owned')).toHaveCount(4);
        await expect(modal.locator('.parcelOfferGrid button.available')).toHaveCount(4);
        await expect(modal.locator('.parcelOfferGrid button.locked')).toHaveCount(8);
        await expect(modal.locator('.parcelOfferGrid button.available span')).toHaveText(['$3,500', '$3,500', '$3,500', '$3,500']);
      }
      const modalText = modal.locator([
        '.guestHeading > div',
        ':scope > p',
        '.offerMeta',
        '.parcelOfferGrid button b',
        '.parcelOfferGrid button span',
        '.landmarkGiftArt b',
        '.bigbtn',
        '.textBtn',
      ].join(', '));
      await expect(modal).toHaveScreenshot(`${kind}-${modalKind === 'landOffer' ? 'land-offer' : 'landmark-gift'}.png`, {
        mask: [modalText],
        maskColor: TEXT_MASK_COLOR,
      });
    });
  }
});
