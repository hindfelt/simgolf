import { expect, test, type Page } from '@playwright/test';

type Box = { x: number; y: number; width: number; height: number };

const right = (box: Box) => box.x + box.width;
const bottom = (box: Box) => box.y + box.height;
const intersects = (a: Box, b: Box) => a.x < right(b) && b.x < right(a) && a.y < bottom(b) && b.y < bottom(a);

type ToolGeometry = Box & {
  id: string;
  graphic: Box;
  label: Box & { clientWidth: number; clientHeight: number; scrollWidth: number; scrollHeight: number; fontSize: string; lineHeight: string };
  cost: (Box & { clientWidth: number; clientHeight: number; scrollWidth: number; scrollHeight: number; fontSize: string; lineHeight: string }) | null;
};

async function readToolGeometry(page: Page): Promise<ToolGeometry[]> {
  return page.locator('.toolbar .tool').evaluateAll((items) => items.map((item) => {
    const box = item.getBoundingClientRect();
    const graphic = item.querySelector<HTMLElement>('.toolGraphic')!.getBoundingClientRect();
    const label = item.querySelector<HTMLElement>('.nm')!;
    const labelBox = label.getBoundingClientRect();
    const labelStyle = getComputedStyle(label);
    const cost = item.querySelector<HTMLElement>('.ct');
    const costBox = cost?.getBoundingClientRect();
    const costStyle = cost ? getComputedStyle(cost) : null;
    return {
      id: item.getAttribute('data-tool') ?? '',
      x: box.x, y: box.y, width: box.width, height: box.height,
      graphic: { x: graphic.x, y: graphic.y, width: graphic.width, height: graphic.height },
      label: {
        x: labelBox.x, y: labelBox.y, width: labelBox.width, height: labelBox.height,
        clientWidth: label.clientWidth, clientHeight: label.clientHeight,
        scrollWidth: label.scrollWidth, scrollHeight: label.scrollHeight,
        fontSize: labelStyle.fontSize, lineHeight: labelStyle.lineHeight,
      },
      cost: cost && costBox && costStyle ? {
        x: costBox.x, y: costBox.y, width: costBox.width, height: costBox.height,
        clientWidth: cost.clientWidth, clientHeight: cost.clientHeight,
        scrollWidth: cost.scrollWidth, scrollHeight: cost.scrollHeight,
        fontSize: costStyle.fontSize, lineHeight: costStyle.lineHeight,
      } : null,
    };
  }));
}

function expectReadableToolText(tools: ToolGeometry[]) {
  expect(tools.every((tool) => tool.width === 64 && tool.height === 52)).toBe(true);
  for (const tool of tools) {
    expect(tool.label.fontSize, `${tool.id} label font`).toBe('11px');
    expect(tool.label.lineHeight, `${tool.id} label line height`).toBe('11px');
    expect(tool.label.clientHeight, `${tool.id} label height`).toBe(24);
    expect(tool.label.scrollWidth, `${tool.id} label horizontal clipping`).toBeLessThanOrEqual(tool.label.clientWidth);
    expect(tool.label.scrollHeight, `${tool.id} label vertical clipping`).toBeLessThanOrEqual(tool.label.clientHeight);
    expect(tool.label.x).toBeGreaterThanOrEqual(tool.x);
    expect(right(tool.label)).toBeLessThanOrEqual(right(tool));
    expect(tool.label.y).toBeGreaterThanOrEqual(tool.y);
    expect(bottom(tool.label)).toBeLessThanOrEqual(bottom(tool));
    expect(tool.graphic.x).toBeGreaterThanOrEqual(tool.x);
    expect(right(tool.graphic)).toBeLessThanOrEqual(right(tool));
    expect(tool.graphic.y).toBeGreaterThanOrEqual(tool.y);
    expect(bottom(tool.graphic)).toBeLessThanOrEqual(bottom(tool));
    if (!tool.cost) continue;
    expect(tool.cost.fontSize, `${tool.id} price font`).toBe('10px');
    expect(tool.cost.lineHeight, `${tool.id} price line height`).toBe('11px');
    expect(tool.cost.scrollWidth, `${tool.id} price horizontal clipping`).toBeLessThanOrEqual(tool.cost.clientWidth);
    expect(tool.cost.scrollHeight, `${tool.id} price vertical clipping`).toBeLessThanOrEqual(tool.cost.clientHeight);
    expect(tool.cost.x).toBeGreaterThanOrEqual(tool.x);
    expect(right(tool.cost)).toBeLessThanOrEqual(right(tool));
    expect(tool.cost.y).toBeGreaterThanOrEqual(tool.y);
    expect(bottom(tool.cost)).toBeLessThanOrEqual(bottom(tool));
    expect(intersects(tool.label, tool.cost), `${tool.id} label and price must not overlap`).toBe(false);
  }
}

