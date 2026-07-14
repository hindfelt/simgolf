import type { ClubId, ShotShape } from './types';

export type ShotShortcut =
  | { kind: 'club'; id: ClubId }
  | { kind: 'shape'; id: ShotShape };

const SHOT_SHORTCUTS: Record<string, ShotShortcut> = {
  Digit1: { kind: 'club', id: 'driver' },
  Digit2: { kind: 'club', id: 'threeWood' },
  Digit3: { kind: 'club', id: 'fiveWood' },
  Digit4: { kind: 'club', id: 'lobWedge' },
  Digit5: { kind: 'shape', id: 'fade' },
  Digit6: { kind: 'shape', id: 'draw' },
  Digit7: { kind: 'shape', id: 'straight' },
  Digit8: { kind: 'shape', id: 'backspin' },
  Digit9: { kind: 'shape', id: 'punch' },
};

export interface ShotShortcutEvent {
  code: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
}

/** Number-row and numpad shot shortcuts; modified keys remain available to the browser and OS. */
export function shotShortcutForEvent(event: ShotShortcutEvent): ShotShortcut | null {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return null;
  const code = event.code.startsWith('Numpad') ? `Digit${event.code.slice(6)}` : event.code;
  return SHOT_SHORTCUTS[code] ?? null;
}
