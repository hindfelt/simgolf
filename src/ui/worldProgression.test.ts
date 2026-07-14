import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('World Screen career progression presentation', () => {
  const source = readFileSync(new URL('./WorldScreen.tsx', import.meta.url), 'utf8');
  const modals = readFileSync(new URL('./Modals.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  const shell = readFileSync(new URL('../simgolf-shell.css', import.meta.url), 'utf8');
  const engine = readFileSync(new URL('../game/engine.ts', import.meta.url), 'utf8');
  const releaseToast = readFileSync(new URL('./DestinationReleaseToast.tsx', import.meta.url), 'utf8');

  it('uses the shared engine availability model for selection, cards, inspection, and purchase', () => {
    expect(source).toContain('propertyAvailability(candidate');
    expect(source).toContain('availabilityFor(candidate)');
    expect(source).toContain('disabled={travelling || !availability.canPurchase}');
    expect(source).toContain('availability.requirements.map');
  });

  it('exposes spendable bank, sticky career revenue, rating, fame, and deed count', () => {
    expect(source).toContain('className="worldProgressRibbon"');
    expect(source).toContain("'Available bank'");
    expect(source).toContain('careerProgress.lifetimeOperatingEarnings ?? 0');
    expect(source).toContain('<small>Rating</small>');
    expect(source).toContain('<small>Fame</small>');
    expect(source).toContain('S.propertiesPurchased.length');
  });

  it('keeps locked deeds inspectable and lists each missing requirement accessibly', () => {
    expect(source).toContain('onSelect={() => setPropertyId(candidate.id)}');
    expect(source).toContain('aria-label={`${property.name} deed requirements`}');
    expect(source).toContain("requirement.met ? '✓' : '○'");
    expect(css).toMatch(/\.propertyUnlocks\s+li\.missing/);
    expect(css).toMatch(/\.worldDeed\.locked/);
    expect(css).toMatch(/\.worldDeed\.released/);
    expect(source).toContain("if (!availability.released) return 'locked'");
    expect(source).toContain("availability.affordable ? 'affordable' : 'released'");
    expect(source).toContain("availability.cashShortfall");
  });

  it('shows developed resorts as visitable portfolio deeds instead of destructive replacements', () => {
    expect(source).toContain('portfolioResorts()');
    expect(source).toContain('switchPortfolioResort(resort.id)');
    expect(source).toContain('propertyResorts.map((resort) =>');
    expect(source).toContain("className={'portfolioDeed'");
    expect(source).not.toContain('permanently leave');
    expect(css).toMatch(/\.portfolioDeed/);
  });

  it('uses the fixed original-screen composition with every deed, pin, connection, and legend in one stage', () => {
    expect(source).toContain('const WORLD_LAYOUT: Record<PropertyId, WorldLayout>');
    expect(source.match(/\{ deedX:/g)).toHaveLength(16);
    expect(source).toContain('className="worldGlobeArt"');
    expect(source).toContain('className="worldConnections"');
    expect(source).toContain('className="worldPinLegend"');
    expect(source).toContain('WORLD_PROPERTIES.map((candidate) =>');
    expect(css).toMatch(/\.worldStage\s*\{[^}]*width:\s*760px;[^}]*height:\s*390px;/s);
    expect(shell).toMatch(/\.modal\[data-modal-kind='newCourse'\]\s*\{[^}]*max-width:\s*800px;[^}]*max-height:\s*600px;/s);
  });

  it('announces newly earned deeds from every milestone path and links directly to the World Screen', () => {
    expect(engine).toContain('checkDestinationReleases(roundPropertyAccessAtStart, true)');
    expect(engine).toContain('checkDestinationReleases();');
    expect(engine).toContain("S.mode === 'play'");
    expect(engine).toContain('releasedProperties');
    expect(engine).toContain("ticker('World Screen'");
    expect(modals).toContain('className="destinationUnlock"');
    expect(modals).toContain("setStore({ modal: { kind: 'newCourse' } })");
    expect(releaseToast).toContain('className="destinationReleaseToast"');
    expect(releaseToast).toContain("modal: { kind: 'newCourse' }");
    expect(shell).toMatch(/\.destinationUnlock\s*\{/);
    expect(shell).toMatch(/\.destinationUnlock button\s*\{/);
    expect(shell).toMatch(/\.destinationReleaseToast\s*\{/);
  });

  it('preserves the original logical width on narrow screens with explicit scrolling instead of unreadable shrinking', () => {
    expect(css).toMatch(/@media \(max-width: 790px\)[\s\S]*\.worldOffice\s*\{[^}]*width:\s*760px;/);
    expect(css).toMatch(/@media \(max-width: 790px\)[\s\S]*\.modal\[data-modal-kind='newCourse'\]\s*\{[^}]*overflow:\s*auto;/);
  });
});