async function expectControlBaySeparation(page: Page, tools: ToolGeometry[]) {
  const controls = await page.locator('.fieldControls').boundingBox() as Box;
  const dock = await page.locator('[data-ui="construction-dock"]').boundingBox() as Box;
  const medallions = await page.locator('.toolGroups .toolGroup').evaluateAll((items) => items.map((item) => {
    const box = item.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  }));
  expect(controls.width).toBe(280);
  expect(dock.x).toBe(right(controls));
  for (const tool of tools) {
    expect(tool.x, `${tool.id} must start outside the control bay`).toBeGreaterThanOrEqual(right(controls));
    for (const medallion of medallions) {
      expect(intersects(tool, medallion), `${tool.id} must not overlap a control medallion`).toBe(false);
    }
  }
}

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
  const tools = await readToolGeometry(page);

  expect(shell.width).toBe(796);
  expect(dock.x).toBe(280);
  expect(tray.x).toBeGreaterThan(dock.x);
  expect(tools.length).toBeGreaterThan(8);
  expectReadableToolText(tools);
  await expectControlBaySeparation(page, tools);

  const labelBoxes = tools.map((tool) => tool.label);
  for (let index = 0; index < labelBoxes.length; index += 1) {
    for (let peer = index + 1; peer < labelBoxes.length; peer += 1) {
      expect(intersects(labelBoxes[index], labelBoxes[peer]), `tool labels ${index} and ${peer} must not overlap`).toBe(false);
    }
  }
});

test.describe('screenshot-sized short landscape construction shell', () => {
  test.use({ viewport: { width: 980, height: 240 } });

  test('keeps the full palette outside the molded controls with 125%-scale type', async ({ page }) => {
    await enterSandbox(page);
    await page.locator('.toolGroup[data-group-id="course"]').click();

    const shell = await page.locator('.controllerShell').boundingBox() as Box;
    const dock = await page.locator('[data-ui="construction-dock"]').boundingBox() as Box;
    const rail = await page.locator('.toolbar').evaluate((toolbar) => ({ clientWidth: toolbar.clientWidth, scrollWidth: toolbar.scrollWidth }));
    const tools = await readToolGeometry(page);

    expect(shell).toMatchObject({ x: 0, y: 74, width: 980, height: 166 });
    expect(dock).toMatchObject({ x: 280, y: 74, width: 700, height: 166 });
    expect(rail.scrollWidth).toBeLessThanOrEqual(rail.clientWidth);
    expect(tools).toHaveLength(16);
    expectReadableToolText(tools);
    await expectControlBaySeparation(page, tools);
    expect(tools.every((tool) => tool.x >= dock.x && right(tool) <= 980 && tool.y >= dock.y && bottom(tool) <= 240)).toBe(true);
  });
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
    const tools = await readToolGeometry(page);
    const courseComposition = await page.evaluate(async () => {
      const sim = (window as unknown as { __sim: {
        S: { cam: { x: number; y: number; z: number } };
        P: (x: number, y: number) => { x: number; y: number };
      } }).__sim;
      const { COURSE_BUILD_FIT_TOP, courseFitViewport, courseSafeViewport } = await import('/src/game/camera.ts');
      return {
        buildFit: courseFitViewport(800, 600, false),
        playSafe: courseSafeViewport(800, 600, true),
        worldOrigin: sim.P(0, 0),
        camera: { ...sim.S.cam },
        expectedBuildTop: COURSE_BUILD_FIT_TOP,
      };
    });

    expect(shell).toMatchObject({ x: 0, y: 434, width: 800, height: 166 });
    expect(dock).toMatchObject({ x: 280, y: 492, width: 520, height: 108 });
    expect(rail.scrollWidth).toBeLessThanOrEqual(rail.clientWidth);
    expect(tools).toHaveLength(16);
    const outliers = tools.filter((tool) => tool.x < dock.x || right(tool) > 800 || tool.y < dock.y || bottom(tool) > 600.1);
    expect(outliers).toEqual([]);
    expectReadableToolText(tools);
    await expectControlBaySeparation(page, tools);
    expect(courseComposition.buildFit).toMatchObject({ top: 8, bottom: 422, height: 414 });
    expect(courseComposition.playSafe).toMatchObject({ top: 116, bottom: 422, height: 306 });
    expect(courseComposition.buildFit.top).toBe(courseComposition.expectedBuildTop);
    expect(courseComposition.worldOrigin.y, 'terrain must project behind the top plaques in build mode').toBeLessThan(courseComposition.playSafe.top);
    expect(courseComposition.camera.z, 'build fit must retain readable course scale').toBeGreaterThan(0.55);
  });
});

