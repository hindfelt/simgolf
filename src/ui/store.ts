import { create } from 'zustand';
import type { ToolId, GameMode, ClubId, ShotShape, CourseTheme, Difficulty, RoundRecord, ChampionshipResult, ProChallengeResult, ThemePackId, PropertyId, WeatherCondition, PlayerShotFeedback } from '../game/types';
import type { PortraitExpression } from '../game/portraits';
import type { ProPracticeResult } from '../game/proCircuit';

export interface TickerCharacter {
  shirt: string;
  skin: string;
  cap: string;
  identity?: string;
  expression: PortraitExpression;
}

export interface TickerItem {
  id: number;
  name: string;
  txt: string;
  cls?: string;
  character?: TickerCharacter;
}

export type ModalDescriptor =
  | { kind: 'help' }
  | { kind: 'newCourse'; initial?: boolean }
  | { kind: 'landOffer' }
  | { kind: 'landmarkGift' }
  | { kind: 'round'; record: RoundRecord; courseRecord: boolean; personalBest: boolean; unlockedProperties?: PropertyId[]; practice?: ProPracticeResult }
  | { kind: 'championshipResult'; record: RoundRecord; result: ChampionshipResult; courseRecord: boolean; personalBest: boolean; unlockedProperties?: PropertyId[]; practice?: ProPracticeResult }
  | { kind: 'proChallengeResult'; record: RoundRecord; result: ProChallengeResult; courseRecord: boolean; personalBest: boolean; unlockedProperties?: PropertyId[]; practice?: ProPracticeResult }
  | { kind: 'saves' }
  | null;

export interface PlayHudInfo {
  holeLabel: string;
  strokeLabel: string;
  coach: string;
  onGreen: boolean;
  lie: string;
  pinDistance: number;
  clubRanges: Record<ClubId, number>;
  clubOptions: Record<ClubId, { carry: number; available: boolean; reason: string | null; role: string }>;
  power: number | null;
  carry: number | null;
  rollout: number | null;
  finishDistance: number | null;
  shotInFlight: boolean;
  windAlong: number | null;
  windCross: number | null;
  windDisplacement: number | null;
  lastShotFeedback: PlayerShotFeedback | null;
  canopyStatus: 'clear' | 'canopy' | 'trunk' | 'pine' | null;
  canopyLabel: string | null;
  canopyAdvice: string | null;
  selectedRole: string;
  club: ClubId;
  shape: ShotShape;
  windSpeed: number;
  windDx: number;
  windDy: number;
  weatherCondition: WeatherCondition;
  weatherIntensity: number;
  weatherWetness: number;
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
  destinationRelease: PropertyId[];
  modal: ModalDescriptor;
  playHud: PlayHudInfo | null;
  clubhouseMenu: boolean;
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
  golferSelectionVersion: number; // bumped when the ephemeral People inspector selection changes
  portfolioVersion: number; // bumped after portfolio migration, purchase, save, or switch
  portfolioStatus: 'idle' | 'saving' | 'saved' | 'error';

  set: (patch: Partial<UIStore>) => void;
  pushTicker: (name: string, txt: string, cls?: string, character?: TickerCharacter) => void;
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
  destinationRelease: [],
  modal: null,
  playHud: null,
  clubhouseMenu: false,
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
  golferSelectionVersion: 0,
  portfolioVersion: 0,
  portfolioStatus: 'idle',

  set: (patch) => set(() => {
    const surfaceKeys = ['clubhouseMenu', 'buildPanel', 'staffPanel', 'reportsPanel', 'regularsPanel', 'scorecardsPanel', 'onlinePanel', 'proPanel'] as const;
    const opened = surfaceKeys.find((key) => patch[key] === true);
    if (!opened) return patch;
    const closed = Object.fromEntries(surfaceKeys.map((key) => [key, false])) as Pick<UIStore, typeof surfaceKeys[number]>;
    return { ...closed, ...patch, [opened]: true };
  }),
  pushTicker: (name, txt, cls, character) =>
    set((st) => {
      const item: TickerItem = { id: ++tickerSeq, name, txt, cls, character };
      const next = [...st.tickers, item];
      while (next.length > 4) next.shift();
      return { tickers: next };
    }),
  dropTicker: (id) => set((st) => ({ tickers: st.tickers.filter((t) => t.id !== id) })),
}));

/** Non-hook accessors so the imperative engine can drive the UI store. */
export const ui = {
  set: (patch: Partial<UIStore>) => useUI.getState().set(patch),
  ticker: (name: string, txt: string, cls?: string, character?: TickerCharacter) => useUI.getState().pushTicker(name, txt, cls, character),
  get: () => useUI.getState(),
};
