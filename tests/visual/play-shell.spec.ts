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

async function activateCompetitionAimAdvice(page: Page) {
  await page.evaluate(async () => {
    const [{ S }, { useUI }] = await Promise.all([
      import('/src/game/state.ts'),
      import('/src/ui/store.ts'),
    ]);
    const current = useUI.getState().playHud;
    if (!current) throw new Error('Play HUD is not active');
    S.activeChampionship = {
      id: 'visual-championship',
      title: 'Founders Championship',
      courseId: 'visual-course',
      courseName: 'Maple Crossing',
      difficulty: 'moderate',
      pro: S.proProfile,
      usesResidentPro: true,
    };
    useUI.getState().set({ playHud: { ...current, power: .72 } });
  });
  await expect(page.locator('.playCompetitionHud')).toBeVisible();
}

async function expectCompactTacticalStack(
  page: Page,
  expected: { message: Box; competition: Omit<Box, 'height'> },
) {
  await expect(page.locator('.playMessage')).toBeVisible();
  const message = await page.locator('.playMessage').boundingBox() as Box;
  const competition = await page.locator('.playCompetitionHud').boundingBox() as Box;
  const palette = await page.locator('.playShotPalette').boundingBox() as Box;
  const conditions = await page.locator('.playConditions').boundingBox() as Box;
  const panes = await page.locator('.playConsolePanes').boundingBox() as Box;

  expect(message).toMatchObject(expected.message);
  expect(competition).toMatchObject(expected.competition);
  expect(competition.height).toBeGreaterThanOrEqual(18);
  expect(competition.height).toBeLessThanOrEqual(19);
  expect(intersects(message, competition)).toBe(false);
  expect(intersects(message, palette)).toBe(false);
  expect(intersects(message, conditions)).toBe(false);
  expect(intersects(competition, palette)).toBe(false);
  expect(intersects(competition, conditions)).toBe(false);
  expect(intersects(competition, panes)).toBe(false);

  const overflow = await page.locator('.playHud').evaluate((hud) =>
    ['.playMessage', '.playCompetitionHud'].map((selector) => {
      const element = hud.querySelector<HTMLElement>(selector)!;
      const box = element.getBoundingClientRect();
      const childrenInside = [...element.children].every((child) => {
        const childBox = child.getBoundingClientRect();
        return childBox.left >= box.left - 1 && childBox.right <= box.right + 1
          && childBox.top >= box.top - 1 && childBox.bottom <= box.bottom + 1;
      });
      return {
        selector,
        horizontal: element.scrollWidth - element.clientWidth,
        vertical: element.scrollHeight - element.clientHeight,
        childrenInside,
      };
    }),
  );
  expect(overflow).toEqual([
    { selector: '.playMessage', horizontal: 0, vertical: 0, childrenInside: true },
    { selector: '.playCompetitionHud', horizontal: 0, vertical: 0, childrenInside: true },
  ]);
}

