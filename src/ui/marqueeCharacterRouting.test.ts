import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SPECIAL_GUESTS, specialGuestPortrait } from '../game/specialGuests';
import type { TickerCharacter } from './store';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('marquee character UI routing', () => {
  const portraitSource = read('./CharacterPortrait.tsx');
  const tickerSource = read('./Ticker.tsx');
  const inspectorSource = read('./GolferInspector.tsx');
  const modalSource = read('./Modals.tsx');
  const css = read('../styles.css');
  const shell = read('../simgolf-shell.css');

  it.each(['picky', 'ivana'] as const)('keeps the complete %s profile assignable to ticker SimFoto art', (kind) => {
    const portrait = specialGuestPortrait(kind);
    const tickerCharacter: TickerCharacter = portrait;
    expect(tickerCharacter).toMatchObject({
      identity: SPECIAL_GUESTS[kind].visual.identity,
      appearance: SPECIAL_GUESTS[kind].visual.appearance,
      signature: SPECIAL_GUESTS[kind].visual.signature,
      shirt: SPECIAL_GUESTS[kind].visual.shirt,
      skin: SPECIAL_GUESTS[kind].visual.skin,
      cap: SPECIAL_GUESTS[kind].visual.cap,
    });
  });

  it('forwards authored appearance and signature cues through the portrait renderer', () => {
    expect(portraitSource).toContain('interface CharacterPortraitProps extends CharacterVisualOverrides');
    expect(portraitSource).toContain('golferPortraitSprite(identity, shirt, skin, cap, expression, {');
    for (const field of ['appearance,', 'signature,', 'hairTone,', 'hairHighlight,', 'trim,', 'pants,', 'accent,', 'bag,']) {
      expect(portraitSource).toContain(field);
    }
    expect(portraitSource).toContain('data-character-id={identity}');
    expect(portraitSource).toContain('data-character-signature={signature}');
  });

  it('passes the complete ticker profile and resolves special inspectors from the registry', () => {
    expect(tickerSource).toContain('{...simFoto.character}');
    expect(tickerSource).toContain('guest.visual.identity === simFoto.character?.identity');
    expect(tickerSource).toContain('{specialGuest.title}');
    expect(tickerSource).toContain('data-special-guest={specialGuest?.kind}');
    expect(inspectorSource).toContain('SPECIAL_GUESTS[golfer.specialGuest]');
    expect(inspectorSource).toContain('specialGuestPortrait(golfer.specialGuest, model.expression)');
    expect(inspectorSource).toContain('data-special-guest={golfer.specialGuest}');
    expect(inspectorSource).toContain('specialGuest?.title');
  });

  it('keeps portrait cards out of manual-play aiming space in both React and CSS', () => {
    expect(tickerSource).toContain("if (mode === 'play') return null");
    expect(inspectorSource).toContain("useFloatingPanelFocus(!!golfer && mode !== 'play'");
    expect(inspectorSource).toContain("if (!golfer || mode === 'play') return null");
    expect(shell).toMatch(/body:has\(\.controllerShell\[data-mode='play'\]\) \.simFotoTicker\s*\{\s*display: none !important;/);
  });

  it('drives both guest dialogs from one shared heading without legacy palette forks', () => {
    expect(modalSource).toContain('function SpecialGuestHeading');
    expect(modalSource).toContain('SPECIAL_GUESTS[kind]');
    expect(modalSource).toContain('specialGuestPortrait(kind, expression)');
    expect(modalSource).toContain('<SpecialGuestHeading kind="picky"');
    expect(modalSource).toContain('<SpecialGuestHeading kind="ivana"');
    expect(modalSource).not.toMatch(/#71845d|#d9aa7c|#d0ad58|#bd6f9f|#e0a878|#f2d688/);
    expect(css).not.toContain('.ivanaHeading');
    expect(css).toContain('.characterPortrait[data-character-signature]');
    expect(shell).toContain('.guestPortrait[data-character-signature]');
  });
});
