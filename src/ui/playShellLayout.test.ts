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

  it('restores the original fan and readable console at the native Retina landscape width', () => {
    const shortMarker = shell.indexOf('/* A Retina capture of the native 796px-wide game');
    const shortStart = shell.indexOf('@media (min-width: 781px) and (max-width: 862px) and (min-height: 340px) and (max-height: 520px)', shortMarker);
    const shortEnd = shell.indexOf('@media (max-height: 520px) and (max-width: 650px)', shortStart);
    const short = shell.slice(shortStart, shortEnd);
    expect(shortStart).toBeGreaterThan(-1);
    expect(short).toContain('--sg-bottom: 116px;');
    expect(short).toContain('--sg-controller-visible-height: 166px;');
    expect(short).toContain('height: 166px;');
    expect(short).toMatch(/\.fieldControls \{ display: block; \}/);
    expect(short).toMatch(/\.playModeDock \{ display: none; \}/);
    expect(short).toMatch(/\.playHud\s*\{[^}]*left: var\(--sg-control-width\);[^}]*height: 116px;/s);
    expect(short).toMatch(/\.playConsolePanes\s*\{[^}]*left: 64px;[^}]*right: 5px;[^}]*grid-template-columns: minmax\(155px, 165fr\) minmax\(120px, 130fr\) minmax\(195px, 200fr\);/s);
    expect(short).toMatch(/\.playShotPalette\s*\{[^}]*left: 126px;[^}]*top: -21px;/s);
    expect(short).toMatch(/\.shapeBtn,[\s\S]*?flex: 0 0 68px;[\s\S]*?height: 46px;/s);
    expect(short).toContain('font-size: 9.5px; line-height: 10px;');

    const viewportWidth = 796;
    const hudLeft = 218;
    const hudBorder = 4;
    const consolePanes = { x: hudLeft + hudBorder + 64, width: viewportWidth - hudLeft - hudBorder - 64 - 5 };
    const message = { x: hudLeft + hudBorder + 74, width: 360 };
    const palette = { x: hudLeft + hudBorder + 126, width: (68 * 5) + (10 * 4) };
    const conditions = { x: viewportWidth - 9 - 120, width: 120 };
    expect(right(consolePanes)).toBe(viewportWidth - 5);
    expect(intersects(message, conditions)).toBe(false);
    expect(right(palette)).toBe(728);
    expect(right(conditions)).toBe(viewportWidth - 9);
  });
});