async function expectPlayHudContentToFit(page: Page) {
  const fit = await page.locator('.playHud').evaluate((hud) => {
    const checked = Array.from(hud.querySelectorAll<HTMLElement>([
      '.playConsolePanes',
      '.playConsolePanes > section',
      '.playPaneTitle b',
      '.playPaneTitle span',
      '.clubCurrent',
      '.playShotFacts span',
      '.playSkillPane b',
      '.playSkillPane em',
      '.caddieBookHead',
      '.caddieBookHead b',
      '.caddieBookHead span',
      '.caddieMetrics',
      '.caddieMetrics > span',
      '.caddieMetrics small',
      '.caddieMetrics b',
      '.playCaddieBook p',
    ].join(','))).filter((element) => getComputedStyle(element).display !== 'none');
    const clipped = checked.filter((element) => {
      const widthClipped = element.scrollWidth > element.clientWidth + 1;
      // The compact club key uses a transparent ::after hit area above and
      // below the visible 17px control. That deliberate coarse-pointer reach
      // contributes to scrollHeight but does not clip its label.
      const heightClipped = !element.matches('.clubCurrent') && element.scrollHeight > element.clientHeight + 1;
      return widthClipped || heightClipped;
    }).map((element) => ({
      selector: element.className || element.tagName,
      client: [element.clientWidth, element.clientHeight],
      scroll: [element.scrollWidth, element.scrollHeight],
      text: element.textContent?.trim(),
    }));
    const viewport = { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight };
    const offscreen = Array.from(hud.querySelectorAll<HTMLElement>('.playConsolePanes > section, .playShotPalette .shapeBtn, .quitBtn'))
      .filter((element) => getComputedStyle(element).display !== 'none')
      .filter((element) => {
        const box = element.getBoundingClientRect();
        return box.left < -1 || box.right > viewport.width + 1 || box.top < -1 || box.bottom > viewport.height + 1;
      })
      .map((element) => element.className);
    return { clipped, offscreen };
  });
  expect(fit.clipped).toEqual([]);
  expect(fit.offscreen).toEqual([]);
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

  expect(hud).toMatchObject({ x: 0, y: 244, width: 796, height: 114 });
  expect(panes).toMatchObject({ x: 59, y: 266, width: 731, height: 88 });
  expect(right(panes)).toBe(790);
  expect(right(caddie)).toBeLessThanOrEqual(790);
  expect(bottom(caddie)).toBeLessThanOrEqual(354);
  expect(palette).toMatchObject({ x: 243.5, y: 207, width: 309, height: 39 });
  expect(club.height).toBe(17);
  expect(quit).toMatchObject({ x: 8, y: 279, width: 45, height: 45 });

  expect(intersects(palette, conditions)).toBe(false);
  expect(intersects(status, skills)).toBe(false);
  expect(intersects(skills, caddie)).toBe(false);
  await expect(page.locator('.fieldControls')).toBeHidden();
  await expect(page.locator('.playModeDock')).toBeHidden();

  const readableType = await page.locator('.playHud').evaluate((playHud) => {
    const size = (selector: string) => Number.parseFloat(getComputedStyle(playHud.querySelector(selector)!).fontSize);
    return {
      paneTitle: size('.playPaneTitle b'),
      club: size('.clubCurrent'),
      facts: size('.playShotFacts'),
      skills: size('.playSkillPane'),
      caddieTitle: size('.caddieBookHead b'),
      metricLabel: size('.caddieMetrics small'),
      metricValue: size('.caddieMetrics b'),
      resultCopy: size('.playCaddieBook p'),
    };
  });
  expect(readableType).toEqual({
    paneTitle: 13,
    club: 11,
    facts: 11,
    skills: 12,
    caddieTitle: 13,
    metricLabel: 10,
    metricValue: 15,
    resultCopy: 11,
  });

  await page.addStyleTag({ content: `
    canvas.game { visibility: hidden !important; }
    body { background: #344f42 !important; }
    .playConditions { visibility: hidden !important; }
    .playHud, .playHud * { color: transparent !important; text-shadow: none !important; }
    .playHud .playClubLine .clubBtn { width: 32px !important; min-width: 32px !important; }
    .playHud .flightGlyph { fill: #fff8ff !important; stroke: #fff8ff !important; }
  ` });
  await expect(shell).toHaveScreenshot('play-shell-796x358.png', { maxDiffPixels: 150 });

  await activateCompetitionAimAdvice(page);
  await expectCompactTacticalStack(page, {
    message: { x: 8, y: 207, width: 210, height: 40 },
    competition: { x: 59, y: 247, width: 577 },
  });
});

