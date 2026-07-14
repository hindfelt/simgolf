import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('rebuilt original controller presentation', () => {
  const app = read('../App.tsx');
  const controller = read('./ControllerShell.tsx');
  const topBar = read('./TopBar.tsx');
  const toolbar = read('./Toolbar.tsx');
  const shell = read('../simgolf-shell.css');

  it('mounts the fan, tool rail, and facility palette in one stacking context', () => {
    expect(app).toContain('<ControllerShell />');
    expect(controller).toContain('<FieldControls />');
    expect(controller).toContain('<Toolbar />');
    expect(controller).toContain('<BuildPanel />');
    expect(shell).toContain('original controller shell v2');
    expect(shell).toMatch(/\.controllerShell\s*\{[^}]*z-index: 27;/s);
    expect(shell).toMatch(/\.controllerShell \.fieldDeskPanel\.catalogMode\s*\{[^}]*bottom: 0;[^}]*height: var\(--sg-bottom\);/s);
  });

  it('uses the original vertical Clubhouse command list instead of an oversized orb grid', () => {
    expect(topBar).toContain('role="menu" aria-label="Clubhouse commands"');
    expect(topBar).toContain("className={'fieldMenuCommand'");
    expect(topBar).toContain('className="menuBullet"');
    expect(topBar).not.toContain('<details');
    expect(topBar).not.toContain('fieldMenuGrid');
    expect(shell).toMatch(/\.fieldMenuCommand\s*\{[^}]*grid-template-columns: 13px 18px minmax\(0, 1fr\);[^}]*font-size: 10px;/s);
  });

  it('keeps Course and Terrain tools in readable single-row horizontal rails', () => {
    expect(toolbar).toContain("tools: ['pan', 'hole', 'green', 'fair', 'firmfair', 'deeprough'");
    expect(toolbar).toContain("tools: ['raise', 'lower', 'dozer', 'land']");
    expect(toolbar).not.toContain('dockPrompt');
    expect(shell).toMatch(/\.controllerShell \.toolDock\[data-group='terrain'\] \.toolbar\s*\{[^}]*display: flex;/s);
    expect(shell).toMatch(/\.controllerShell \.toolDock\[data-group='terrain'\] \.tool,[\s\S]*?flex: 0 0 82px;/);
    expect(shell).toMatch(/\.controllerShell \.tool \.nm,[\s\S]*?font-size: 9\.5px;/);
    expect(shell).toMatch(/\.controllerShell \.tool \.ct,[\s\S]*?font-size: 7px;/);
  });

  it('keeps every mode visible and scales the whole shell in short zoomed viewports', () => {
    expect(shell.lastIndexOf(".controllerShell .toolGroup[data-group-id]"))
      .toBeGreaterThan(shell.lastIndexOf(".toolGroup[data-group-id='people'] { display: none; }"));
    expect(shell).toMatch(/@media \(max-height: 520px\)\s*\{[\s\S]*?--sg-controller-scale: \.72;[\s\S]*?width: 138\.889%;/);
    expect(shell).toContain("body:has(.controllerShell[data-surface='clubhouse']) .ticker");
    expect(toolbar).toContain('disabled={clubhouseMenu}');
  });

  it('makes Play an immediate action and does not force the roster open in People mode', () => {
    expect(toolbar).toContain("{ id: 'play', label: 'Play', icon: 'play', tools: [] }");
    expect(toolbar).toContain("if (item.id === 'play')");
    expect(toolbar).toContain('startRound();');
    const peopleBranch = toolbar.slice(toolbar.indexOf("else if (item.id === 'people')"), toolbar.indexOf("else {", toolbar.indexOf("else if (item.id === 'people')")));
    expect(peopleBranch).toContain("setTool('inspect')");
    expect(peopleBranch).not.toContain('regularsPanel: true');
  });
});
