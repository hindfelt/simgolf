import { describe, expect, it } from 'vitest';
import type { ToolId } from '../game/types';
import { TOOL_PREVIEW_IDS, TOOL_PREVIEW_RECIPES, toolPreviewRecipe } from './toolPreviewRecipes';

const ALL_TOOLS: ToolId[] = [
  'pan', 'inspect', 'hole', 'fair', 'firmfair', 'deeprough', 'green', 'sand', 'waste', 'pot', 'stream', 'brush',
  'rocks', 'water', 'tree', 'flower', 'path', 'raise', 'lower', 'land', 'build', 'dozer', 'play',
];

describe('original-style construction tool previews', () => {
  it('covers every tool without a generic fallback', () => {
    expect(new Set(TOOL_PREVIEW_IDS)).toEqual(new Set(ALL_TOOLS));
    expect(Object.keys(TOOL_PREVIEW_RECIPES)).toHaveLength(ALL_TOOLS.length);
    for (const tool of ALL_TOOLS) expect(toolPreviewRecipe(tool)).toBeDefined();
  });

  it('gives every tool an independently authored motif', () => {
    const motifs = ALL_TOOLS.map((tool) => toolPreviewRecipe(tool).motif);
    expect(new Set(motifs)).toHaveLength(ALL_TOOLS.length);
  });

  it('uses semantic miniature scenes for the most visible rail tools', () => {
    expect(toolPreviewRecipe('pan')).toMatchObject({ base: 'slab', motif: 'paper-hand' });
    expect(toolPreviewRecipe('inspect')).toMatchObject({ base: 'slab', motif: 'people-profile' });
    expect(toolPreviewRecipe('hole').motif).toBe('new-hole');
    expect(toolPreviewRecipe('fair').motif).toBe('fairway-stripes');
    expect(toolPreviewRecipe('green').motif).toBe('putting-green');
    expect(toolPreviewRecipe('water').motif).toBe('open-water');
    expect(toolPreviewRecipe('tree').motif).toBe('pine-tree');
    expect(toolPreviewRecipe('flower').motif).toBe('flower-bed');
    expect(toolPreviewRecipe('rocks').motif).toBe('rock-cluster');
  });

  it('keeps visually similar materials semantically distinct', () => {
    expect(toolPreviewRecipe('sand').motif).not.toBe(toolPreviewRecipe('waste').motif);
    expect(toolPreviewRecipe('waste').motif).not.toBe(toolPreviewRecipe('pot').motif);
    expect(toolPreviewRecipe('water').motif).not.toBe(toolPreviewRecipe('stream').motif);
    expect(toolPreviewRecipe('fair').motif).not.toBe(toolPreviewRecipe('firmfair').motif);
    expect(toolPreviewRecipe('raise').motif).not.toBe(toolPreviewRecipe('lower').motif);
  });
});