test.describe('native championship shell', () => {
  test.use({ viewport: { width: 800, height: 600 } });

  test('keeps competition identity clear while native play suppresses duplicate advice', async ({ page }) => {
    await enterSandboxRound(page);
    await activateCompetitionAimAdvice(page);
    await expect(page.locator('.playMessage')).toBeHidden();

    const competition = await page.locator('.playCompetitionHud').boundingBox() as Box;
    const palette = await page.locator('.playShotPalette').boundingBox() as Box;
    const conditions = await page.locator('.playConditions').boundingBox() as Box;
    expect(intersects(competition, palette)).toBe(false);
    expect(intersects(competition, conditions), JSON.stringify({ competition, conditions })).toBe(false);
    expect(competition.x).toBeGreaterThanOrEqual(0);
    expect(right(competition)).toBeLessThanOrEqual(800);
    expect(competition.y).toBeGreaterThanOrEqual(0);

    const overflow = await page.locator('.playCompetitionHud').evaluate((element) => ({
      horizontal: element.scrollWidth - element.clientWidth,
      vertical: element.scrollHeight - element.clientHeight,
    }));
    expect(overflow).toEqual({ horizontal: 0, vertical: 0 });
  });
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

test.describe('retina short landscape', () => {
  test.use({ viewport: { width: 796, height: 358 }, deviceScaleFactor: 2 });

  test('keeps the fan retired and every production HUD label unclipped', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Sandbox on Maple Crossing — unlimited funds & land', { exact: true }).click();
    await page.evaluate(() => { Math.random = () => .9; });
    await page.locator('button[title="Play"]').click();
    await expect(page.locator('.controllerShell')).toHaveAttribute('data-mode', 'play');
    await expect(page.locator('.playShotPalette .shapeBtn')).toHaveCount(5);
    await expect(page.locator('.fieldControls')).toBeHidden();
    await expect(page.locator('.playModeDock')).toBeHidden();
    const drawHook = page.locator('.drawHookControl');
    await drawHook.click();
    await drawHook.click();
    await expect(drawHook).toHaveAttribute('data-selected-shape', 'hook');
    await expect(page.locator('.caddieBookHead span')).toContainText('Hook');
    await expect(page.locator('.caddieMetrics small').last()).toHaveText('FINISH');
    await expectPlayHudContentToFit(page);

    await page.evaluate(async () => {
      const { useUI } = await import('/src/ui/store.ts');
      const current = useUI.getState().playHud!;
      useUI.getState().set({
        playHud: {
          ...current,
          club: 'lobWedge',
          shape: 'backspin',
          lastShotFeedback: {
            stroke: 2,
            club: 'lobWedge',
            shape: 'backspin',
            power: .87,
            carryDistance: 8.25,
            rollDistance: .35,
            finishDistance: 8.6,
            resultLie: 'deeprough',
            events: ['deeprough'],
            penalty: 1,
            holed: false,
          },
        },
      });
    });
    await expect(page.locator('.caddieBookHead b')).toHaveText('SHOT RESULT');
    await expect(page.locator('.caddieBookHead span')).toHaveText('Lob Wedge · Backspin');
    await page.locator('.playCaddieBook').evaluate((book) => Promise.all(book.getAnimations().map((animation) => animation.finished)));
    await expectPlayHudContentToFit(page);

    const geometry = await page.locator('.playStatusPane').evaluate((status) => {
      const statusBox = status.getBoundingClientRect();
      const lastFact = status.querySelector('.playShotFacts span:last-child')!.getBoundingClientRect();
      const panes = status.closest('.playConsolePanes')! as HTMLElement;
      return {
        statusBottom: statusBox.bottom,
        lastFactBottom: lastFact.bottom,
        statusOverflow: status.scrollHeight - status.clientHeight,
        panesOverflow: panes.scrollWidth - panes.clientWidth,
        viewportWidth: document.documentElement.clientWidth,
        panesRight: panes.getBoundingClientRect().right,
      };
    });
    expect(geometry.lastFactBottom).toBeLessThanOrEqual(geometry.statusBottom - 2);
    expect(geometry.statusOverflow).toBeLessThanOrEqual(0);
    expect(geometry.panesOverflow).toBeLessThanOrEqual(0);
    expect(geometry.panesRight).toBeLessThanOrEqual(geometry.viewportWidth - 6);

  });
});

test.describe('wide short-landscape shell', () => {
  test.use({ viewport: { width: 1592, height: 716 } });

  test('retires the fan and keeps the complete console compact', async ({ page }) => {
    await enterSandboxRound(page);
    await expect(page.locator('.playShotPalette .shapeBtn')).toHaveCount(5);
    await expect(page.locator('.playMessage')).toBeHidden();
    const hud = await page.locator('.playHud').boundingBox() as Box;
    const panes = await page.locator('.playConsolePanes').boundingBox() as Box;
    const caddie = await page.locator('.playCaddieBook').boundingBox() as Box;
    const palette = await page.locator('.playShotPalette').boundingBox() as Box;
    expect(hud).toMatchObject({ x: 0, y: 602, width: 1592, height: 114 });
    expect(panes).toMatchObject({ x: 59, y: 624, width: 1527, height: 88 });
    expect(right(caddie)).toBe(1586);
    expect(palette).toMatchObject({ x: 641.5, y: 565, width: 309, height: 39 });
    await expect(page.locator('.fieldControls')).toBeHidden();
    await expect(page.locator('.playModeDock')).toBeHidden();
    await expect(page.locator('.simFotoTicker')).toBeHidden();

    const readableType = await page.locator('.playHud').evaluate((hud) => {
      const size = (selector: string) => Number.parseFloat(getComputedStyle(hud.querySelector(selector)!).fontSize);
      return {
        paneTitle: size('.playPaneTitle b'),
        club: size('.clubCurrent'),
        facts: size('.playShotFacts'),
        skills: size('.playSkillPane'),
        caddieTitle: size('.caddieBookHead b'),
        metricLabel: size('.caddieMetrics small'),
        metricValue: size('.caddieMetrics b'),
        resultCopy: size('.playCaddieBook p'),
      };
    });
    expect(readableType).toEqual({
      paneTitle: 13,
      club: 11,
      facts: 11,
      skills: 12,
      caddieTitle: 13,
      metricLabel: 10,
      metricValue: 15,
      resultCopy: 11,
    });

    await activateCompetitionAimAdvice(page);
    await expectCompactTacticalStack(page, {
      message: { x: 8, y: 565, width: 320, height: 40 },
      competition: { x: 59, y: 605, width: 1373 },
    });

    await page.locator('.ticker').evaluate((ticker) => {
      const stalePortrait = document.createElement('article');
      stalePortrait.className = 'simFotoTicker';
      stalePortrait.textContent = 'Stale portrait chatter';
      ticker.append(stalePortrait);
    });
    await expect(page.locator('.simFotoTicker')).toBeHidden();
  });
});
