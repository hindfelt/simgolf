import { expect, test } from '@playwright/test';

test('native actor atlas is pixel exact', async ({ page }) => {
  await page.goto('/?actor-atlas=1');
  const atlas = page.locator('canvas[data-actor-atlas="true"]');

  await expect(atlas).toHaveAttribute('data-atlas-ready', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-actor-atlas-ready', 'true');
  await expect(atlas).toHaveAttribute('data-case-count', '672');
  await expect(atlas).toHaveScreenshot('actor-atlas.png');
});
