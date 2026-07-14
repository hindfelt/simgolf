import { expect, test } from '@playwright/test';

type Box = { x: number; y: number; width: number; height: number };

const right = (box: Box) => box.x + box.width;
const bottom = (box: Box) => box.y + box.height;
const intersects = (a: Box, b: Box) => a.x < right(b) && b.x < right(a) && a.y < bottom(b) && b.y < bottom(a);

async function enterSandbox(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByText('Sandbox on Maple Crossing — unlimited funds & land', { exact: true }).click();
  await expect(page.locator('.controllerShell')).toHaveAttribute('data-mode', 'build');
}

test.use({ viewport: { width: 796, height: 358 } });

test('short landscape construction tray keeps readable tools in a bounded rail', async ({ page }) => {
  await enterSandbox(page);
  await page.locator('.toolGroup[data-group-id="course"]').click();

  const shell = await page.locator('.controllerShell').boundingBox() as Box;
  const dock = await page.locator('[data-ui="construction-dock"]').boundingBox() as Box;
  const tray = await page.locator('.toolTray').boundingBox() as Box;
  const tools = await page.locator('.toolbar .tool').evaluateAll((items) => items.map((item) => {
    const bounds = item.getBoundingClientRect();
    const label = item.querySelector('.nm');
    const style = label ? getComputedStyle(label) : null;
    const labelBounds = label?.getBoundingClientRect();
    const cost = item.querySelector('.ct');
    const costStyle = cost ? getComputedStyle(cost) : null;
    return {
      width: bounds.width,
      height: bounds.height,
      fontSize: style?.fontSize ?? '',
      lineHeight: style?.lineHeight ?? '',
      labelX: labelBounds?.x ?? 0,
      labelY: labelBounds?.y ?? 0,
      labelWidth: labelBounds?.width ?? 0,
      labelHeight: labelBounds?.height ?? 0,
      labelScrollWidth: label?.scrollWidth ?? 0,
      labelScrollHeight: label?.scrollHeight ?? 0,
      costFontSize: costStyle?.fontSize ?? null,
    };
  }));

  expect(shell.width).toBe(796);
  expect(dock.x).toBeGreaterThanOrEqual(200);
  expect(tray.x).toBeGreaterThan(dock.x);
  expect(tools.length).toBeGreaterThan(8);
  expect(tools.every((tool) => tool.width === 64 && tool.height === 52)).toBe(true);
  expect(tools.every((tool) => tool.fontSize === '9px' && tool.lineHeight === '9px')).toBe(true);
  expect(tools.every((tool) => tool.labelWidth <= 62 && tool.labelHeight <= 20)).toBe(true);
  expect(tools.every((tool) => tool.labelScrollWidth <= tool.labelWidth && tool.labelScrollHeight <= tool.labelHeight)).toBe(true);
  expect(tools.filter((tool) => tool.costFontSize !== null).every((tool) => tool.costFontSize === '8px')).toBe(true);

  const labelBoxes = tools.map((tool) => ({ x: tool.labelX, y: tool.labelY, width: tool.labelWidth, height: tool.labelHeight }));
  for (let index = 0; index < labelBoxes.length; index += 1) {
    for (let peer = index + 1; peer < labelBoxes.length; peer += 1) {
      expect(intersects(labelBoxes[index], labelBoxes[peer]), `tool labels ${index} and ${peer} must not overlap`).toBe(false);
    }
  }
});

test.describe('native construction composition', () => {
  test.use({ viewport: { width: 800, height: 600 } });

  test('retains the original eight-column, two-row palette without overflow', async ({ page }) => {
    await enterSandbox(page);
    await page.locator('.toolGroup[data-group-id="course"]').click();

    const shell = await page.locator('.controllerShell').boundingBox() as Box;
    const dock = await page.locator('[data-ui="construction-dock"]').boundingBox() as Box;
    const rail = await page.locator('.toolbar').evaluate((toolbar) => ({
      clientWidth: toolbar.clientWidth,
      scrollWidth: toolbar.scrollWidth,
    }));
    const tools = await page.locator('.toolbar .tool').evaluateAll((items) => items.map((item) => {
      const bounds = item.getBoundingClientRect();
      return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
    }));

    expect(shell).toMatchObject({ x: 0, y: 434, width: 800, height: 166 });
    expect(dock).toMatchObject({ x: 218, y: 492, width: 582, height: 108 });
    expect(rail.scrollWidth).toBeLessThanOrEqual(rail.clientWidth);
    expect(tools).toHaveLength(16);
    const outliers = tools.filter((tool) => tool.x < dock.x || right(tool) > 800 || tool.y < dock.y || bottom(tool) > 600.1);
    expect(outliers).toEqual([]);
  });
});
