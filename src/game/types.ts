// Core domain types for Fairway Mogul.
// POC-level types are implemented now; the fuller-clone types (buildings,
// employees, skills, sim-stories, SGA) are declared here so modules added
// later slot into a stable shape.

export type Vec = { x: number; y: number };

/** Terrain tile ids. Values are stable — persisted in saves. */
export enum Tile {
  ROUGH = 0,
  FAIR = 1,
  GREEN = 2,
  TEE = 3,
  SAND = 4,
  WATER = 5,
  TREE = 6,
  FLOWER = 7,
  // --- reserved for the elevation/terrain feature pass ---
  FIRM_FAIR = 8,
  DEEP_ROUGH = 9,
  PATH = 10,
  WASTE_BUNKER = 11,
  POT_BUNKER = 12,
  STREAM = 13,
  BRUSH = 14,
  ROCK = 15,
  /** Pathway deck retaining the underlying water/stream rendering. Appended for save stability. */
  BRIDGE_WATER = 16,
  BRIDGE_STREAM = 17,
}

export type LieKey =
  | 'tee'
  | 'fair'
  | 'firmfair'
  | 'rough'
  | 'deeprough'
  | 'sand'
  | 'waste'
  | 'pot'
  | 'stream'
  | 'brush'
  | 'rock'
  | 'tree'
  | 'green'
  | 'flower'
  | 'water'
  | 'bridge';

export interface TileInfo {
  name: string;
  c1: string;
  c2: string;
  cost: number;
}

/** How a lie plays: max carry (tiles), aim wobble (deg), distance wobble. */
export interface LieInfo {
  max: number;
  ang: number;
  dst: number;
}

export interface Hole {
  id: number;
  tee: Vec;
  cup: Vec;
  par: number;
  teeTiles: string[];
  greenTiles: string[];
  beauty: number;
  /** Risk/reward interest score 0..1: hazards in play, dogleg bend, elevation change, green size. */
  interest: number;
  /** Sub-scores behind `interest`, kept for complaint copy ("Hole 3 is flat and hazard-free"). */
  funBreakdown?: { hazard: number; dogleg: number; elev: number; green: number };
  open?: boolean;
  // reserved: SGA classification & ratings
  sgaClass?: SgaClass;
  /** Continuous 0..1 demand behind the manual SGA class. */
  skillDemand?: { length: number; accuracy: number; imagination: number };
  top100?: boolean;
  top18?: boolean;
  /** Custom green fee for this hole, overriding `S.fee`. Undefined = use the global fee. */
  fee?: number;
}

export type SgaClass = 'Breather' | 'Freeway' | 'Precise' | 'Creative' | 'Challenge' | 'Heroic' | 'Strategic' | 'Classic';

export type GolferState =
  | 'toTee'
  | 'toBall'
  | 'leave'
  | 'preshot'
  | 'prePutt'
  | 'watch';

export interface Golfer {
  name: string;
  skill: number;
  shirt: string;
  skin: string;
  cap: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
  phase: number;
  state: GolferState;
  t: number;
  holeIdx: number;
  strokes: number;
  mood: number;
  ball: Vec | null;
  lie: LieKey;
  chatCd: number;
  scenicSaid: boolean;
  face?: number; // 1 = facing screen-right, -1 = left
  facingAway?: boolean; // walking predominantly up-screen — draw the rear-view sprite
  // distinct skills, copied from the matching `Regular` at spawn (P3)
  length?: number;
  accuracy?: number;
  imagination?: number;
  /** Needs 0..1 (1 = full/rested), drained per hole, restored by nearby facilities. */
  energy: number;
  hunger: number;
  thirst: number;
  /** A* waypoints (tile centers) toward `tx,ty`, walked in order before the final leg. */
  path?: Vec[];
  pathIdx?: number;
  /** Manual special visitors whose completed round may unlock expansion or landmarks. */
  specialGuest?: SpecialGuestKind;
}

/** A named regular's persistent identity — looked up by `name`, survives save/load and course rebuilds. */
export interface Regular {
  name: string;
  shirt: string;
  skin: string;
  cap: string;
  length: number;
  accuracy: number;
  imagination: number;
  visits: number;
  streak: number;
  lastVisit: number;
  /** Persistent club relationship and spending history for the Membership Roster. */
  holesPlayed?: number;
  lifetimeSpend?: number;
  membership?: Membership;
  celebrity?: boolean;
  relation?: { type: 'rival' | 'couple'; withName: string; cd: number };
}

