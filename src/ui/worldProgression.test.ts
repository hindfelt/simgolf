import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('World Screen career progression presentation', () => {
  const source = readFileSync(new URL('./Modals.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

  it('uses the shared engine availability model for selection, cards, inspection, and purchase', () => {
    expect(source).toContain('propertyAvailability(candidate');
    expect(source).toContain('candidateAvailability.missing');
    expect(source).toContain('disabled={travelling || !availability.canPurchase}');
    expect(source).toContain('availability.requirements.map');
  });

  it('exposes money, best rating, fame, and deed count as a portfolio strip', () => {
    expect(source).toContain('className="worldCareerStrip"');
    expect(source).toContain('Best rating');
    expect(source).toContain('Pro fame');
    expect(source).toContain('S.propertiesPurchased.length');
  });

  it('keeps locked deeds inspectable and lists each missing requirement accessibly', () => {
    expect(source).toContain('onClick={() => setPropertyId(candidate.id)}');
    expect(source).toContain('aria-label={`${property.name} deed requirements`}');
    expect(source).toContain("requirement.met ? '✓' : '○'");
    expect(css).toMatch(/\.propertyUnlocks\s+li\.missing/);
    expect(css).toMatch(/\.worldProperty\.prestigeLocked/);
  });

  it('shows developed resorts as visitable portfolio deeds instead of destructive replacements', () => {
    expect(source).toContain('portfolioResorts()');
    expect(source).toContain('switchPortfolioResort(ownedResort.id)');
    expect(source).toContain('className="bigbtn portfolioVisit"');
    expect(source).not.toContain('permanently leave');
    expect(css).toMatch(/\.portfolioDeed/);
  });

  it('collapses career stats and requirement lists cleanly on phone layouts', () => {
    expect(css).toMatch(/@media \(max-width: 430px\)[\s\S]*\.worldCareerStrip\s*\{[^}]*grid-template-columns:\s*repeat\(4,/);
    expect(css).toMatch(/@media \(max-width: 430px\)[\s\S]*\.propertyUnlocks ul\s*\{[^}]*grid-template-columns:\s*1fr/);
  });
});
