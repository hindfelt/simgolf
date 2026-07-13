import type { ToolId } from '../game/types';

export type ToolPreviewMotif =
  | 'paper-hand'
  | 'new-hole'
  | 'fairway-stripes'
  | 'firm-fairway'
  | 'deep-rough'
  | 'putting-green'
  | 'sand-trap'
  | 'waste-bunker'
  | 'pot-bunker'
  | 'stream-channel'
  | 'brush-clump'
  | 'rock-cluster'
  | 'open-water'
  | 'pine-tree'
  | 'flower-bed'
  | 'pathway'
  | 'raised-land'
  | 'lowered-land'
  | 'land-deed'
  | 'facility-house'
  | 'bulldozer'
  | 'tee-off';

export interface ToolPreviewRecipe {
  motif: ToolPreviewMotif;
  base: 'tile' | 'slab';
  top: readonly [string, string];
  left: string;
  right: string;
  ink: string;
}

/**
 * Every construction tool receives authored miniature art. This is deliberately
 * exhaustive: adding a ToolId must fail typechecking until its rail preview is
 * designed instead of silently falling back to the old generic diamond/icon.
 */
export const TOOL_PREVIEW_RECIPES = {
  pan: { motif: 'paper-hand', base: 'slab', top: ['#f0eff9', '#aeb0d2'], left: '#555b9b', right: '#7378b8', ink: '#26347f' },
  hole: { motif: 'new-hole', base: 'tile', top: ['#f7dc2a', '#c8a70b'], left: '#806c19', right: '#9e8420', ink: '#173e39' },
  fair: { motif: 'fairway-stripes', base: 'tile', top: ['#80bd59', '#4f8f3a'], left: '#315f35', right: '#477536', ink: '#e3f1a8' },
  firmfair: { motif: 'firm-fairway', base: 'tile', top: ['#9fc85d', '#6f9b3d'], left: '#486832', right: '#5c7d35', ink: '#e6ef9c' },
  deeprough: { motif: 'deep-rough', base: 'tile', top: ['#60894c', '#345f37'], left: '#294530', right: '#355536', ink: '#b6d27b' },
  green: { motif: 'putting-green', base: 'tile', top: ['#91cf58', '#54a144'], left: '#356634', right: '#447d37', ink: '#f8f0c5' },
  sand: { motif: 'sand-trap', base: 'tile', top: ['#79ad50', '#4c843b'], left: '#345b32', right: '#416f34', ink: '#f0dfad' },
  waste: { motif: 'waste-bunker', base: 'tile', top: ['#668d4d', '#3e6e3a'], left: '#2e4d31', right: '#385e34', ink: '#c5a86e' },
  pot: { motif: 'pot-bunker', base: 'tile', top: ['#75a852', '#4a7f3b'], left: '#31562f', right: '#3f6a34', ink: '#efdca8' },
  stream: { motif: 'stream-channel', base: 'tile', top: ['#759f55', '#466f3b'], left: '#304d32', right: '#3b6134', ink: '#63b8d2' },
  brush: { motif: 'brush-clump', base: 'tile', top: ['#6e9851', '#456f3a'], left: '#304e31', right: '#3b5f33', ink: '#274d2d' },
  rocks: { motif: 'rock-cluster', base: 'tile', top: ['#799f59', '#4b743f'], left: '#344f35', right: '#3e6137', ink: '#a8a795' },
  water: { motif: 'open-water', base: 'tile', top: ['#5aa7d1', '#286d9b'], left: '#234d79', right: '#2c628c', ink: '#b8e6e8' },
  tree: { motif: 'pine-tree', base: 'tile', top: ['#7aaa53', '#4b7b3d'], left: '#31562f', right: '#3d6934', ink: '#214c2e' },
  flower: { motif: 'flower-bed', base: 'tile', top: ['#77a84f', '#4a7a3b'], left: '#31542e', right: '#3d6533', ink: '#ef6c91' },
  path: { motif: 'pathway', base: 'tile', top: ['#759f58', '#4a753e'], left: '#335136', right: '#3f6238', ink: '#d7ba8b' },
  raise: { motif: 'raised-land', base: 'tile', top: ['#7dac55', '#4f803f'], left: '#355832', right: '#416a35', ink: '#e7f09d' },
  lower: { motif: 'lowered-land', base: 'tile', top: ['#759f52', '#486f3a'], left: '#304d31', right: '#3a5d33', ink: '#dce98f' },
  land: { motif: 'land-deed', base: 'tile', top: ['#b6c38d', '#829f69'], left: '#586c4c', right: '#6e8255', ink: '#f4ebc3' },
  build: { motif: 'facility-house', base: 'tile', top: ['#d5c6ab', '#a59580'], left: '#665c61', right: '#81716b', ink: '#f0d38e' },
  dozer: { motif: 'bulldozer', base: 'tile', top: ['#b9a16d', '#856e4e'], left: '#554735', right: '#6f5a40', ink: '#f0be2e' },
  play: { motif: 'tee-off', base: 'tile', top: ['#f5dc91', '#d2a948'], left: '#806a30', right: '#9e8038', ink: '#263a78' },
} as const satisfies Record<ToolId, ToolPreviewRecipe>;

export const TOOL_PREVIEW_IDS = Object.freeze(Object.keys(TOOL_PREVIEW_RECIPES) as ToolId[]);

export function toolPreviewRecipe(id: ToolId): ToolPreviewRecipe {
  return TOOL_PREVIEW_RECIPES[id];
}
