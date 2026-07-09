import { W, H, PW, PH } from './constants';
import type { GameState } from './types';

/** The single mutable simulation state, shared by engine + renderer. */
export const S: GameState = {
  cash: 20000,
  fee: 20,
  rep: 2.5,
  time: 0,
  speed: 1,
  tiles: new Uint8Array(W * H),
  elevC: new Uint8Array((W + 1) * (H + 1)),
  owned: new Uint8Array(PW * PH),
  holes: [],
  buildings: [],
  buildKind: null,
  employees: [],
  golfers: [],
  balls: [],
  floaters: [],
  parts: [],
  tool: 'hole',
  holeDraft: null,
  hover: null,
  mode: 'build',
  muted: false,
  nextGolfer: 2.5,
  lost: 0,
  served: 0,
  player: null,
  cam: { x: 0, y: 0, z: 1 },
  view: { w: 1024, h: 768 },
  camTarget: null,
  rot: 0,
};

// Static-geometry caches, rebuilt when terrain/buildings change.
export const caches = {
  groundDirty: true,
  trees: [] as { x: number; y: number; s: number }[],
  waterTiles: [] as { x: number; y: number }[],
  pathConnected: new Set<string>(), // "x,y" path tiles reachable from clubhouse
};
