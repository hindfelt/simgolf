import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('play controls accessibility and shot-shape presentation', () => {
  const hud = readFileSync(new URL('./PlayHud.tsx', import.meta.url), 'utf8');
  const input = readFileSync(new URL('../game/input.ts', import.meta.url), 'utf8');

  it('exposes an explicit Hook alongside Draw and Fade', () => {
    expect(hud).toContain("['straight', 'fade', 'draw', 'hook', 'backspin', 'punch']");
    expect(hud).toContain("hook: { mark: '⤺', note: 'hard left' }");
  });

  it('announces selected clubs and shot shapes to assistive technology', () => {
    expect(hud).toContain('aria-pressed={playHud.club === id}');
    expect(hud).toContain('aria-pressed={playHud.shape === id}');
    expect(hud).toContain('miles per hour toward ${windPoint}');
  });

  it('supports keyboard aim, power adjustment, and firing on the canvas', () => {
    expect(input).toContain("e.key === 'ArrowLeft' || e.key === 'ArrowRight'");
    expect(input).toContain("e.key === 'ArrowUp' || e.key === 'ArrowDown'");
    expect(input).toContain("e.key === 'Enter'");
    expect(input).toContain('playerFire(Math.cos(angle), Math.sin(angle), keyboardPower)');
  });
});