export type MembershipTier = 'annual' | 'lifetime';

export interface Membership {
  tier: MembershipTier;
  /** Simulated financial year in which this membership was first purchased. */
  sinceYear: number;
  /** Total membership dues paid by this regular, excluding green fees. */
  paid: number;
  /** Annual memberships remain active through this year. Lifetime members omit it. */
  expiresYear?: number;
  lastRenewedYear: number;
}

export type FinanceCategory =
  | 'capital'
  | 'greenFees'
  | 'memberships'
  | 'property'
  | 'tournament'
  | 'proChallenge'
  | 'roundBonuses'
  | 'refunds'
  | 'courseConstruction'
  | 'facilities'
  | 'landscaping'
  | 'land'
  | 'staff'
  | 'wages'
  | 'upkeep';

export interface FinanceEntry {
  id: number;
  time: number;
  year: number;
  amount: number;
  category: FinanceCategory;
  detail: string;
}

export type BallKind = 'fly' | 'roll' | 'putt';

export interface TreeCanopyImpact {
  t: number;
  x: number;
  y: number;
  treeX: number;
  treeY: number;
  kind: 'canopy' | 'trunk' | 'pine';
  /** Absolute vertical screen-space coordinate above the map's zero plane. */
  altitude: number;
}

export interface Ball {
  kind: BallKind;
  owner: Golfer | 'P';
  cup: Vec | null;
  fx: number;
  fy: number;
  tx: number;
  ty: number;
  t: number;
  dur: number;
  h: number;
  x: number;
  y: number;
  events?: string[];
  holed?: boolean;
  /** High Backspin shot: skip roll-out, stop dead where it lands. */
  noRoll?: boolean;
  /** Low Punch shot marker; clearance comes from its lower trajectory, not collision exemptions. */
  lowFlight?: boolean;
  /** Player-shaped flight follows the same curve as the aim guide, not a straight chord. */
  shotShape?: ShotShape;
  curvePerpX?: number;
  curvePerpY?: number;
  curveDistance?: number;
  /** Club-specific ground release; Backspin still bypasses rollout entirely. */
  rollMultiplier?: number;
  /** Player-only precomputed first tree impact. AI balls intentionally omit this. */
  canopyImpact?: TreeCanopyImpact;
}

export interface Floater {
  wx: number;
  wy: number;
  txt: string;
  color: string;
  kind: 'txt' | 'cash' | 'bub';
  age: number;
  life: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  c: string;
  age: number;
  life: number;
}

export type ClubId = 'driver' | 'iron' | 'wedge';
/** Manual (p.21-22): shot techniques the player picks before each swing. */
export type ShotShape = 'straight' | 'fade' | 'draw' | 'hook' | 'backspin' | 'punch';

/** Immutable evidence for one completed player stroke. This is deliberately richer
 * than the HUD needs because online competitions will submit this same record shape. */
export interface PlayerShotRecord {
  stroke: number;
  club: ClubId | 'putter';
  shape: ShotShape | 'putt';
  fromLie: LieKey;
  resultLie: LieKey;
  power: number;
  intendedDistance: number;
  distance: number;
  start: Vec;
  end: Vec;
  events: string[];
  penalty: number;
  holed: boolean;
}

export interface PlayerHoleScore {
  hole: number;
  holeId: number;
  par: number;
  distance: number;
  strokes: number;
  relative: number;
  penalties: number;
  putts: number;
  /** Null on par 3s, otherwise whether the opening drive finished on short grass. */
  fairwayHit: boolean | null;
  greenInRegulation: boolean;
  hazards: string[];
  wind: { dx: number; dy: number; speed: number };
  shots: PlayerShotRecord[];
}

export type RoundSource = 'exhibition' | 'tournament' | 'daily' | 'weekly' | 'challenge';

/** Versioned, self-contained completed round. Safe to serialize, export and later
 * submit to an authenticated competition API without depending on mutable course state. */
