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

  it('announces course quality and touring-pro stats as numeric meters', () => {
    expect(reports).toContain('className="beautyMeter" role="meter"');
    expect(reports).toContain('className="interestMeter" role="meter"');
    expect(reports).toContain('aria-valuenow={Math.round(h.beauty * 100)}');
    expect(reports).toContain('aria-valuenow={Math.round(h.interest * 100)}');
    expect(pro).toContain('data-label="Length" role="meter"');
    expect(pro).toContain('data-label="Accuracy" role="meter"');
    expect(pro).toContain('data-label="Imagination" role="meter"');
    expect(pro).toContain('aria-valuenow={Math.round(S.proChallengeOffer.opponent.length * 100)}');
  });

  it('exposes selected scorecard rounds and holes to assistive technology', () => {
    expect(scorecards).toContain('aria-pressed={selected?.id === record.id}');
    expect(scorecards).toContain('aria-label={`Hole ${hole.hole}`}');
    expect(scorecards).toContain('aria-pressed={chosenHole?.hole === hole.hole}');
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

  it('wraps the play workbench before its controls overflow common laptop widths', () => {
    expect(css).toMatch(/@media \(max-width: 1300px\)\s*\{[\s\S]*?\.playHud\s*\{[^}]*max-width: none;[^}]*flex-wrap: wrap;/);
    expect(css).toMatch(/@media \(max-width: 1300px\)[\s\S]*?\.shotWorkbench\s*\{[^}]*flex:\s*1 0 100%;[^}]*overflow-x: auto;/);
  });

  it('keeps expanded forecasts and unavailable clubs legible on compact screens', () => {
    expect(css).toMatch(/@media \(max-width: 470px\)[\s\S]*?\.shotTelemetry\s*\{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
    expect(css).toMatch(/\.playHud \.clubBtn:disabled\s*\{[^}]*cursor: not-allowed;[^}]*opacity: \.72;/s);
  });

  it('keeps mobile World and Field Desk content reachable in short viewports', () => {
    expect(css).toMatch(/@media \(max-width:760px\)[\s\S]*?\.worldMap\s*\{[^}]*max-height: 42dvh;[^}]*overflow-y: auto;/);
    expect(css).toContain('max-height: min(238px, calc(100dvh - 164px));');
    expect(css).toMatch(/\.fieldDeskPanel\.catalogMode\s*\{[^}]*overflow-y: auto;/s);
    expect(css).toMatch(/\.catalogMode \.facilityCatalogGrid\s*\{[^}]*overflow-x: auto;/s);
  });

  it('raises touch targets without changing desktop control density', () => {
    expect(css).toContain('@media (pointer: coarse)');
    expect(css).toMatch(/\.fieldControls \.orb,[\s\S]*?\.reportTabs button\s*\{[^}]*min-width: 40px;[^}]*min-height: 40px;/);
    expect(css).toMatch(/\.holeReorder button,[\s\S]*?\.retiredCourseRemove\s*\{[^}]*min-width: 32px;[^}]*min-height: 32px;/);
    expect(css).toMatch(/@media \(max-width: 700px\) and \(pointer: coarse\)[\s\S]*?\.fieldControls\s*\{\s*bottom: 124px;/);
  });
});
