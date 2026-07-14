import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('World Screen portfolio routes', () => {
  const source = readFileSync(new URL('./WorldScreen.tsx', import.meta.url), 'utf8');

  it('does not treat the active sandbox copy as ownership of its career deed', () => {
    expect(source).toContain('currentPropertyId: initial || S.sandbox ? null : S.propertyId');
  });

  it('shows every career and sandbox record at the selected property and routes each visit by resort id', () => {
    expect(source).toContain('const propertyResorts = resortsForProperty(resorts, property.id)');
    expect(source).toContain('propertyResorts.map((resort) =>');
    expect(source).toContain('switchPortfolioResort(resort.id)');
    expect(source).toContain('${resort.kind} resort ${resort.summary.courseName},');
    expect(source).toContain("className={'portfolioDeed' + (resort.active ? ' active' : '')}");
    expect(source).toContain("resort.active ? 'Here now' : `Visit");
  });

  it('warns truthfully before replacing a course when IndexedDB portfolios are unavailable', () => {
    expect(source).toContain('This browser cannot keep a switchable resort portfolio. Continuing will replace');
    expect(source).toContain('save it to a named slot or export it first');
  });
});
