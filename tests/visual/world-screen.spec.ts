import { expect, test, type Page } from '@playwright/test';

type Box = { x: number; y: number; width: number; height: number };

const right = (box: Box) => box.x + box.width;
const bottom = (box: Box) => box.y + box.height;
const intersects = (a: Box, b: Box) => a.x < right(b) && b.x < right(a) && a.y < bottom(b) && b.y < bottom(a);

async function openWorldScreen(page: Page) {
  await page.getByRole('button', { name: 'Open clubhouse menu' }).click();
  await page.getByRole('menuitem', { name: 'World Screen' }).click();
  await expect(page.locator('.worldOffice')).toBeVisible();
}

async function expectCompleteWorldStage(page: Page) {
  const office = page.locator('.worldOffice');
  const stage = page.locator('.worldStage');
  const deeds = page.locator('.worldDeed');
  const pins = page.locator('.worldGlobePin');

  await expect(office).toBeVisible();
  await expect(deeds).toHaveCount(16);
  await expect(pins).toHaveCount(16);
  await expect(page.locator('.worldConnections line')).toHaveCount(16);
  await expect(page.locator('.worldPinLegend')).toBeVisible();

  const stageBox = await stage.boundingBox() as Box;
  expect(stageBox).toMatchObject({ width: 760, height: 390 });
  const deedBoxes = await deeds.evaluateAll((items) => items.map((item) => {
    const box = item.getBoundingClientRect();
    const label = item.querySelector('b');
    return {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      fontSize: label ? Number.parseFloat(getComputedStyle(label).fontSize) : 0,
    };
  }));
  expect(deedBoxes.every((deed) => deed.x >= stageBox.x && deed.y >= stageBox.y && right(deed) <= right(stageBox) && bottom(deed) <= bottom(stageBox))).toBe(true);
  expect(deedBoxes.every((deed) => deed.fontSize >= 9)).toBe(true);
  for (let index = 0; index < deedBoxes.length; index += 1) {
    for (let peer = index + 1; peer < deedBoxes.length; peer += 1) {
      expect(intersects(deedBoxes[index], deedBoxes[peer]), `world deeds ${index} and ${peer} must not overlap`).toBe(false);
    }
  }

  const modalOverflow = await page.locator('.modal[data-modal-kind="newCourse"]').evaluate((modal) => ({
    clientWidth: modal.clientWidth,
    scrollWidth: modal.scrollWidth,
    clientHeight: modal.clientHeight,
    scrollHeight: modal.scrollHeight,
  }));
  expect(modalOverflow.scrollWidth).toBeLessThanOrEqual(modalOverflow.clientWidth);
  expect(modalOverflow.scrollHeight).toBeLessThanOrEqual(modalOverflow.clientHeight);
  await expect(page.locator('.worldCareerAction')).toBeVisible();
  await expect(page.locator('.worldSandboxAction')).toBeVisible();
  await expect(page.locator('.worldSetupOptions')).toBeVisible();
}

test.describe('original 800 by 600 World Screen', () => {
  test.use({ viewport: { width: 800, height: 600 } });

  test('keeps the globe, all sixteen connected deeds, legend, and deed desk in one readable frame', async ({ page }) => {
    await page.goto('/');
    await expectCompleteWorldStage(page);
    await expect(page.locator('.worldDeed[data-property-state="affordable"]')).toHaveCount(6);
    await expect(page.locator('.worldDeed[data-property-state="locked"]')).toHaveCount(10);

    const modal = await page.locator('.modal[data-modal-kind="newCourse"]').boundingBox() as Box;
    const office = await page.locator('.worldOffice').boundingBox() as Box;
    const globe = await page.locator('.worldGlobeArt').boundingBox() as Box;
    const desk = await page.locator('.worldDeedDesk').boundingBox() as Box;
    expect(modal.x).toBeGreaterThanOrEqual(0);
    expect(modal.y).toBeGreaterThanOrEqual(0);
    expect(right(modal)).toBeLessThanOrEqual(800);
    expect(bottom(modal)).toBeLessThanOrEqual(600);
    expect(office.width).toBeGreaterThanOrEqual(760);
    expect(globe.width).toBe(356);
    expect(desk.y).toBeGreaterThanOrEqual(globe.y);
    expect(bottom(desk)).toBeLessThanOrEqual(bottom(office));

    await page.locator('[data-property-id="atacama-wash"]').click();
    await expect(page.locator('.worldDeedDesk')).toHaveAttribute('data-selected-property', 'atacama-wash');
    await expect(page.locator('.worldDeedDesk .propertyUnlocks .missing')).toHaveCount(2);
    await expect(page.locator('.worldCareerAction')).toBeDisabled();

    await page.locator('.worldSetupOptions > summary').click();
    const popover = await page.locator('.worldSetupPopover').boundingBox() as Box;
    expect(popover.x).toBeGreaterThanOrEqual(office.x);
    expect(popover.y).toBeGreaterThanOrEqual(office.y);
    expect(right(popover)).toBeLessThanOrEqual(right(office));
    expect(bottom(popover)).toBeLessThanOrEqual(bottom(office));
    expect(await page.locator('.worldOptionPacks button').count()).toBeGreaterThanOrEqual(2);
    await expect(page.locator('.worldOptionDifficulty button')).toHaveCount(4);
  });
});

