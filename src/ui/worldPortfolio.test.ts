import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('World Screen portfolio routes', () => {
  const source = readFileSync(new URL('./Modals.tsx', import.meta.url), 'utf8');

  it('does not treat the active sandbox copy as ownership of its career deed', () => {
    expect(source).toContain('currentPropertyId: initial || S.sandbox ? null : S.propertyId');
  });

  it('shows every career and sandbox record at the selected property and routes each visit by resort id', () => {
    expect(source).toContain('const propertyResorts = resortsForProperty(resorts, property.id)');
    expect(source).toContain('propertyResorts.map((resort) =>');
    expect(source).toContain('switchPortfolioResort(resort.id)');
    expect(source).toContain('`${resort.kind} resort · select to visit`');
    expect(source).toContain("`${sandboxCount} saved sandbox ${sandboxCount === 1 ? 'copy' : 'copies'}.`");
    expect(source).toContain('${cardStatus}. ${sandboxStatus}');
  });

  it('warns truthfully before replacing a course when IndexedDB portfolios are unavailable', () => {
    expect(source).toContain('This browser cannot keep a switchable resort portfolio. Continuing will replace');
    expect(source).toContain('save it to a named slot or export it first');
  });
});
