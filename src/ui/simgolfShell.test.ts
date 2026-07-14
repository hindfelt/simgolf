import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('original SimGolf shell contract', () => {
  const main = read('../main.tsx');
  const app = read('../App.tsx');
  const controller = read('./ControllerShell.tsx');
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

  it('uses one coordinated original corner-pod and bottom-shell composition', () => {
    expect(app).toContain('<ControllerShell />');
    expect(controller).toContain('<FieldControls />');
    expect(controller).toContain('<Toolbar />');
    expect(controller).toContain('<BuildPanel />');
    expect(controller).toContain('<PlayHud />');
    expect(controller).toContain('data-ui="bottom-controller-shell"');
    expect(controller).toContain('data-mode={mode}');
    expect(controller).toContain("data-surface={mode === 'play' ? 'play'");
    expect(topBar).toContain('className="courseCrest"');
    expect(topBar).toContain('className="simDate"');
    expect(topBar).toContain('className="fieldControlSkin"');
    expect(topBar).toContain('className="fieldControlSkinBody"');
    expect(topBar).toContain('viewBox="0 0 280 166"');
    expect(topBar).toContain("className={'fieldMenuCommand'");
    expect(topBar).not.toContain('<details');
    expect(shell).toMatch(/\.gauges \{[\s\S]*?flex-direction: column;/);
    expect(shell).toMatch(/--sg-control-width:\s*218px;/);
    expect(shell).toMatch(/--sg-fan-height:\s*166px;/);
    expect(shell).toMatch(/\.controllerShell \{[\s\S]*?position: fixed;[\s\S]*?height: var\(--sg-fan-height\);/);
    expect(shell).toMatch(/\.controllerShell \.fieldControls \{[\s\S]*?width: var\(--sg-fan-width\);[\s\S]*?height: var\(--sg-fan-height\);/);
    expect(shell).toMatch(/\.fieldControlSkinBody \{[\s\S]*?fill: url\(#simGolfFanFill\);/);
    expect(shell).toMatch(/\.controllerShell \.toolDock \{[\s\S]*?left: var\(--sg-control-width\);[\s\S]*?bottom: 0;/);
    expect(shell).toMatch(/\.toolDock::after \{[\s\S]*?display: none;/);
    expect(shell).toMatch(/\.controllerShell \.toolGroups \{[\s\S]*?left: calc\(-1 \* var\(--sg-control-width\)\);[\s\S]*?top: -58px;/);
    expect(toolbar).toContain("data-group-id={item.id}");
    expect(toolbar).toContain('className="toolGroupLabel"');
    expect(shell).toMatch(/\.controllerShell \.toolGroup\[data-group-id='course'\] \{[^}]*width: 74px;[^}]*height: 74px;/);
    expect(shell).toMatch(/\.controllerShell \.toolGroup\[data-group-id='people'\] \{[^}]*display: grid;|\.controllerShell \.toolGroup,[\s\S]*?display: grid;/);
    expect(shell).toMatch(/\.controllerShell \.toolTray \{[\s\S]*?position: absolute;[\s\S]*?left: 28px;/);
    expect(shell).toMatch(/@media \(max-height: 520px\) \{[\s\S]*?--sg-controller-scale: 1;/);
    expect(shell).toMatch(/\.playHud \{[\s\S]*?top: auto;[\s\S]*?bottom: 0;/);
    expect(shell).toMatch(/\.controllerShell \.playHud \{\s*position: absolute;/);
  });

  it('renders circular yellow mode medallions and original trajectory ovals', () => {
    expect(shell).toMatch(/\.toolGroup \{[\s\S]*?border-radius: 50%;/);
    expect(shell).toMatch(/\.toolGroup\.active,[\s\S]*?\.toolGroup\.familyActive \{[\s\S]*?var\(--sg-yellow\)/);
    expect(toolbar).toContain("id: 'course', label: 'Course', icon: 'course'");
    expect(toolbar).toContain("id: 'terrain', label: 'Terrain', icon: 'terrain'");
    expect(playHud).toContain('className="flightGlyph"');
    expect(toolbar).toContain('data-ui="play-mode-medallions"');
    expect(toolbar).toContain("item.id === 'course' || item.id === 'resort' || item.id === 'play'");
    expect(toolbar).toContain("item.id === 'play' ? ' active' : ''");
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
    expect(shell).toMatch(/\.controllerShell \.toolbar,[\s\S]*?display: grid;[\s\S]*?grid-template-columns: repeat\(8, 64px\);/);
    expect(shell).toMatch(/\.controllerShell \.toolDock\[data-group='terrain'\] \.tool,[\s\S]*?width: 64px;[\s\S]*?height: 52px;/);
    expect(shell).toMatch(/\.controllerShell \.tool \.nm,[\s\S]*?font-size: 8px;/);
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
