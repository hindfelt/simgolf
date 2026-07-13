import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('original SimGolf shell contract', () => {
  const main = read('../main.tsx');
  const topBar = read('./TopBar.tsx');
  const toolbar = read('./Toolbar.tsx');
  const minimap = read('./MiniMap.tsx');
  const playHud = read('./PlayHud.tsx');
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

  it('uses the original corner-pod and molded-bottom-shell composition', () => {
    expect(topBar).toContain('className="courseCrest"');
    expect(topBar).toContain('className="simDate"');
    expect(shell).toMatch(/\.gauges \{[\s\S]*?flex-direction: column;/);
    expect(shell).toMatch(/--sg-control-width:\s*190px;/);
    expect(shell).toMatch(/--sg-fan-height:\s*160px;/);
    expect(shell).toMatch(/\.fieldControls \{[\s\S]*?bottom: 0;[\s\S]*?width: var\(--sg-control-width\)/);
    expect(shell).toMatch(/\.fieldControls \{[\s\S]*?height: var\(--sg-fan-height\);[\s\S]*?border-radius: 0 76px 28px 0;/);
    expect(shell).toMatch(/\.toolDock \{[\s\S]*?left: var\(--sg-control-width\);[\s\S]*?bottom: 0;/);
    expect(shell).toMatch(/\.toolDock::after \{[\s\S]*?height: var\(--sg-fan-height\);[\s\S]*?clip-path: polygon\(/);
    expect(shell).toMatch(/\.toolGroups \{[\s\S]*?top: -43px;[\s\S]*?grid-template-columns: repeat\(2, 56px\);/);
    expect(shell).toMatch(/\.toolGroup \{[\s\S]*?width: 56px;[\s\S]*?height: 56px;/);
    expect(shell).toMatch(/\.playHud \{[\s\S]*?top: auto;[\s\S]*?bottom: 0;/);
    expect(shell).toMatch(/@media \(max-width: 760px\) \{[\s\S]*?\.toolDock::after \{ display: none; \}/);
  });

  it('renders circular yellow mode medallions and original trajectory ovals', () => {
    expect(shell).toMatch(/\.toolGroup \{[\s\S]*?border-radius: 50%;/);
    expect(shell).toMatch(/\.toolGroup\.active \{[\s\S]*?var\(--sg-yellow\)/);
    expect(playHud).toContain('className="flightGlyph"');
    expect(shell).toMatch(/\.playShotPalette \.shapeBtn \{[\s\S]*?border-radius: 54% 48% 50% 46%;/);
    expect(shell).toMatch(/\.playShotPalette \.shapeBtn\.on \{[\s\S]*?#20d365/);
  });

  it('uses dedicated isometric tool art instead of legacy fixed-position CSS diamonds', () => {
    expect(toolbar).toContain('className={\'toolGraphic art-\'');
    expect(toolbar).toContain('className="toolGraphicTop"');
    expect(toolbar).toContain('data-group={group}');
    expect(shell).toMatch(/\.toolbar \{[\s\S]*?position: relative;[\s\S]*?left: auto;/);
    expect(shell).toContain(".toolDock[data-group='terrain'] .toolbar");
  });
});
