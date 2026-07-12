import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { facilityPreviewSource } from './facilityPreview';

describe('facilityPreviewSource', () => {
  it.each(['bench', 'flowerbed', 'landmark', 'ballwasher', 'scenicbridge'] as const)(
    'uses the authored prop sprite for %s',
    (kind) => expect(facilityPreviewSource(kind)).toEqual({ renderer: 'prop', key: kind }),
  );

  it('uses the world renderer initial lot sprite for building lots', () => {
    expect(facilityPreviewSource('buildinglot')).toEqual({ renderer: 'building', key: 'lot0' });
  });

  it('keeps full facilities on their authored building sprite', () => {
    expect(facilityPreviewSource('hotel')).toEqual({ renderer: 'building', key: 'hotel' });
  });
});

describe('field desk stacking', () => {
  it('keeps the compact controls above non-modal management panels', () => {
    const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
    expect(css).toMatch(/\.fieldControls\s*\{[^}]*z-index:\s*24;/s);
    expect(css).toMatch(/\.managementPanel\s*\{[^}]*z-index:\s*23;/s);
  });
});