export interface RoundRecord {
  version: 1;
  id: string;
  playerName: string;
  source: RoundSource;
  localEvent?: 'championship' | 'proChallenge';
  competitionId?: string;
  challengeId?: string;
  startedAt: number;
  completedAt: number;
  durationSeconds: number;
  courseName: string;
  courseTheme: CourseTheme;
  courseHash: string;
  holesPlayed: number;
  par: number;
  strokes: number;
  scoreToPar: number;
  payout: number;
  eagles: number;
  birdies: number;
  pars: number;
  bogeys: number;
  penalties: number;
  putts: number;
  fairwaysHit: number;
  fairwayOpportunities: number;
  greensInRegulation: number;
  longestShot: number;
  card: PlayerHoleScore[];
}

export interface PlayerRound {
  id: string;
  startedAt: number;
  courseHash: string;
  source: RoundSource;
  localEvent?: 'championship' | 'proChallenge';
  competitionId?: string;
  challengeId?: string;
  holeIdx: number;
  strokes: number;
  card: PlayerHoleScore[];
  currentHole: PlayerHoleScore | null;
  pendingShot: PlayerShotRecord | null;
  ball: Vec | null;
  lie: LieKey;
  state: 'aim' | 'wait' | 'between';
  aim: Aim | null;
  club: ClubId;
  shape: ShotShape;
}

export interface Aim {
  on: boolean;
  sx: number;
  sy: number;
  cx: number;
  cy: number;
  /** Pointer drags and keyboard-generated drags share the same shot-preview pipeline. */
  kind?: 'pointer' | 'keyboard';
  /** Camera-independent intent keeps keyboard previews stable during view changes. */
  worldDirX?: number;
  worldDirY?: number;
  worldPower?: number;
}

export interface Camera {
  x: number;
  y: number;
  z: number;
}

export type ToolId =
  | 'pan'
  | 'hole'
  | 'fair'
  | 'firmfair'
  | 'deeprough'
  | 'green'
  | 'sand'
  | 'waste'
  | 'pot'
  | 'stream'
  | 'brush'
  | 'rocks'
  | 'water'
  | 'tree'
  | 'flower'
  | 'path'
  | 'raise'
  | 'lower'
  | 'land'
  | 'build'
  | 'dozer'
  | 'play';

/** Facilities & scenery placed on the course. */
export type BuildingKind =
  | 'proshop'
  | 'snackbar'
  | 'drivingrange'
  | 'puttinggreen'
  | 'cartgarage'
  | 'hotel'
  | 'tennis'
  | 'marina'
  | 'airstrip'
  | 'bench'
  | 'flowerbed'
  | 'landmark'
  | 'ballwasher'
  | 'scenicbridge'
  | 'buildinglot';

/** Player-selected operating philosophy for a facility's upgrade path. */
export type FacilityBranch = 'service' | 'prestige';

export interface FacilityUpgradeWork {
  targetLevel: 2 | 3;
  branch: FacilityBranch;
  remaining: number;
  duration: number;
}

export interface Building {
  id: number;
  kind: BuildingKind;
  x: number; // footprint top-left tile
  y: number;
  w: number;
  h: number;
  open: boolean; // connected to the clubhouse by pathway
  /** Building lots develop over time: 0 construction, 1 cottage, 2 estate. */
  stage?: number;
  stageT?: number; // seconds accumulated toward the next stage
  /** Resort facilities start at level 1; scenery and building lots do not use this. */
  level?: 1 | 2 | 3;
  /** Chosen on the first upgrade and retained through level 3. */
  branch?: FacilityBranch;
  /** Timed construction. While present the facility is visibly scaffolded and offline. */
  upgrade?: FacilityUpgradeWork;
}

export type FacilityActivityKind = 'plane-arrival' | 'plane-departure' | 'marina-boat';

/** Short-lived ambient traffic generated by destination facilities. */
export interface FacilityActivity {
  id: number;
  facilityId: number;
  kind: FacilityActivityKind;
  age: number;
  duration: number;
  direction: 1 | -1;
}

/** Staff. Skilled tiers unlock once a course has 6+ holes (manual). */
export type EmployeeKind =
  | 'clubpro'
  | 'ranger'
  | 'groundskeeper'
  | 'sodavendor'
  | 'celebrity'
  | 'marshall'
  | 'turftech'
  | 'refreshment';

