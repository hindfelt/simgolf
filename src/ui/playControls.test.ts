import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isCanvasShortcutTarget, isGameShortcutSurface, isInteractiveShortcutTarget, keyboardAimState, resetKeyboardAimMemory, spaceHeldAfterKeyUp, updatePointerAim } from '../game/input';
import { playerAimIntent } from '../game/engine';
import { S } from '../game/state';

describe('play controls accessibility and shot-shape presentation', () => {
  const hud = readFileSync(new URL('./PlayHud.tsx', import.meta.url), 'utf8');
  const input = readFileSync(new URL('../game/input.ts', import.meta.url), 'utf8');
  const render = readFileSync(new URL('../game/render.ts', import.meta.url), 'utf8');
  const engineSource = readFileSync(new URL('../game/engine.ts', import.meta.url), 'utf8');
  const store = readFileSync(new URL('./store.ts', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

  it('exposes an explicit Hook alongside Draw and Fade', () => {
    expect(hud).toContain("['straight', 'fade', 'draw', 'hook', 'backspin', 'punch']");
    expect(hud).toContain("hook: { mark: '⤺', note: 'hard left' }");
  });

  it('announces selected clubs and shot shapes to assistive technology', () => {
    expect(hud).toContain('aria-pressed={playHud.club === id}');
    expect(hud).toContain('aria-pressed={playHud.shape === id}');
    expect(hud).toContain('miles per hour toward ${windPoint}');
  });

  it('presents club strategy, lie restrictions, and shot forecasts as grouped controls', () => {
    expect(hud).toContain('role="region" aria-label="Player round controls"');
    expect(hud).toContain('role="group" aria-label="Shot setup"');
    expect(hud).toContain('role="group" aria-label={`Club selection from ${lieLabel(playHud.lie)}`}');
    expect(hud).toContain('role="group" aria-label="Shot technique selection"');
    expect(hud).toContain('disabled={!option.available}');
    expect(hud).toContain("option.reason ?? 'Unavailable from this lie'");
    expect(hud).toContain(": option.reason ?? 'Unavailable from this lie'}</small>");
    expect(hud).toContain('playHud.selectedRole');
    expect(hud).toContain("'Carry → est. finish'");
    expect(hud).toContain('yards(playHud.finishDistance)');
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
