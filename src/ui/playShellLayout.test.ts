import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const shell = readFileSync(new URL('../simgolf-shell.css', import.meta.url), 'utf8');

interface Rect { x: number; width: number }

const right = (rect: Rect) => rect.x + rect.width;
const intersects = (a: Rect, b: Rect) => a.x < right(b) && b.x < right(a);

describe('original play shell responsive geometry', () => {
  const compactStart = shell.indexOf('@media (max-width: 862px) and (min-width: 781px)');
  const compactEnd = shell.indexOf('@media (max-width: 780px)', compactStart);
  const compact = shell.slice(compactStart, compactEnd);

  it('uses the 800px native composition between the mobile and desktop fits', () => {
    expect(compactStart).toBeGreaterThan(-1);
    expect(compact).toContain('left: 115px;');
    expect(compact).toContain('right: 8px;');
    expect(compact).toContain('left: 152px;');
    expect(compact).toContain('width: 58px;');
    expect(compact).toContain('gap: 7px;');
    expect(compact).toContain('right: 124px;');

    for (const viewportWidth of [862, 800, 796, 781]) {
      const fan = { x: 0, width: 280 };
      const hudPaddingX = 218 + 4;
      const quit = { x: hudPaddingX + 67, width: 45 };
      const palette = { x: hudPaddingX + 152, width: (58 * 6) + (7 * 5) };
      const panes = { x: hudPaddingX + 115, width: viewportWidth - (hudPaddingX + 115) - 8 };
      const message = { x: hudPaddingX + 115, width: viewportWidth - 124 - (hudPaddingX + 115) };
      const conditions = { x: viewportWidth - 8 - 104, width: 104 };

      expect(intersects(fan, panes)).toBe(false);
      expect(intersects(quit, palette)).toBe(false);
      expect(intersects(message, conditions)).toBe(false);
      expect(right(palette)).toBeLessThanOrEqual(viewportWidth);
      expect(right(panes)).toBe(viewportWidth - 8);
      expect(panes.width).toBeGreaterThanOrEqual(436);
    }
  });

  it('keeps the phone rail beside Quit and scrolls before it can clip', () => {
    expect(shell).toMatch(/@media \(max-width: 520px\)[\s\S]*?\.controllerShell\[data-mode='play'\] \.playShotPalette\s*\{[^}]*left: 57px;[^}]*right: 3px;/s);
    expect(shell).toMatch(/\.controllerShell\[data-mode='play'\] \.playShotPaletteRail\s*\{[^}]*padding: 5px;[^}]*overflow-x: auto;[^}]*overflow-y: hidden;/s);
    expect(shell).toContain('scroll-snap-type: x proximity;');

    const quit = { x: 9, width: 45 };
    const paletteRail = (viewportWidth: number): Rect => ({ x: 62, width: viewportWidth - 70 });
    expect(intersects(quit, paletteRail(390))).toBe(false);
    expect((49 * 6) + (4 * 5)).toBeLessThanOrEqual(paletteRail(390).width);
    expect((49 * 6) + (4 * 5)).toBeGreaterThan(paletteRail(320).width);
  });

  it('removes the routing monitor whenever the round controller is active', () => {
    expect(shell).toMatch(/body:has\(\.controllerShell\[data-mode='play'\]\) \.routingMap\s*\{\s*display: none;/);
  });

  it('provides real non-overlapping 44px coarse club and shape targets', () => {
    expect(shell).toMatch(/@media \(pointer: coarse\) and \(max-width: 862px\)[\s\S]*?\.playClubLine button\s*\{[^}]*width: 44px;[^}]*min-width: 44px;[^}]*height: 44px;[^}]*min-height: 44px;/s);
    expect(shell).toMatch(/@media \(pointer: coarse\)[\s\S]*?\.playShotPalette \.shapeBtn \{ min-height: 44px; \}/);
  });
});
