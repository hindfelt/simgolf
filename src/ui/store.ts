import { create } from 'zustand';
import type { ToolId, GameMode, ClubId, ShotShape, CourseTheme, Difficulty, RoundRecord, ChampionshipResult, ProChallengeResult, ThemePackId, PropertyId } from '../game/types';

export interface TickerItem {
  id: number;
  name: string;
  txt: string;
  cls?: string;
}

export type ModalDescriptor =
  | { kind: 'help' }
  | { kind: 'newCourse'; initial?: boolean }
  | { kind: 'landOffer' }
  | { kind: 'landmarkGift' }
  | { kind: 'round'; record: RoundRecord; courseRecord: boolean; personalBest: boolean }
  | { kind: 'championshipResult'; record: RoundRecord; result: ChampionshipResult; courseRecord: boolean; personalBest: boolean }
  | { kind: 'proChallengeResult'; record: RoundRecord; result: ProChallengeResult; courseRecord: boolean; personalBest: boolean }
  | { kind: 'saves' }
  | null;

export interface PlayHudInfo {
  holeLabel: string;
  strokeLabel: string;
  onGreen: boolean;
  club: ClubId;
  shape: ShotShape;
  windSpeed: number;
  windDx: number;
  windDy: number;
}

interface UIStore {
  // ledger + status mirrored from the engine
  courseName: string;
  courseTheme: CourseTheme;
  propertyId: PropertyId;
  themePackId: ThemePackId;
  difficulty: Difficulty;
  sandbox: boolean;
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
  reportsPanel: boolean;
  regularsPanel: boolean;
  scorecardsPanel: boolean;
  onlinePanel: boolean;
  proPanel: boolean;
  staffVersion: number; // bumped on hire/fire to re-render the roster
  holesVersion: number; // bumped on hole reorder to re-render the hole card
  simTick: number; // bumped ~once/sec so time-sensitive UI (tournament countdown) stays live
  roundsVersion: number; // bumped when scorecard history is added or imported
  proVersion: number; // bumped when resident-pro/circuit profile data changes

  set: (patch: Partial<UIStore>) => void;
  pushTicker: (name: string, txt: string, cls?: string) => void;
  dropTicker: (id: number) => void;
}

let tickerSeq = 0;

export const useUI = create<UIStore>((set) => ({
  courseName: 'Fairway Mogul',
  courseTheme: 'parklands',
  propertyId: 'maple-crossing',
  themePackId: 'standard',
  difficulty: 'moderate',
  sandbox: false,
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
  reportsPanel: false,
  regularsPanel: false,
  scorecardsPanel: false,
  onlinePanel: false,
  proPanel: false,
  staffVersion: 0,
  holesVersion: 0,
  simTick: 0,
  roundsVersion: 0,
  proVersion: 0,

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
