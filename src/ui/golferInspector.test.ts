import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('original People inspector presentation', () => {
  const app = read('../App.tsx');
  const inspector = read('./GolferInspector.tsx');
  const regulars = read('./RegularsPanel.tsx');
  const toolbar = read('./Toolbar.tsx');
  const input = read('../game/input.ts');
  const render = read('../game/render.ts');
  const engine = read('../game/engine.ts');
  const shell = read('../simgolf-shell.css');

  it('mounts one non-modal live SimFoto profile with focus lifecycle and labelled meters', () => {
    expect(app).toContain('<GolferInspector />');
    expect(inspector).toContain('data-ui="people-inspector"');
    expect(inspector).toContain('role="dialog" aria-modal="false"');
    expect(inspector).toContain('useFloatingPanelFocus(!!golfer');
    expect(inspector).toContain('role="meter"');
    expect(inspector).toContain('FEEDBACK');
    expect(inspector).toContain('WISHES');
    expect(inspector).toContain('<small>Score</small>');
    expect(inspector).toContain('<small>Spent</small>');
    expect(inspector).toContain('centerOnGolfer(golfer)');
  });

  it('opens a golfer profile from a pan-tool tap before falling back to camera drag', () => {
    const panBranch = input.slice(input.indexOf("if (S.tool === 'pan')"), input.indexOf("if (S.tool === 'hole')"));
    expect(panBranch).toContain('pickGolferAtScreen(p.x, p.y');
    expect(panBranch.indexOf('selectGolfer(golfer)')).toBeLessThan(panBranch.indexOf('panDrag = {'));
  });

  it('provides a visible People category and roster-to-world focus path', () => {
    expect(toolbar).toContain("type GroupId = 'course' | 'terrain' | 'resort' | 'people' | 'play'");
    expect(toolbar).toContain("{ id: 'people', label: 'People', icon: 'regulars', tools: ['inspect'] }");
    expect(regulars).toContain('View {r.name} on the course');
    expect(regulars).toContain("setTool('inspect')");
    expect(regulars).toContain('selectGolfer(golfer)');
    expect(regulars).toContain('centerOnGolfer(golfer)');
  });

  it('lets People mode consume actor clicks before construction and keeps selection ephemeral', () => {
    expect(input.indexOf("if (S.tool === 'inspect')")).toBeLessThan(input.indexOf("if (S.tool === 'build')"));
    expect(input).toContain('pickGolferAtScreen(p.x, p.y');
    expect(input).toContain('selectGolfer(golfer)');
    expect(engine).toContain('S.selectedGolfer === g) selectGolfer(null)');
    expect(engine).toContain('selectGolfer(null);');
    const saveFields = engine.slice(engine.indexOf('function buildSaveData'), engine.indexOf('function applySaveData'));
    expect(saveFields).not.toContain('selectedGolfer:');
  });

  it('draws a selected ground marker before the actor and forces the gold name label', () => {
    const drawGolfer = render.slice(render.indexOf('function drawGolfer('), render.indexOf('function drawAvatar('));
    expect(drawGolfer).toContain('const selected = S.selectedGolfer === g');
    expect(drawGolfer.indexOf("ctx.strokeStyle = '#fff132'")).toBeLessThan(drawGolfer.indexOf('drawGolferSprite('));
    expect(drawGolfer).toContain("shouldShowActorName({ actor: 'golfer'");
    expect(drawGolfer).toContain('selected, special: !!g.specialGuest');
    expect(drawGolfer).toContain('selected || !!g.specialGuest);');
  });

  it('keeps the inspector in the visible course area above the original control fan', () => {
    expect(shell).toMatch(/\.golferInspector \{[\s\S]*?top: 92px;[\s\S]*?z-index: 26;[\s\S]*?max-height: calc\(100dvh - var\(--sg-fan-height\) - 108px\);/);
    expect(shell).toContain(".toolGroup[data-group-id='people']");
  });
});