test.describe('DPR2 supplied-image construction composition', () => {
  test.use({ viewport: { width: 850, height: 284 }, deviceScaleFactor: 2 });

  test('aligns the CSS-pixel tray with the molded shoulder at 1700x568 device pixels', async ({ page }) => {
    await enterSandbox(page);
    await page.locator('.toolGroup[data-group-id="course"]').click();

    const shell = await page.locator('.controllerShell').boundingBox() as Box;
    const controls = await page.locator('.fieldControls').boundingBox() as Box;
    const dock = await page.locator('[data-ui="construction-dock"]').boundingBox() as Box;
    const tray = await page.locator('.toolTray').boundingBox() as Box;
    const rail = await page.locator('.toolbar').evaluate((toolbar) => ({
      clientWidth: toolbar.clientWidth,
      scrollWidth: toolbar.scrollWidth,
    }));
    const tools = await readToolGeometry(page);

    expect(shell).toMatchObject({ x: 0, y: 118, width: 850, height: 166 });
    expect(controls).toMatchObject({ x: 0, y: 118, width: 280, height: 166 });
    expect(dock).toMatchObject({ x: 280, y: 118, width: 570, height: 166 });
    expect(dock.y, 'DPR2 construction rail and control shoulder must share a top edge').toBe(controls.y);
    expect(tray.y).toBe(122);
    expect(rail.scrollWidth).toBeLessThanOrEqual(rail.clientWidth);
    expect(tools).toHaveLength(16);
    expect(tools.every((tool) => tool.x >= tray.x && right(tool) <= 850 && tool.y >= tray.y && bottom(tool) <= 284)).toBe(true);
    expectReadableToolText(tools);
    await expectControlBaySeparation(page, tools);
  });
});

test.describe('wide-short construction composition', () => {
  test.use({ viewport: { width: 1700, height: 568 } });

  test('aligns the construction rail with the molded shoulder without shrinking or overlapping tools', async ({ page }) => {
    await enterSandbox(page);
    await page.locator('.toolGroup[data-group-id="course"]').click();

    const shell = await page.locator('.controllerShell').boundingBox() as Box;
    const controls = await page.locator('.fieldControls').boundingBox() as Box;
    const dock = await page.locator('[data-ui="construction-dock"]').boundingBox() as Box;
    const tray = await page.locator('.toolTray').boundingBox() as Box;
    const rail = await page.locator('.toolbar').evaluate((toolbar) => ({
      clientWidth: toolbar.clientWidth,
      scrollWidth: toolbar.scrollWidth,
    }));
    const tools = await readToolGeometry(page);

    expect(shell).toMatchObject({ x: 0, y: 402, width: 1700, height: 166 });
    expect(controls).toMatchObject({ x: 0, y: 402, width: 280, height: 166 });
    expect(dock).toMatchObject({ x: 280, y: 402, width: 1420, height: 166 });
    expect(dock.y, 'construction rail and control shoulder must share a top edge').toBe(controls.y);
    expect(tray.y).toBe(dock.y + 4);
    expect(rail.scrollWidth).toBeLessThanOrEqual(rail.clientWidth);
    expect(tools).toHaveLength(16);
    expect(tools.every((tool) => tool.x >= tray.x && right(tool) <= 1700 && tool.y >= tray.y && bottom(tool) <= bottom(dock))).toBe(true);
    expectReadableToolText(tools);
    await expectControlBaySeparation(page, tools);
  });
});
