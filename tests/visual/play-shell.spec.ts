import { expect, test, type Page } from '@playwright/test';

type Box = { x: number; y: number; width: number; height: number };

const right = (box: Box) => box.x + box.width;
const bottom = (box: Box) => box.y + box.height;
const intersects = (a: Box, b: Box) => a.x < right(b) && b.x < right(a) && a.y < bottom(b) && b.y < bottom(a);

async function enterSandboxRound(page: Page) {
  await page.goto('/');
  await page.getByText('Sandbox on Maple Crossing — unlimited funds & land', { exact: true }).click();
  await page.locator('button[title="Play"]').click();
  await expect(page.locator('.controllerShell')).toHaveAttribute('data-mode', 'play');
}

test.use({ viewport: { width: 796, height: 358 } });

test('short landscape play shell is readable, bounded, and pixel locked', async ({ page }) => {
  await enterSandboxRound(page);

  const shell = page.locator('.controllerShell');
  await expect(page.locator('[data-ui="play-shell"]')).toBeVisible();

  const box = async (selector: string) => {
    const bounds = await page.locator(selector).first().boundingBox();
    expect(bounds, `${selector} must have layout geometry`).not.toBeNull();
    return bounds as Box;
  };

  const hud = await box('.playHud');
  await expect(page.locator('.playMessage')).toBeHidden();
  const palette = await box('.playShotPalette');
  const conditions = await box('.playConditions');
  const panes = await box('.playConsolePanes');
  const status = await box('.playStatusPane');
  const skills = await box('.playSkillPane');
  const caddie = await box('.playCaddieBook');
  const quit = await box('.quitBtn');
  const club = await box('.playClubLine .clubBtn');

  expect(hud).toMatchObject({ x: 0, y: 266, width: 796, height: 92 });
  expect(panes).toMatchObject({ x: 59, y: 294, width: 732, height: 60 });
  expect(right(panes)).toBe(791);
  expect(right(caddie)).toBeLessThanOrEqual(791);
  expect(bottom(caddie)).toBeLessThanOrEqual(354);
  expect(club.height).toBe(16);
  expect(quit.width).toBeGreaterThanOrEqual(42);
  expect(quit.height).toBeGreaterThanOrEqual(42);

  expect(intersects(palette, conditions)).toBe(false);
  expect(intersects(status, skills)).toBe(false);
  expect(intersects(skills, caddie)).toBe(false);

  await page.addStyleTag({ content: `
    canvas.game { visibility: hidden !important; }
    body { background: #344f42 !important; }
    .playConditions { visibility: hidden !important; }
    .playHud, .playHud * { color: transparent !important; text-shadow: none !important; }
    .playHud .playClubLine .clubBtn { width: 32px !important; min-width: 32px !important; }
    .playHud .flightGlyph { fill: #fff8ff !important; stroke: #fff8ff !important; }
  ` });
  await expect(shell).toHaveScreenshot('play-shell-796x358.png', { maxDiffPixels: 150 });

  await page.locator('.playHud').evaluate((hud) => {
    const competition = document.createElement('div');
    competition.className = 'playCompetitionHud';
    competition.innerHTML = '<b>PRO CIRCUIT</b><span>Founders Championship</span><em>Gary Golf · Moderate</em>';
    hud.prepend(competition);
  });
  await expect(page.locator('.playMessage')).toBeHidden();
  const competition = await box('.playCompetitionHud');
  expect(competition.y).toBeGreaterThanOrEqual(358 - 136 - 12);
  expect(bottom(competition)).toBeLessThanOrEqual(panes.y);
});

test.describe('coarse compact fallback', () => {
  test.use({ viewport: { width: 320, height: 358 }, hasTouch: true });

  test('keeps the complete club carousel inside the status pane', async ({ page }) => {
    await enterSandboxRound(page);
    const status = await page.locator('.playStatusPane').boundingBox() as Box;
    const clubs = await page.locator('.playClubLine button').evaluateAll((buttons) => buttons.map((button) => {
      const bounds = button.getBoundingClientRect();
      return { x: bounds.x, width: bounds.width, height: bounds.height, flex: getComputedStyle(button).flex };
    }));
    expect(clubs).toHaveLength(3);
    expect(clubs.map((club) => club.height)).toEqual([44, 16, 44]);
    expect(clubs[0].flex).toBe('0 0 44px');
    expect(clubs[1].flex).not.toBe('0 0 44px');
    expect(clubs[2].flex).toBe('0 0 44px');
    expect(Math.max(...clubs.map((club) => club.x + club.width))).toBeLessThanOrEqual(right(status));
  });
});

test.describe('wide native shell', () => {
  test.use({ viewport: { width: 1592, height: 716 } });

  test('uses the full slab and keeps the event card outside course-safe space', async ({ page }) => {
    await enterSandboxRound(page);
    const panes = await page.locator('.playConsolePanes').boundingBox() as Box;
    const caddie = await page.locator('.playCaddieBook').boundingBox() as Box;
    expect(panes).toMatchObject({ x: 350, width: 1234, height: 72 });
    expect(right(caddie)).toBe(1584);

    await page.locator('.playHud').evaluate((hud) => {
      const competition = document.createElement('div');
      competition.className = 'playCompetitionHud';
      competition.innerHTML = '<b>PRO CIRCUIT</b><span>Founders Championship</span><em>Gary Golf · Moderate</em>';
      hud.prepend(competition);
    });
    const competition = await page.locator('.playCompetitionHud').boundingBox() as Box;
    const palette = await page.locator('.playShotPalette').boundingBox() as Box;
    expect(competition.y).toBeGreaterThanOrEqual(716 - 166 - 12);
    expect(bottom(competition)).toBeLessThanOrEqual(palette.y);
    await expect(page.locator('.playMessage')).toBeHidden();
  });
});
