import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8');

describe('management presentation and accessibility', () => {
  const pro = read('./ProCircuitPanel.tsx');
  const reports = read('./ReportsPanel.tsx');
  const regulars = read('./RegularsPanel.tsx');
  const scorecards = read('./ScorecardsPanel.tsx');
  const account = read('./AccountPanel.tsx');
  const css = read('../styles.css');

  it('uses named pixel portraits for both championship golfer choices', () => {
    expect(pro.match(/className="proChoicePortrait"/g)).toHaveLength(2);
    expect(pro).toContain('name={pro.name} shirt={pro.shirt} skin={pro.skin} cap={pro.cap}');
    expect(pro).toContain('name="Gary Golf" shirt="#3f7fd0" skin="#f1c6a0" cap="#efefef"');
  });

  it('exposes selected state for report and championship choices', () => {
    expect(reports).toContain('role="tablist"');
    expect(reports).toContain("aria-selected={tab === 'course'}");
    expect(pro).toContain('aria-pressed={difficulty === item.id}');
    expect(pro).toContain('aria-pressed={useResident}');
    expect(pro).toContain('aria-pressed={selectedCourseId === course.id}');
  });

  it('keeps retired-course removal as a separate keyboard-operable button', () => {
    expect(pro).toContain('<button className="retiredCourseRemove"');
    expect(pro).toContain('aria-label={`Remove ${course.name} from Championship Mode`}');
    expect(pro).not.toContain('<em title="Remove course"');
  });

  it('announces regular skills as numeric meters', () => {
    expect(regulars).toContain('className="regularStatBar" role="meter"');
    expect(regulars).toContain('aria-valuenow={Math.round(r[key] * 100)}');
  });

  it('gives every major management tray the shared focus and Escape lifecycle', () => {
    for (const panel of [pro, reports, regulars, scorecards, account]) {
      expect(panel).toContain('useFloatingPanelFocus(open, panelRef, close)');
      expect(panel).toContain('ref={panelRef}');
      expect(panel).toContain('tabIndex={-1}');
    }
  });

  it('raises compact control sizes and collapses dense pro layouts before they overflow', () => {
    expect(css).toMatch(/\.skillStepper button\s*\{[^}]*width:28px;[^}]*height:28px;/s);
    expect(css).toMatch(/\.playHud \.clubBtn,.playHud \.shapeBtn\s*\{[^}]*min-height:\s*34px;/s);
    expect(css).toMatch(/@media \(max-width:980px\)\s*\{[^}]*\.proSkillGrid\s*\{\s*grid-template-columns:1fr;/s);
  });
});
