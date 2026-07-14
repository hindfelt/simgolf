import { afterEach, describe, expect, it } from 'vitest';
import { ui } from './store';

const SURFACES = ['clubhouseMenu', 'buildPanel', 'staffPanel', 'reportsPanel', 'regularsPanel', 'scorecardsPanel', 'onlinePanel', 'proPanel'] as const;
const snapshot = () => Object.fromEntries(SURFACES.map((key) => [key, ui.get()[key]]));
const original = snapshot();

afterEach(() => ui.set({ ...Object.fromEntries(SURFACES.map((key) => [key, false])), ...original }));

describe('controller shell surface ownership', () => {
  it('allows only one Clubhouse or management surface to be open', () => {
    for (const surface of SURFACES) {
      ui.set({ [surface]: true });
      expect(SURFACES.filter((key) => ui.get()[key])).toEqual([surface]);
    }
  });

  it('atomically replaces Clubhouse with the facility tray', () => {
    ui.set({ clubhouseMenu: true });
    expect(ui.get().clubhouseMenu).toBe(true);

    ui.set({ buildPanel: true });

    expect(ui.get().clubhouseMenu).toBe(false);
    expect(ui.get().buildPanel).toBe(true);
  });
});
