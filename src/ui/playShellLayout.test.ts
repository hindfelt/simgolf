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
      const palette = { x: hudPaddingX + 152, width: (58 * 5) + (7 * 4) };
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
    expect((49 * 5) + (4 * 4)).toBeLessThanOrEqual(paletteRail(390).width);
    expect((49 * 5) + (4 * 4)).toBeGreaterThan(paletteRail(320).width);
  });

  it('removes the routing monitor whenever the round controller is active', () => {
    expect(shell).toMatch(/body:has\(\.controllerShell\[data-mode='play'\]\) \.routingMap\s*\{\s*display: none;/);
  });

  it('keeps portrait chatter out of the aiming area even if stale DOM injects it', () => {
    expect(shell).toMatch(/body:has\(\.controllerShell\[data-mode='play'\]\) \.simFotoTicker\s*\{\s*display: none !important;/);
  });

  it('keeps the visible club row native-size instead of letting legacy coarse targets clip it', () => {
    expect(shell).toMatch(/\.controllerShell \.playHud \.playClubLine \.clubBtn\s*\{[^}]*height: 15px;[^}]*min-height: 15px;/s);
    expect(shell).toMatch(/\.controllerShell \.playHud \.playClubLine \.clubBtn::after\s*\{[^}]*inset: -7px 0;/s);
  });

  it('recomposes short landscape play without scaling text or clipping the caddie pane', () => {
    const shortMarker = shell.indexOf('/* Short landscape windows');
    const shortStart = shell.indexOf('@media (max-height: 520px)', shortMarker);
    const shortEnd = shell.indexOf('@media (max-height: 520px) and (max-width: 650px)', shortStart);
    const short = shell.slice(shortStart, shortEnd);
    expect(shortStart).toBeGreaterThan(-1);
    expect(short).toContain('--sg-bottom: 92px;');
    expect(short).toContain('--sg-controller-visible-height: 136px;');
    expect(short).toContain('height: 136px;');
    expect(short).toMatch(/\.fieldControls,[\s\S]*?\.playModeDock \{ display: none; \}/);
    expect(short).toMatch(/\.playHud\s*\{[^}]*left: 0;[^}]*height: 92px;/s);
    expect(short).toMatch(/\.playConsolePanes\s*\{[^}]*left: 59px;[^}]*right: 5px;[^}]*grid-template-columns: 190px 114px minmax\(230px, 1fr\);/s);
    expect(short).toMatch(/\.playShotPalette\s*\{[^}]*left: calc\(50% - 166px\);[^}]*top: -40px;/s);

    const viewportWidth = 796;
    const consolePanes = { x: 59, width: viewportWidth - 59 - 5 };
    const message = { x: 8, width: 210 };
    const palette = { x: viewportWidth / 2 - 166, width: (51 * 5) + (5 * 4) };
    const conditions = { x: viewportWidth - 6 - 104, width: 104 };
    expect(right(consolePanes)).toBe(viewportWidth - 5);
    expect(intersects(message, palette)).toBe(false);
    expect(intersects(palette, conditions)).toBe(false);
    expect(right(conditions)).toBe(viewportWidth - 6);
  });
});
