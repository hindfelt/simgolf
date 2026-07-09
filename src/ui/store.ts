import { create } from 'zustand';
import type { ToolId, GameMode } from '../game/types';

export interface TickerItem {
  id: number;
  name: string;
  txt: string;
  cls?: string;
}

export type ModalDescriptor =
  | { kind: 'help' }
  | { kind: 'round'; rows: { hole: number; par: number; strokes: number; diff: number }[]; par: number; total: number; payout: number }
  | null;

export interface PlayHudInfo {
  holeLabel: string;
  strokeLabel: string;
}

interface UIStore {
  // ledger + status mirrored from the engine
  cash: number;
  rep: number;
  fee: number;
  golfers: number;
  holes: number;
  mode: GameMode;
  speed: number;
  muted: boolean;
  tool: ToolId;
  hint: string;
  tickers: TickerItem[];
  modal: ModalDescriptor;
  playHud: PlayHudInfo | null;
  buildPanel: boolean;
  staffPanel: boolean;
  staffVersion: number; // bumped on hire/fire to re-render the roster

  set: (patch: Partial<UIStore>) => void;
  pushTicker: (name: string, txt: string, cls?: string) => void;
  dropTicker: (id: number) => void;
}

let tickerSeq = 0;

export const useUI = create<UIStore>((set) => ({
  cash: 20000,
  rep: 2.5,
  fee: 20,
  golfers: 0,
  holes: 0,
  mode: 'build',
  speed: 1,
  muted: false,
  tool: 'hole',
  hint: 'Welcome, boss.',
  tickers: [],
  modal: null,
  playHud: null,
  buildPanel: false,
  staffPanel: false,
  staffVersion: 0,

  set: (patch) => set(patch),
  pushTicker: (name, txt, cls) =>
    set((st) => {
      const item: TickerItem = { id: ++tickerSeq, name, txt, cls };
      const next = [...st.tickers, item];
      while (next.length > 4) next.shift();
      return { tickers: next };
    }),
  dropTicker: (id) => set((st) => ({ tickers: st.tickers.filter((t) => t.id !== id) })),
}));

/** Non-hook accessors so the imperative engine can drive the UI store. */
export const ui = {
  set: (patch: Partial<UIStore>) => useUI.getState().set(patch),
  ticker: (name: string, txt: string, cls?: string) => useUI.getState().pushTicker(name, txt, cls),
  get: () => useUI.getState(),
};
