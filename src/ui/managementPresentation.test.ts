import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8');

describe('management presentation and accessibility', () => {
  const pro = read('./ProCircuitPanel.tsx');
  const reports = read('./ReportsPanel.tsx');
  const regulars = read('./RegularsPanel.tsx');
  const scorecards = read('./ScorecardsPanel.tsx');
  const account = read('./AccountPanel.tsx');
  const modals = read('./Modals.tsx');
  const portrait = read('./CharacterPortrait.tsx');
  const css = read('../styles.css');
  const shell = read('../simgolf-shell.css');

  it('uses dedicated SimFoto portraits for both championship golfer choices', () => {
    expect(pro.match(/className="proChoicePortrait"/g)).toHaveLength(2);
    expect(pro).toContain('name={pro.name} identity={pro.visualSeed} shirt={pro.shirt}');
    expect(pro).toContain('name="Gary Golf" identity="default-tour-pro" shirt="#3f7fd0"');
    expect(portrait).toContain('golferPortraitSprite');
    expect(portrait).not.toContain('golferSprite(');
    expect(css).toMatch(/\.characterPortrait\s*\{[^}]*border-radius: 50%;/s);
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
    expect(regulars).toContain('className="regularPracticeBar" role="progressbar"');
    expect(regulars).toContain('role="region" aria-label="Golfer practice campus"');
    expect(regulars).toContain('const campus = regularTrainingRates(S.buildings)');
    expect(css).toContain('.regularTrainingCampus');
    expect(css).toContain('.regularPracticeBar');
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

  it('shows persistent practice growth on the pro board and completed-round results', () => {
    expect(pro).toContain('const practice = pro.practice[skill.id]');
    expect(pro).toContain('className="practiceMeter" role="progressbar"');
    expect(pro).toContain('Finished rounds train the shots you use; practice facilities accelerate progress.');
    expect(modals).toContain('function PracticeProgress');
    expect(modals.match(/<PracticeProgress result=\{modal\.practice\} \/>/g)).toHaveLength(3);
    expect(css).toContain('.practiceProgressHead');
    expect(css).toContain('.practiceGainList');
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

  it('keeps the play console on one original-height molded strip at laptop widths', () => {
    expect(shell).toMatch(/\.playHud\s*\{[\s\S]*?left: var\(--sg-control-width\);[\s\S]*?height: var\(--sg-bottom\);/);
    expect(shell).toContain('--sg-control-width: 218px;');
    const laptopRules = shell.slice(shell.indexOf('@media (max-width: 1100px)'), shell.indexOf('@media (max-width: 760px)'));
    expect(laptopRules).not.toContain('--sg-control-width:');
    expect(laptopRules).toContain('.playHud { left: var(--sg-control-width); }');
    expect(shell).toMatch(/@media \(max-width: 760px\)[\s\S]*?\.fieldControls\.playControls\s*\{ display: none; \}/);
  });

  it('keeps trajectory tools and unavailable clubs legible on compact screens', () => {
    expect(shell).toMatch(/@media \(max-width: 520px\)[\s\S]*?\.playShotPalette \.shapeBtn\s*\{[^}]*width: 49px;/);
    expect(shell).toMatch(/\.playClubLine button:disabled\s*\{[^}]*text-decoration: line-through;[^}]*cursor: not-allowed;/s);
  });

  it('keeps mobile World and the embedded facility rail reachable in short viewports', () => {
    expect(css).toMatch(/@media \(max-width:760px\)[\s\S]*?\.worldMap\s*\{[^}]*max-height: 42dvh;[^}]*overflow-y: auto;/);
    expect(shell).toMatch(/\.controllerShell \.fieldDeskPanel\.catalogMode\s*\{[^}]*height: var\(--sg-bottom\);[^}]*overflow: hidden;/s);
    expect(shell).toMatch(/\.controllerShell \.catalogMode \.facilityCatalogGrid\s*\{[^}]*overflow-x: auto;[^}]*overflow-y: hidden;/s);
    expect(shell).toMatch(/@media \(max-height: 520px\)\s*\{[\s\S]*?--sg-controller-scale: \.72;/);
  });

  it('raises touch hit areas without inflating or overlapping visible fan controls', () => {
    expect(shell).toContain('@media (pointer: coarse)');
    expect(shell).toMatch(/\.controllerShell \.fieldControls > \.orb::after,[\s\S]*?inset: -7px;/s);
    expect(shell).toMatch(/@media \(pointer: coarse\) and \(max-height: 520px\)\s*\{[\s\S]*?--sg-controller-scale: \.82;/);
    expect(css).toMatch(/\.holeReorder button,[\s\S]*?\.retiredCourseRemove\s*\{[^}]*min-width: 32px;[^}]*min-height: 32px;/);
  });
});