test.describe('wide World Screen', () => {
  test.use({ viewport: { width: 1592, height: 706 } });

  test('stays at the original readable 800 by 600 scale without clipping', async ({ page }) => {
    await page.goto('/');
    await expectCompleteWorldStage(page);
    const modal = await page.locator('.modal[data-modal-kind="newCourse"]').boundingBox() as Box;
    expect(modal).toMatchObject({ width: 800, height: 600 });
    expect(modal.x).toBe((1592 - 800) / 2);
    expect(modal.y).toBe((706 - 600) / 2);
  });
});

test.describe('worldwide career progression and portfolio', () => {
  test.use({ viewport: { width: 800, height: 600 } });

  test('releases, purchases, switches, and reloads worldwide properties without losing either resort', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Purchase Maple Crossing', { exact: true }).click();
    await expect(page.locator('.controllerShell')).toHaveAttribute('data-mode', 'build');

    const released = await page.evaluate(async () => {
      const engine = await import('/src/game/engine.ts');
      const { S } = await import('/src/game/state.ts');
      engine.resetDestinationReleaseTracking();
      S.careerProgress = { ...S.careerProgress, lifetimeOperatingEarnings: 2_500 };
      S.rep = 3;
      engine.updateTopbar();
      return engine.checkDestinationReleases();
    });
    expect(released).toContain('atacama-wash');
    await expect(page.locator('.destinationReleaseToast')).toContainText('Atacama Wash');
    await page.getByRole('button', { name: 'Open World Screen' }).click();

    const atacama = page.locator('[data-property-id="atacama-wash"]');
    await expect(atacama).toHaveAttribute('data-property-state', 'affordable');
    await atacama.click();
    await expect(page.locator('.worldCareerAction')).toHaveText('Purchase Atacama Wash · $4,500');
    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('.worldCareerAction').click();
    await expect(page.locator('.controllerShell')).toHaveAttribute('data-mode', 'build');

    const afterPurchase = await page.evaluate(() => {
      const sim = (window as unknown as { __sim: { S: { propertyId: string; cash: number; propertiesPurchased: string[] } } }).__sim;
      return { propertyId: sim.S.propertyId, cash: sim.S.cash, purchased: [...sim.S.propertiesPurchased] };
    });
    expect(afterPurchase).toMatchObject({ propertyId: 'atacama-wash', cash: 15_500 });
    expect(afterPurchase.purchased).toEqual(expect.arrayContaining(['maple-crossing', 'atacama-wash']));

    await page.reload();
    await expect(page.locator('.controllerShell')).toHaveAttribute('data-mode', 'build');
    await openWorldScreen(page);
    await expect(page.locator('.worldDeedDesk')).toHaveAttribute('data-selected-property', 'atacama-wash');
    await expect(page.locator('[data-property-id="atacama-wash"]')).toHaveAttribute('data-property-state', 'current');
    await expect(page.locator('[data-property-id="maple-crossing"]')).toHaveAttribute('data-property-state', 'purchased');

    await page.locator('[data-property-id="maple-crossing"]').click();
    await page.getByRole('button', { name: /^Visit career resort Maple Crossing/ }).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __sim: { S: { propertyId: string } } }).__sim.S.propertyId)).toBe('maple-crossing');
    await page.reload();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __sim: { S: { propertyId: string } } }).__sim.S.propertyId)).toBe('maple-crossing');
  });
});