export interface Employee {
  id: number;
  kind: EmployeeKind;
  hiredAt: number; // S.time when hired
}

export type GameMode = 'build' | 'play';

/** The full mutable simulation state. Read every frame by the renderer. */
/** Cosmetic terrain palette + vegetation mood, chosen once per course (manual: Parklands/Links/Desert/Tropical). */
export type CourseTheme = 'parklands' | 'links' | 'desert' | 'tropical';
/** Manual Theme Packs are modular cast/story/pro/course bundles, independent of terrain theme. */
export type ThemePackId = 'standard' | 'storybook-club' | 'neighborhood-nine' | 'backlot-legends';
export type PropertyId =
  | 'maple-crossing' | 'kyoto-gardens' | 'bavarian-vale' | 'ontario-lakes'
  | 'donegal-point' | 'skagen-dunes' | 'cape-breton-links' | 'hebridean-reach'
  | 'red-mesa' | 'atacama-wash' | 'namib-canyon' | 'wadi-rum-reserve'
  | 'maui-grove' | 'fiji-lagoon' | 'palawan-bay' | 'seychelles-crown';
export type Difficulty = 'easy' | 'moderate' | 'difficult' | 'impossible';
export type SpecialGuestKind = 'picky' | 'ivana';
export type ProSkillId =
  | 'powerHitter'
  | 'longDriver'
  | 'accurateDriver'
  | 'accurateIrons'
  | 'accuratePutter'
  | 'drawShot'
  | 'fadeShot'
  | 'highBackspin'
  | 'recovery'
  | 'luck';

export interface ProProfile {
  version: 1;
  name: string;
  shirt: string;
  skin: string;
  cap: string;
  skills: Record<ProSkillId, number>;
  unspentSkillPoints: number;
  accomplishments: string[];
  starts: number;
  wins: number;
  podiums: number;
  careerEarnings: number;
  fame: number;
}

/** Non-spendable portfolio milestones that survive moving between courses. */
export interface CareerProgress {
  version: 1;
  bestReputation: number;
  tournamentHosted: boolean;
  sgaTop100Earned: boolean;
  sgaTop18Earned: boolean;
}

export interface RetiredCourse {
  id: string;
  name: string;
  retiredAt: number;
  courseHash: string;
  theme: CourseTheme;
  holes: number;
  par: number;
  snapshot: unknown;
}

export interface ChampionshipStanding {
  rank: number;
  name: string;
  scoreToPar: number;
  strokes: number;
  player: boolean;
}

export interface ChampionshipResult {
  id: string;
  title: string;
  playedAt: number;
  courseId: string;
  courseName: string;
  difficulty: Difficulty;
  proName: string;
  recordId: string;
  rank: number;
  prize: number;
  fame: number;
  standings: ChampionshipStanding[];
}

export interface ActiveChampionship {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  difficulty: Difficulty;
  pro: ProProfile;
  usesResidentPro: boolean;
}

export interface TouringPro {
  name: string;
  title: string;
  shirt: string;
  skin: string;
  cap: string;
  length: number;
  accuracy: number;
  imagination: number;
}

export interface ProChallengeOffer {
  id: string;
  opponent: TouringPro;
  wagerPerHole: number;
  remaining: number;
}

export interface ProChallengeHoleResult {
  hole: number;
  par: number;
  playerStrokes: number;
  opponentStrokes: number;
  outcome: 'won' | 'lost' | 'tied';
}

export interface ProChallengeResult {
  id: string;
  playedAt: number;
  opponent: TouringPro;
  proName: string;
  courseName: string;
  recordId: string;
  wagerPerHole: number;
  holesWon: number;
  holesLost: number;
  holesTied: number;
  net: number;
  outcome: 'won' | 'lost' | 'tied';
  holes: ProChallengeHoleResult[];
}

export interface LandOffer {
  id: number;
  parcelIndices: number[];
  price: number;
  remaining: number;
}

export interface SpecialVisitorState {
  pickyCooldown: number;
  ivanaCooldown: number;
  pickyVisits: number;
  ivanaVisits: number;
  landmarkDonated: boolean;
  landmarkCredits: number;
  /** True only after buying a county parcel offered by I.M. Picky. */
  landPurchased?: boolean;
  landOffer: LandOffer | null;
}

