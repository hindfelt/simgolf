import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('original SimGolf shell contract', () => {
  const main = read('../main.tsx');
  const topBar = read('./TopBar.tsx');
  const toolbar = read('./Toolbar.tsx');
  const toolPreview = read('./ToolPreview.tsx');
  const minimap = read('./MiniMap.tsx');
  const playHud = read('./PlayHud.tsx');
  const modals = read('./Modals.tsx');
  const shell = read('../simgolf-shell.css');

  it('loads one authoritative shell layer after the component stylesheet', () => {
    expect(main.indexOf("import './styles.css'"))
      .toBeLessThan(main.indexOf("import './simgolf-shell.css'"));
    expect(shell).toContain('SimGolf 2002 shell');
    expect(shell).toContain('--sg-shell: #aaa7e9');
    expect(shell).toContain('--sg-rim: #2c368e');
    expect(shell).toContain('--sg-yellow: #f4df18');
  });

  it('publishes stable landmarks for every major piece of game chrome', () => {
    expect(topBar).toContain('data-ui="course-plaque"');
    expect(topBar).toContain('data-ui="status-shelves"');
    expect(topBar).toContain('data-ui="simulation-controls"');
    expect(toolbar).toContain('data-ui="construction-dock"');
    expect(minimap).toContain('data-ui="routing-monitor"');
    expect(playHud).toContain('data-ui="play-shell"');
  });

  it('uses the original corner-pod and scalloped-bottom-shell composition', () => {
    expect(topBar).toContain('className="courseCrest"');
    expect(topBar).toContain('className="simDate"');
    expect(topBar).toContain('className="fieldControlSkin"');
    expect(topBar).toContain('className="fieldControlSkinBody"');
    expect(topBar).toContain('C124 24 132 55 166 64');
    expect(shell).toMatch(/\.gauges \{[\s\S]*?flex-direction: column;/);
    expect(shell).toMatch(/--sg-control-width:\s*218px;/);
    expect(shell).toMatch(/--sg-fan-height:\s*160px;/);
    expect(shell).toMatch(/\.fieldControls \{[\s\S]*?bottom: 0;[\s\S]*?width: var\(--sg-control-width\)/);
    expect(shell).toMatch(/\.fieldControls \{[\s\S]*?height: 104px;[\s\S]*?background: transparent;/);
    expect(shell).toMatch(/\.fieldControlSkinBody \{[\s\S]*?fill: url\(#simGolfFanFill\);/);
    expect(shell).toMatch(/\.toolDock \{[\s\S]*?left: var\(--sg-control-width\);[\s\S]*?bottom: 0;/);
    expect(shell).toMatch(/\.toolDock::after \{[\s\S]*?display: none;/);
    expect(shell).toMatch(/\.toolGroups \{[\s\S]*?left: calc\(-1 \* var\(--sg-control-width\)\);[\s\S]*?top: -62px;/);
    expect(toolbar).toContain("data-group-id={item.id}");
    expect(toolbar).toContain('className="toolGroupLabel"');
    expect(shell).toMatch(/\.toolGroup\[data-group-id='course'\] \{[\s\S]*?width: 70px;[\s\S]*?height: 70px;/);
    expect(shell).toMatch(/\.toolGroup\[data-group-id='terrain'\] \{[\s\S]*?width: 40px;[\s\S]*?height: 40px;/);
    expect(shell).toMatch(/\.toolbar \{[\s\S]*?margin-left: 62px;/);
    expect(shell).toMatch(/\.playHud \{[\s\S]*?top: auto;[\s\S]*?bottom: 0;/);
    expect(shell).toMatch(/@media \(max-width: 760px\) \{[\s\S]*?\.toolDock::after \{ display: none; \}/);
  });

  it('renders circular yellow mode medallions and original trajectory ovals', () => {
    expect(shell).toMatch(/\.toolGroup \{[\s\S]*?border-radius: 50%;/);
    expect(shell).toMatch(/\.toolGroup\.active,[\s\S]*?\.toolGroup\.familyActive \{[\s\S]*?var\(--sg-yellow\)/);
    expect(toolbar).toContain("id: 'course', label: 'Course', icon: 'course'");
    expect(toolbar).toContain("id: 'terrain', label: 'Terrain', icon: 'terrain'");
    expect(playHud).toContain('className="flightGlyph"');
    expect(shell).toMatch(/\.playShotPalette \.shapeBtn \{[\s\S]*?border-radius: 54% 48% 50% 46%;/);
    expect(shell).toMatch(/\.playShotPalette \.shapeBtn\.on \{[\s\S]*?#20d365/);
  });

  it('uses dedicated pixel-canvas scenes instead of generic icon-stamped CSS diamonds', () => {
    expect(toolbar).toContain("import ToolPreview from './ToolPreview'");
    expect(toolbar).toContain('<ToolPreview tool={item.id} active={active} />');
    expect(toolbar).not.toContain('toolGraphicTop');
    expect(toolbar).not.toContain('toolGraphicIcon');
    expect(toolPreview).toContain('data-tool-preview={tool}');
    expect(toolPreview).toContain('window.devicePixelRatio || 1');
    expect(toolPreview).toContain('ctx.imageSmoothingEnabled = false');
    expect(shell).toMatch(/\.toolGraphic \{[\s\S]*?image-rendering: pixelated;/);
    expect(toolbar).toContain('data-group={group}');
    expect(shell).toMatch(/\.toolbar \{[\s\S]*?position: relative;[\s\S]*?left: auto;/);
    expect(shell).toContain(".toolDock[data-group='terrain'] .toolbar");
    expect(shell).not.toContain('.toolGraphicIcon');
  });

  it('keeps in-world dialogs inside the molded shell instead of a dimmed web-card layer', () => {
    expect(modals.match(/data-modal-kind=\{modal\.kind\}/g)).toHaveLength(2);
    expect(shell).toMatch(/\.overlay\[data-modal-kind\] \{[\s\S]*?background: rgba\(30, 32, 82, \.08\);/);
    expect(shell).toMatch(/\.modal\[data-modal-kind\] \{[\s\S]*?border: 4px solid var\(--sg-rim\);[\s\S]*?#e0defd/);
    expect(shell).toMatch(/\.modal\[data-modal-kind\] \.bigbtn \{[\s\S]*?border-radius: 7px 9px 6px 8px;/);
    expect(shell).toContain(".overlay[data-modal-kind='saves']");
    expect(shell).toMatch(/\.overlay\[data-modal-kind='saves'\] \{[\s\S]*?padding: clamp\(300px, 55vh, 338px\)/);
    expect(shell).toContain(".overlay[data-modal-kind='round']");
    expect(shell).toContain(".modal[data-modal-kind='newCourse']");
  });
});
