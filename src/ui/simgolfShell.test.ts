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
    expect(shell).toMatch(/\.fieldControls \{[\s\S]*?bottom: 0;[\s\S]*?width: var\(--sg-control-width\)/);
    expect(shell).toMatch(/\.toolDock \{[\s\S]*?left: var\(--sg-control-width\);[\s\S]*?bottom: 0;/);
    expect(shell).toMatch(/\.playHud \{[\s\S]*?top: auto;[\s\S]*?bottom: 0;/);
  });

  it('renders circular yellow mode medallions and teal-to-lime shot controls', () => {
    expect(shell).toMatch(/\.toolGroup \{[\s\S]*?border-radius: 50%;/);
    expect(shell).toMatch(/\.toolGroup\.active \{[\s\S]*?var\(--sg-yellow\)/);
    expect(shell).toMatch(/\.playHud \.clubBtn,[\s\S]*?var\(--sg-teal\)/);
    expect(shell).toMatch(/\.playHud \.clubBtn\.on,[\s\S]*?var\(--sg-lime\)/);
  });

  it('uses dedicated isometric tool art instead of legacy fixed-position CSS diamonds', () => {
    expect(toolbar).toContain('className={\'toolGraphic art-\'');
    expect(toolbar).toContain('className="toolGraphicTop"');
    expect(toolbar).toContain('data-group={group}');
    expect(shell).toMatch(/\.toolbar \{[\s\S]*?position: relative;[\s\S]*?left: auto;/);
    expect(shell).toContain(".toolDock[data-group='terrain'] .toolbar");
  });
});