export interface GameState {
  courseName: string;
  theme: CourseTheme;
  /** Manual World Screen location currently being developed. */
  propertyId: PropertyId;
  themePackId: ThemePackId;
  /** Optional bundled starter layout selected from the active Theme Pack. */
  themeCourseId: string | null;
  difficulty: Difficulty;
  /** Manual: "unlimited funds and all property locations available... without the constraints of financial worries." */
  sandbox: boolean;
  cash: number;
  fee: number;
  rep: number;
  time: number;
  speed: number;
  tiles: Uint8Array;
  /** Corner heightfield, (W+1)x(H+1), 0..MAXE. Tiles render as sloped quads. */
  elevC: Uint8Array;
  /** Owned land parcels, PW x PH (1 = owned). */
  owned: Uint8Array;
  holes: Hole[];
  buildings: Building[];
  facilityActivities: FacilityActivity[];
  nextFacilityActivity: number;
  buildKind: BuildingKind | null; // pending placement when tool === 'build'
  employees: Employee[];
  golfers: Golfer[];
  /** The club's named cast — persists across saves and course rebuilds. */
  regulars: Regular[];
  /** Signed cash transactions used by the year-sorted Financial Report. */
  financeLedger: FinanceEntry[];
  /** Countdown (seconds) to the next rivalry/couple story check. */
  nextStoryCheck: number;
  /** Manual p.17/p.19 guest progression: I.M. Picky expansion and Ivana's first Landmark. */
  specialVisitors: SpecialVisitorState;
  /** Local profile data lives outside course slots and survives starting/loading courses. */
  proProfile: ProProfile;
  /** Profile-level World Screen history used for magenta purchased pins. */
  propertiesPurchased: PropertyId[];
  /** Sticky World Screen unlock milestones; money remains course-local and spendable. */
  careerProgress: CareerProgress;
  retiredCourses: RetiredCourse[];
  championshipHistory: ChampionshipResult[];
  /** Ephemeral isolated pro-circuit round; never written into a course save. */
  activeChampionship: ActiveChampionship | null;
  proChallengeOffer: ProChallengeOffer | null;
  proChallengeCooldown: number;
  activeProChallenge: ProChallengeOffer | null;
  proChallengeHistory: ProChallengeResult[];
  balls: Ball[];
  floaters: Floater[];
  parts: Particle[];
  tool: ToolId;
  holeDraft: { tee: Vec } | null;
  hover: Vec | null;
  mode: GameMode;
  muted: boolean;
  nextGolfer: number;
  lost: number;
  served: number;
  player: PlayerRound | null;
  cam: Camera;
  /** Viewport css size, kept fresh by the canvas resize handler. */
  view: { w: number; h: number };
  /** When set, the camera glides until this world point is centred. */
  camTarget: Vec | null;
  /** View rotation in 90° steps (0..3). */
  rot: number;
  /** Active weekend tournament, if any. */
  tournament: { timeLeft: number; entrants: number; purse: number } | null;
  /** Seconds until another tournament can be hosted. */
  tournamentCooldown: number;
  tournamentHostedEver: boolean;
  /** Milestone ids the player has permanently unlocked, e.g. "rep3", "ownAll". */
  goalsAchieved: Record<string, boolean>;
  /** Camera-shake magnitude in px, decays to 0 each frame — a render-only jitter, never persisted. */
  camShake: number;
  /** Per-hole wind for the player's own round — a unit direction plus a 0..1 speed, redrawn each hole. */
  wind: { dx: number; dy: number; speed: number };
  /** Persistent history of golfer/staff/system chatter, newest last — mirrors the original's Player Comments report. */
  comments: CommentEntry[];
  /** Periodic snapshots for the Histograph trend chart — reputation/cash/golfers over time, newest last. */
  history: { time: number; rep: number; cash: number; golfers: number }[];
  /** Account-like local profile history, stored separately from course save slots. */
  roundHistory: RoundRecord[];
}

export interface CommentEntry {
  id: number;
  time: number;
  name: string;
  txt: string;
  cls?: string;
}
