import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isCanvasShortcutTarget, isGameShortcutSurface, isInteractiveShortcutTarget, keyboardAimState, resetKeyboardAimMemory, spaceHeldAfterKeyUp, updatePointerAim } from '../game/input';
import { playerAimIntent } from '../game/engine';
import { shotShortcutForEvent } from '../game/shotShortcuts';
import { S } from '../game/state';

describe('play controls accessibility and shot-shape presentation', () => {
  const hud = readFileSync(new URL('./PlayHud.tsx', import.meta.url), 'utf8');
  const input = readFileSync(new URL('../game/input.ts', import.meta.url), 'utf8');
  const render = readFileSync(new URL('../game/render.ts', import.meta.url), 'utf8');
  const engineSource = readFileSync(new URL('../game/engine.ts', import.meta.url), 'utf8');
  const store = readFileSync(new URL('./store.ts', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  const shell = readFileSync(new URL('../simgolf-shell.css', import.meta.url), 'utf8');

  it('exposes an explicit Hook alongside Draw and Fade', () => {
    expect(hud).toContain("['straight', 'fade', 'draw', 'hook', 'backspin', 'punch']");
    expect(hud).toContain("hook: { label: 'Hook Shot', note: 'hard right-to-left flight'");
  });

  it('matches the original molded play console instead of a card workbench', () => {
    expect(hud).toContain('className="playShotPalette"');
    expect(hud).toContain('className="playConsolePanes"');
    expect(hud).toContain("label: 'Fade Shot (L to R)'");
    expect(hud).toContain("label: 'Draw Shot (R to L)'");
    expect(hud).toContain("label: 'High Backspin Shot'");
    expect(hud).toContain("['powerHitter', 'Power Hitter']");
    expect(hud).toContain("'CADDIE BOOK'");
    expect(shell).toMatch(/\.playHud\s*\{[\s\S]*?height: var\(--sg-bottom\);[\s\S]*?overflow: visible;/);
    expect(shell).toMatch(/\.playShotPalette \.shapeBtn\.on\s*\{[\s\S]*?#20d365/);
    expect(shell).not.toMatch(/\.playShotPalette \.shapeBtn\.on\s*\{[^}]*0 0 0 3px #f5ed21/s);
  });

  it('announces selected clubs and shot shapes to assistive technology', () => {
    expect(hud).toContain('aria-pressed={playHud.club === id}');
    expect(hud).toContain('aria-pressed={playHud.shape === id}');
    expect(hud).toContain('miles per hour toward ${windPoint}');
  });

  it('exposes playable weather conditions without obscuring shot feedback', () => {
    expect(hud).toContain('role="group" aria-label="Course conditions"');
    expect(hud).toContain('weatherDescription(weather)');
    expect(hud).toContain('weather-${weather.condition}');
    expect(store).toContain('weatherCondition: WeatherCondition;');
    expect(render).toContain('function drawWeather(');
    expect(render).toContain('drawWeather(ctx, cssW, cssH);');
    expect(render.indexOf('drawWeather(ctx, cssW, cssH);')).toBeLessThan(render.indexOf('drawAim(ctx, u);'));
    expect(css).toContain('.playHud .weather-rain');
  });

  it('makes curved flight, wind drift, and the landing result visibly legible', () => {
    expect(render).toContain('flightTrailSamples(b)');
    expect(render).toContain("b.shotShape === 'fade'");
    expect(render).toContain('const radius = playerBall ? Math.max(3.2, 3.15 * u) : 2.2 * u');
    expect(hud).toContain('shotWindLabel(windEffect, YARDS_PER_TILE)');
    expect(hud).toContain('className="caddieMetrics"');
    expect(hud).toContain('result?.carryDistance');
    expect(hud).toContain('result?.rollDistance');
    expect(hud).toContain('result?.finishDistance');
    expect(store).toContain('lastShotFeedback: PlayerShotFeedback | null;');
    expect(engineSource).toContain('shotLandingBurst(pos.x, pos.y, pending.shape)');
    expect(engineSource).toContain('shotInFlight: p.state === \'wait\'');
    expect(render).toContain('worldWindScreenVector(S.wind.dx, S.wind.dy, S.rot)');
    expect(shell).toContain('.playCaddieBook.hasResult');
  });

  it('presents club strategy, lie restrictions, and shot forecasts as grouped controls', () => {
    expect(hud).toContain('role="region" aria-label="Player round controls"');
    expect(hud).toContain('role="group" aria-label="Shot setup"');
    expect(hud).toContain('role="group" aria-label={`Club selection from ${lieLabel(playHud.lie)}`}');
    expect(hud).toContain('role="group" aria-label="Shot technique selection"');
    expect(hud).toContain('disabled={!option.available}');
    expect(hud).toContain("option.reason ?? 'Unavailable from this lie'");
    expect(hud).toContain('playHud.selectedRole');
    expect(hud).toContain('playHud.carry ?? playHud.pinDistance');
    expect(hud).toContain('SHAPE_PRESENTATION[playHud.shape].label');
  });

  it('publishes the shared canopy forecast as a compact static status with contextual caddie advice', () => {
    expect(engineSource).toContain('playerShotForecast(p.ball, p.lie, p.club, p.shape, aim.dirX, aim.dirY, aim.power)');
    expect(engineSource).toContain("? 'Canopy clear'");
    expect(engineSource).toContain("? 'Canopy risk'");
    expect(engineSource).toContain("? 'Trunk risk'");
    expect(engineSource).toContain("? 'Pine risk'");
    expect(engineSource).toContain('forecast?.restingPoint');
    expect(engineSource).toContain('finishDistance: restingDistance ??');
    expect(engineSource).toContain('dispersion may miss');
    expect(engineSource).toContain('Enter to swing${keyboardRisk}.');
    expect(store).toContain("canopyStatus: 'clear' | 'canopy' | 'trunk' | 'pine' | null;");
    expect(hud).toContain('id="canopy-status"');
    expect(hud).toContain('role="note" aria-label={`Tree flight status: ${playHud.canopyLabel}`}');
    expect(hud.match(/aria-describedby=\{canopyDescription\}/g)).toHaveLength(2);
    expect(hud).toContain('<strong>Caddie:</strong> {playHud.canopyAdvice}');
    expect(hud).not.toMatch(/canopyAdvice[^\n]*aria-live/);
    expect(css).toContain('.canopyStatus.canopy-trunk');
    expect(css).toContain('.canopyAdvice.canopy-pine');
    expect(css).toMatch(/\.canopyStatus \{[\s\S]*?font-size: 8px;/);
    expect(css).toMatch(/\.canopyAdvice \{[\s\S]*?font-size: 8\.5px;/);
  });

  it('uses the shared cached shot forecast in aim height, landing dispersion, and rollout previews', () => {
    expect(render).toContain('currentPlayerShotForecast(aim)');
    expect(render).not.toContain('function cachedAimForecast(');
    expect(render).toContain('ballFlightPosition(path, t)');
    expect(render).toContain('playerShotDispersion(p.lie, p.club, p.shape, plan.targetDistance).previewRadius');
    expect(render).toContain('playerEstimatedRoll(lieOf(landX, landY), p.shape, p.club)');
  });

  it('presents the ideal obstruction as risk while retaining dispersion and physical finish context', () => {
    expect(render).toContain('traceAimFlight(ctx, path, warningStart, canopyImpact.t, u)');
    expect(render).toContain("impact.kind === 'trunk' ? 'TREE RISK' : 'CANOPY RISK'");
    expect(render).toContain('forecast.restingPoint.x');
    expect(render).toContain("canopyImpact ? 'rgba(255,220,145,.3)' : 'rgba(255,255,255,.85)'");
    expect(render).toContain('if (!canopyImpact)');
  });

  it('renders tree species and scale from the same geometry profile used by collision', () => {
    expect(render).toContain('treeCollisionProfile(Math.floor(tr.x), Math.floor(tr.y), S.theme)');
    expect(render).toContain('sharedTreeKindFor(S.theme, profile.seed)');
    expect(render).toContain('const k = profile.visualScale * u');
    expect(render).not.toContain('function treeKindFor(');
  });

  it('supports keyboard aim, power adjustment, and firing on the canvas', () => {
    expect(input).toContain("e.key === 'ArrowLeft' || e.key === 'ArrowRight'");
    expect(input).toContain("e.key === 'ArrowUp' || e.key === 'ArrowDown'");
    expect(input).toContain("e.key === 'Enter'");
    expect(input).toContain('keyboardIntent?.dirX');
    expect(input).toContain("kind: 'keyboard'");
    expect(input).toContain('updatePlayHud()');
  });

  it('maps number-row and numpad keys to clubs and flight shapes without modifiers', () => {
    expect(shotShortcutForEvent({ code: 'Digit1' })).toEqual({ kind: 'club', id: 'driver' });
    expect(shotShortcutForEvent({ code: 'Digit3' })).toEqual({ kind: 'club', id: 'wedge' });
    expect(shotShortcutForEvent({ code: 'Digit4' })).toEqual({ kind: 'shape', id: 'straight' });
    expect(shotShortcutForEvent({ code: 'Digit5' })).toEqual({ kind: 'shape', id: 'fade' });
    expect(shotShortcutForEvent({ code: 'Numpad6' })).toEqual({ kind: 'shape', id: 'draw' });
    expect(shotShortcutForEvent({ code: 'Digit7' })).toEqual({ kind: 'shape', id: 'hook' });
    expect(shotShortcutForEvent({ code: 'Digit8' })).toEqual({ kind: 'shape', id: 'backspin' });
    expect(shotShortcutForEvent({ code: 'Digit9' })).toEqual({ kind: 'shape', id: 'punch' });
    expect(shotShortcutForEvent({ code: 'Digit1', ctrlKey: true })).toBeNull();
    expect(shotShortcutForEvent({ code: 'Digit1', shiftKey: true })).toBeNull();
    expect(shotShortcutForEvent({ code: 'Numpad6', shiftKey: true })).toBeNull();
    expect(shotShortcutForEvent({ code: 'KeyP' })).toBeNull();
  });

  it('fires pointer shots with the same clamped intent shown by the HUD', () => {
    expect(input).toContain('const intent = playerAimIntent(a, S.player.lie);');
    expect(input).toContain('playerFire(intent.dirX, intent.dirY, intent.power)');
    expect(input).toContain('if (S.player?.aim?.on) updatePlayHud();');
  });

  it('keeps global game shortcuts away from interactive controls', () => {
    const canvas = { closest: () => null } as unknown as EventTarget;
    const button = { closest: (selector: string) => selector.includes('button') ? button : null } as unknown as EventTarget;
    const inputControl = { closest: (selector: string) => selector.includes('input') ? inputControl : null } as unknown as EventTarget;
    const editable = { closest: () => null, isContentEditable: true } as unknown as EventTarget;
    const body = { closest: () => null } as unknown as EventTarget;
    const documentElement = { closest: () => null } as unknown as EventTarget;
    const dialogRoot = { closest: () => null } as unknown as EventTarget;

    expect(isInteractiveShortcutTarget(button)).toBe(true);
    expect(isInteractiveShortcutTarget(inputControl)).toBe(true);
    expect(isInteractiveShortcutTarget(editable)).toBe(true);
    expect(isCanvasShortcutTarget(button, canvas, button)).toBe(false);
    expect(isCanvasShortcutTarget(inputControl, canvas, inputControl)).toBe(false);
    expect(isCanvasShortcutTarget(canvas, canvas, canvas)).toBe(true);
    expect(isGameShortcutSurface(body, canvas, body, body, documentElement)).toBe(true);
    expect(isGameShortcutSurface(documentElement, canvas, documentElement, body, documentElement)).toBe(true);
    expect(isGameShortcutSurface(body, canvas, dialogRoot, body, documentElement)).toBe(false);
    expect(isGameShortcutSurface(dialogRoot, canvas, dialogRoot, body, documentElement)).toBe(false);
  });

  it('keeps keyboard aim immutable under pointer movement and stable across camera changes', () => {
    const keyboardAim = keyboardAimState(Math.PI / 3, 0.65);
    const before = { ...keyboardAim };
    expect(updatePointerAim(keyboardAim, 900, 700)).toBe(false);
    expect(keyboardAim).toEqual(before);

    const originalRot = S.rot;
    const originalCam = { ...S.cam };
    S.rot = 0;
    S.cam = { x: 0, y: 0, z: 0.5 };
    const first = playerAimIntent(keyboardAim, 'fair');
    S.rot = 3;
    S.cam = { x: 800, y: -300, z: 3.2 };
    const afterCameraMove = playerAimIntent(keyboardAim, 'fair');
    expect(afterCameraMove).toEqual(first);
    expect(first).toMatchObject({ power: 0.65 });

    const pointerAim = { on: true, sx: 1, sy: 2, cx: 3, cy: 4, kind: 'pointer' as const };
    expect(updatePointerAim(pointerAim, 20, 30)).toBe(true);
    expect(pointerAim).toMatchObject({ cx: 20, cy: 30 });
    S.rot = originalRot;
    S.cam = originalCam;
  });

  it('always releases temporary Space panning on keyup', () => {
    expect(spaceHeldAfterKeyUp(true, ' ')).toBe(false);
    expect(spaceHeldAfterKeyUp(true, 'Enter')).toBe(true);
  });

  it('fully resets keyboard aim memory when aim is cancelled or fired', () => {
    const memory = { angle: 1.2, power: 0.65, origin: '3:12.000:8.000' };
    resetKeyboardAimMemory(memory);
    expect(memory).toEqual({ angle: null, power: 0.65, origin: '' });
  });
});
