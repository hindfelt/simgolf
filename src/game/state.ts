import { W, H, PW, PH } from './constants';
import type { GameState } from './types';
import { createResidentPro } from './proCircuit';
import { CLEAR_WEATHER } from './weather';

/** The single mutable simulation state, shared by engine + renderer. */
export const S: GameState = {
  courseName: 'Fairway Mogul',
  theme: 'parklands',
  propertyId: 'maple-crossing',
  themePackId: 'standard',
  themeCourseId: null,
  difficulty: 'moderate',
  sandbox: false,
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
  facilityActivities: [],
  nextFacilityActivity: 4,
  buildKind: null,
  employees: [],
  golfers: [],
  selectedGolfer: null,
  regulars: [],
  financeLedger: [{ id: 1, time: 0, year: 1, amount: 20000, category: 'capital', detail: 'Founder capital' }],
  nextStoryCheck: 20,
  specialVisitors: {
    pickyCooldown: 38,
    ivanaCooldown: 62,
    pickyVisits: 0,
    ivanaVisits: 0,
    landmarkDonated: false,
    landmarkCredits: 0,
    landPurchased: false,
    landOffer: null,
  },
  proProfile: createResidentPro(),
  propertiesPurchased: [],
  careerProgress: { version: 1, earningsProgressionVersion: 1, bestReputation: 2.5, tournamentHosted: false, sgaTop100Earned: false, sgaTop18Earned: false },
  retiredCourses: [],
  championshipHistory: [],
  activeChampionship: null,
  proChallengeOffer: null,
  proChallengeCooldown: 75,
  activeProChallenge: null,
  proChallengeHistory: [],
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
  tournament: null,
  tournamentCooldown: 0,
  tournamentHostedEver: false,
  goalsAchieved: {},
  camShake: 0,
  wind: { dx: 1, dy: 0, speed: 0 },
  weather: { ...CLEAR_WEATHER },
  comments: [],
  history: [],
  roundHistory: [],
};

// Static-geometry caches, rebuilt when terrain/buildings change.
export const caches = {
  /** The iso-composited ground cache needs a rebuild (texture-map + slope shading). */
  groundDirty: true,
  /**
   * The flat ortho paint layer (tile-type blob shapes, ownership dimming) needs a
   * rebuild. Elevation-only edits (raise/lower) leave this false so the expensive
   * whole-map blob-shape repaint is skipped — only the (cheaper) per-tile texture
   * mapping onto the sloped iso quads reruns, reusing the still-valid ortho pixels.
   */
  orthoDirty: true,
  trees: [] as { x: number; y: number; s: number }[],
  waterTiles: [] as { x: number; y: number }[],
  wildlife: [] as { kind: 'duck' | 'rabbit' | 'deer' | 'bird' | 'squirrel'; x: number; y: number; s: number }[],
  naturePatches: [] as { kind: 'dandelion' | 'divot'; x: number; y: number; s: number }[],
  pathConnected: new Set<string>(), // "x,y" path tiles reachable from clubhouse
};
