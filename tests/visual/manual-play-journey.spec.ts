import { expect, test, type Page } from '@playwright/test';

type Point = { x: number; y: number };

const journeys = [
  { club: 'Driver', shapeButton: /^Fade Shot/, resultShape: 'Fade' },
  { club: '3 Wood', shapeButton: /^Draw \/ Hook Shot/, resultShape: 'Draw' },
  { club: 'Lob Wedge', shapeButton: /^Low Punch Shot/, resultShape: 'Punch' },
] as const;

async function enterRainyRound(page: Page) {
  await page.goto('/');
  await page.getByText('Sandbox on Maple Crossing — unlimited funds & land', { exact: true }).click();
  await page.evaluate(() => { Math.random = () => .9; });
  await page.locator('button[title="Play"]').click();
  await expect(page.locator('.controllerShell')).toHaveAttribute('data-mode', 'play');
}

async function chooseClub(page: Page, label: string) {
  const current = page.locator('.clubCurrent');
  for (let attempts = 0; attempts < 4 && (await current.textContent())?.trim() !== label; attempts += 1) {
    await page.getByRole('button', { name: /^Next club,/ }).click();
  }
  await expect(current).toHaveText(label);
  await expect(current).toHaveAttribute('aria-pressed', 'true');
}

async function playerBallDrag(page: Page): Promise<{ start: Point; end: Point }> {
  return page.evaluate(() => {
    const sim = (window as unknown as { __sim: {
      S: { player: { ball: Point; holeIdx: number }; holes: Array<{ cup: Point }> };
      PE: (x: number, y: number) => Point;
    } }).__sim;
    const ball = sim.S.player.ball;
    const cup = sim.S.holes[sim.S.player.holeIdx].cup;
    const length = Math.hypot(cup.x - ball.x, cup.y - ball.y) || 1;
    const nx = (cup.x - ball.x) / length;
    const ny = (cup.y - ball.y) / length;
    const start = sim.PE(ball.x, ball.y);
    const forward = sim.PE(ball.x + nx * 5, ball.y + ny * 5);
    return {
      start,
      end: { x: start.x - (forward.x - start.x), y: start.y - (forward.y - start.y) },
    };
  });
}

test.use({ viewport: { width: 800, height: 600 } });

for (const journey of journeys) {
  test(`${journey.club} and ${journey.resultShape} complete a real rainy canvas shot`, async ({ page }, testInfo) => {
    await enterRainyRound(page);

    const shapeButtons = page.locator('.playShotPalette .shapeBtn');
    await expect(shapeButtons).toHaveCount(5);
    const shapeLabels = await shapeButtons.evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label') ?? ''));
    expect(shapeLabels).toEqual([
      expect.stringMatching(/^Fade Shot/),
      expect.stringMatching(/^Draw \/ Hook Shot/),
      expect.stringMatching(/^Straight Shot/),
      expect.stringMatching(/^High Backspin Shot/),
      expect.stringMatching(/^Low Punch Shot/),
    ]);
    await expect(page.getByLabel(/^Steady rain\./)).toBeVisible();
    await expect(page.getByLabel('Wind 17 miles per hour toward NE')).toBeVisible();
    await expect(page.locator('.playMessage')).toBeHidden();

    await chooseClub(page, journey.club);
    const shape = page.getByRole('button', { name: journey.shapeButton });
    await shape.click();
    await expect(shape).toHaveAttribute('aria-pressed', 'true');

    const canvas = page.locator('canvas.game');
    const beforePan = await playerBallDrag(page);
    await page.mouse.move(beforePan.start.x + 90, beforePan.start.y + 70);
    await page.mouse.down();
    await page.mouse.move(beforePan.start.x + 120, beforePan.start.y + 82, { steps: 4 });
    await page.mouse.up();
    await expect(page.locator('.playPaneTitle span')).toHaveText('Stroke 1');
    await expect(page.locator('.playMessage')).toBeHidden();

    const drag = await playerBallDrag(page);
    await page.mouse.move(drag.start.x, drag.start.y);
    await expect(canvas).toHaveClass(/playerBallReady/);
    await page.mouse.down();
    await expect(canvas).toHaveClass(/playerAimActive/);
    await page.mouse.move(drag.end.x, drag.end.y, { steps: 8 });
    await expect(page.locator('.playTargetPower')).toBeVisible();
    await expect(page.locator('.playMessage')).toBeVisible();
    await page.mouse.up();
    await expect(page.locator('.caddieBookHead b')).toHaveText('TRACKING SHOT');
    await page.getByRole('button', { name: 'Fast simulation speed' }).click();

    const result = page.getByRole('region', { name: 'Last shot result' });
    await expect(result).toBeVisible({ timeout: 15_000 });
    await expect(result.locator('.caddieBookHead span')).toContainText(`${journey.club} · ${journey.resultShape}`);
    const metrics = (await result.locator('.caddieMetrics b').allTextContents()).map((value) => Number.parseInt(value, 10));
    expect(metrics).toHaveLength(3);
    expect(metrics.every(Number.isFinite)).toBe(true);
    expect(Math.abs(metrics[2] - metrics[0] - metrics[1])).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath(`${journey.club.toLowerCase().replaceAll(' ', '-')}-${journey.resultShape.toLowerCase()}-result.png`) });
  });
}
