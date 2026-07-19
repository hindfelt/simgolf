import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { H, LIE, MAXE, PW, PH, SHOT_SHAPES, W } from './constants';
import { acceptProChallenge, ballFlightPosition, beginPaintStroke, cachedPlayerShotForecast, exportSaveText, flightApexHeight, holeCorridorRadius, holeToolTap, isOutOfBounds, loadFromSlot, loadGame, migrateLegacyCareerRevenue, newCourse, paintAt, playerAimIntent, playerEstimatedRoll, playerFire, playerIntendedDistance, playerShotDispersion, playerShotForecast, playerShotPlan, playerShotPlanPosition, playerShotSkill, quitRound, rebuildStatics, retireCourseForChampionship, saveGame, saveToSlot, setClub, setShape, shapeCurveOffset, startChallengeRound, startChampionshipRound, startCompetitionRound, startRound, update, updatePlayHud, usesLegacyEndpointTreeDeflection } from './engine';
import { clubLieProfile, fallbackClubForLie, SEVERE_RECOVERY_LIES } from './clubProfiles';
import { createProChallengeOffer, createResidentPro } from './proCircuit';
import { P } from './camera';
import { idx, idxC } from './rng';
import { S, caches } from './state';
import { Tile } from './types';
import type { Golfer, Hole, ProChallengeOffer } from './types';
import { ui } from '../ui/store';
import { CLEAR_WEATHER } from './weather';
import { createRegularTraining } from './regularTraining';
import { operatingEarningsFromLedger } from './properties';
import type { ResortRecord } from './portfolio';
import { SPECIAL_GUESTS, specialGuestPortrait } from './specialGuests';
import { isPointOnBridgeDeck } from './bridges';

describe('new-hole placement', () => {
  beforeEach(() => {
    S.cash = 20_000;
    S.tiles = new Uint8Array(W * H);
    S.tiles.fill(Tile.ROUGH);
    S.elevC = new Uint8Array((W + 1) * (H + 1));
    S.owned = new Uint8Array(PW * PH);
    S.owned.fill(1);
    S.holes = [];
    S.buildings = [];
    S.facilityActivities = [];
    S.nextFacilityActivity = 4;
    S.employees = [];
    S.golfers = [];
    S.regulars = [];
    S.balls = [];
    S.speed = 1;
    S.nextGolfer = 999;
    S.holeDraft = null;
    rebuildStatics();
  });

  it('does not start a tee whose full pad crosses the map edge', () => {
    holeToolTap(0, 8);
    expect(S.holeDraft).toBeNull();
    expect(S.cash).toBe(20_000);
  });

  it('keeps the tee draft and cash when the proposed green footprint is invalid', () => {
    holeToolTap(10, 10);
    expect(S.holeDraft).not.toBeNull();

    holeToolTap(20, 0);
    expect(S.holes).toHaveLength(0);
    expect(S.holeDraft).not.toBeNull();
    expect(S.cash).toBe(20_000);
  });

  it('starts ambient traffic after a destination facility is built', () => {
    S.buildings.push({ id: 99, kind: 'airstrip', x: 30, y: 18, w: 8, h: 3, open: true, level: 1 });
    S.nextFacilityActivity = 0;

    update(0.1);

    expect(S.facilityActivities).toHaveLength(1);
    expect(S.facilityActivities[0].facilityId).toBe(99);
    expect(S.facilityActivities[0].kind).toMatch(/^plane-/);
  });

  it('raises and lowers the same land through several elevation steps', () => {
    S.tool = 'raise';
    for (let step = 1; step <= 3; step++) {
      beginPaintStroke();
      paintAt(30.2, 30.2);
      expect(S.elevC[idxC(30, 30)]).toBe(step);
    }

    S.tool = 'lower';
    for (let step = 2; step >= 0; step--) {
      beginPaintStroke();
      paintAt(30.2, 30.2);
      expect(S.elevC[idxC(30, 30)]).toBe(step);
    }
  });

  it('seeds visible wildlife from water, woodland, and rough habitats', () => {
    for (let y = 2; y < 10; y++) for (let x = 2; x < 10; x++) S.tiles[idx(x, y)] = Tile.WATER;
    for (let y = 12; y < 22; y++) for (let x = 2; x < 12; x++) S.tiles[idx(x, y)] = Tile.TREE;

    rebuildStatics();

    const kinds = new Set(caches.wildlife.map((animal) => animal.kind));
    expect(kinds).toContain('duck');
    expect(kinds).toContain('deer');
    expect(kinds).toContain('rabbit');
    expect(kinds).toContain('squirrel');
  });

  it("flattening a new hole's pad never overwrites a pinned building's corner", () => {
    S.buildings.push({ id: 1, kind: 'bench', x: 14, y: 9, w: 1, h: 1, open: true });
    S.elevC.fill(MAXE); // a steep plateau everywhere...
    for (let y = 9; y <= 11; y++) for (let x = 9; x <= 11; x++) S.elevC[idxC(x, y)] = 0; // ...except a dip where the tee lands
    const benchCorners = [idxC(14, 9), idxC(15, 9), idxC(14, 10), idxC(15, 10)];
    const before = benchCorners.map((c) => S.elevC[c]);

    holeToolTap(9, 9);
    holeToolTap(17, 9);
    expect(S.holes).toHaveLength(1);

    // the flatten ripple has plenty of height difference to want to reach the bench,
    // but must stop at its pinned corners instead of tilting the ground under it
    expect(benchCorners.map((c) => S.elevC[c])).toEqual(before);
  });
});

describe('save / load round-trip', () => {
  beforeEach(() => {
    (globalThis as { localStorage?: Storage }).localStorage = (() => {
      const store = new Map<string, string>();
      return {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
        clear: () => store.clear(),
        key: () => null,
        get length() {
          return store.size;
        },
      } as Storage;
    })();

    S.sandbox = false;
    S.cash = 12_345;
    S.time = 410;
    S.courseName = 'Home Course';
    S.theme = 'tropical';
    S.propertyId = 'fiji-lagoon';
    S.propertiesPurchased = ['fiji-lagoon'];
    S.careerProgress = { version: 1, earningsProgressionVersion: 1, bestReputation: 4.2, lifetimeOperatingEarnings: 12_345, tournamentHosted: false, sgaTop100Earned: true, sgaTop18Earned: false };
    S.themePackId = 'neighborhood-nine';
    S.themeCourseId = 'garden-loop';
    S.difficulty = 'difficult';
    S.fee = 27;
    S.rep = 3.4;
    S.rot = 2;
    S.tiles = new Uint8Array(W * H);
    S.tiles.fill(Tile.ROUGH);
    S.elevC = new Uint8Array((W + 1) * (H + 1));
    S.owned = new Uint8Array(PW * PH);
    S.owned.fill(1);
    const hole: Hole = {
      id: 1,
      tee: { x: 5.5, y: 5.5 },
      cup: { x: 15.5, y: 5.5 },
      par: 4,
      teeTiles: ['5,5'],
      greenTiles: ['15,5'],
      beauty: 0.4,
      interest: 0.5,
    };
    S.holes = [hole];
    S.buildings = [
      { id: 10, kind: 'proshop', x: 20, y: 20, w: 3, h: 2, open: true, level: 3, branch: 'prestige' },
      { id: 11, kind: 'hotel', x: 25, y: 20, w: 4, h: 3, open: true, level: 1, upgrade: { targetLevel: 2, branch: 'service', remaining: 7, duration: 14 } },
    ];
    S.employees = [];
    S.golfers = [];
    S.regulars = [{
      name: 'Ada Member', shirt: '#fff', skin: '#dba276', cap: '#333', length: .6, accuracy: .7, imagination: .8,
      visits: 12, streak: 3, lastVisit: 400, holesPlayed: 88, lifetimeSpend: 4200,
      training: { progress: { length: 25, accuracy: 50, imagination: 75 }, gained: { length: 2, accuracy: 3, imagination: 4 }, holes: 16 },
      membership: { tier: 'lifetime', sinceYear: 1, lastRenewedYear: 2, paid: 2400 },
    }];
    S.financeLedger = [
      { id: 1, time: 0, year: 1, amount: 10_000, category: 'capital', detail: 'Balance brought forward' },
      { id: 2, time: 410, year: 2, amount: 2345, category: 'greenFees', detail: 'Hole fees' },
    ];
    S.proProfile = createResidentPro();
    S.proProfile.name = 'Ada Irons';
    S.retiredCourses = [];
    S.championshipHistory = [];
    S.activeChampionship = null;
    S.proChallengeOffer = null;
    S.proChallengeCooldown = 75;
    S.activeProChallenge = null;
    S.proChallengeHistory = [];
    S.specialVisitors = {
      pickyCooldown: 12,
      ivanaCooldown: 34,
      pickyVisits: 2,
      ivanaVisits: 1,
      landmarkDonated: true,
      landmarkCredits: 1,
      landPurchased: true,
      landOffer: { id: 7, parcelIndices: [], price: 3500, remaining: 44 },
    };
    S.goalsAchieved = { rep3: true };
    S.tournamentHostedEver = true;
    S.comments = [{ id: 1, time: 12, name: 'Big Earl', txt: 'Frame that scorecard!', cls: 'money' }];
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as { localStorage?: Storage }).localStorage;
  });

  it('restores cash, fee, reputation, rotation, holes, and goal flags after a save/load cycle', () => {
    saveGame();

    S.cash = 0;
    S.fee = 0;
    S.rep = 0;
    S.difficulty = 'easy';
    S.rot = 0;
    S.holes = [];
    S.buildings = [];
    S.goalsAchieved = {};
    S.tournamentHostedEver = false;
    S.comments = [];
    S.proProfile.name = 'Mutated Pro';
    S.careerProgress = { version: 1, bestReputation: 2.5, tournamentHosted: false, sgaTop100Earned: false, sgaTop18Earned: false };

    const resumed = loadGame();

    expect(resumed).toBe(true);
    expect(S.cash).toBe(12_345);
    expect(S.propertyId).toBe('fiji-lagoon');
    expect(S.themePackId).toBe('neighborhood-nine');
    expect(S.themeCourseId).toBe('garden-loop');
    expect(S.fee).toBe(27);
    expect(S.rep).toBe(3.4);
    expect(S.difficulty).toBe('difficult');
    expect(S.rot).toBe(2);
    expect(S.holes).toHaveLength(1);
    expect(S.holes[0].par).toBe(4);
    expect(S.buildings).toHaveLength(2);
    expect(S.buildings[0].level).toBe(3);
    expect(S.buildings[0].branch).toBe('prestige');
    expect(S.buildings[1].upgrade).toEqual({ targetLevel: 2, branch: 'service', remaining: 7, duration: 14 });
    expect(S.goalsAchieved.rep3).toBe(true);
    expect(S.tournamentHostedEver).toBe(true);
    expect(S.comments).toHaveLength(1);
    expect(S.comments[0].txt).toBe('Frame that scorecard!');
    expect(S.proProfile.name).toBe('Ada Irons');
    expect(S.careerProgress).toEqual({ version: 1, earningsProgressionVersion: 1, bestReputation: 4.2, lifetimeOperatingEarnings: 12_345, tournamentHosted: true, sgaTop100Earned: true, sgaTop18Earned: false });
    expect(JSON.parse(localStorage.getItem('fairway-mogul-profile-v1')!).version).toBe(3);
    expect(S.specialVisitors.landmarkDonated).toBe(true);
    expect(S.specialVisitors.landmarkCredits).toBe(1);
    expect(S.specialVisitors.landPurchased).toBe(true);
    expect(S.specialVisitors.pickyVisits).toBe(2);
    expect(S.time).toBe(410);
    expect(S.financeLedger).toHaveLength(2);
    expect(S.financeLedger[1]).toMatchObject({ year: 2, amount: 2345, category: 'greenFees' });
    expect(S.regulars[0].membership).toMatchObject({ tier: 'lifetime', paid: 2400 });
    expect(S.regulars[0].lifetimeSpend).toBe(4200);
    expect(S.regulars[0].training).toEqual({ progress: { length: 25, accuracy: 50, imagination: 75 }, gained: { length: 2, accuracy: 3, imagination: 4 }, holes: 16 });
  });

  it('repairs one saved official guest without losing round state and strips unsafe duplicate markers', () => {
    const savedGolfer = (name: string, x: number, marker: unknown): Golfer => ({
      name,
      skill: .12,
      length: .21,
      accuracy: .31,
      imagination: .41,
      shirt: '#010203',
      skin: '#040506',
      cap: '#070809',
      x,
      y: 8.75,
      tx: 9.5,
      ty: 10.5,
      phase: 2.5,
      state: 'leave',
      t: .4,
      holeIdx: 0,
      strokes: 3,
      mood: 1.25,
      ball: { x: 12.25, y: 7.5 },
      lie: 'fair',
      chatCd: 2,
      scenicSaid: true,
      energy: .44,
      hunger: .55,
      thirst: .66,
      specialGuest: marker,
    } as unknown as Golfer);

    S.golfers = [
      savedGolfer('Edited official', 11.25, 'picky'),
      savedGolfer('Duplicate official', 12.25, 'picky'),
      savedGolfer('Invalid marker golfer', 13.25, 'not-a-guest'),
    ];
    saveGame();
    S.golfers = [];

    expect(loadGame()).toBe(true);
    expect(S.golfers).toHaveLength(3);

    const [official, duplicate, invalid] = S.golfers;
    const picky = SPECIAL_GUESTS.picky;
    expect(official).toMatchObject({
      specialGuest: 'picky',
      name: picky.name,
      skill: picky.skill,
      length: picky.skill,
      accuracy: picky.skill,
      imagination: picky.skill,
      shirt: picky.visual.shirt,
      skin: picky.visual.skin,
      cap: picky.visual.cap,
      x: 11.25,
      y: 8.75,
      holeIdx: 0,
      strokes: 3,
      mood: 1.25,
      ball: { x: 12.25, y: 7.5 },
      energy: .44,
      hunger: .55,
      thirst: .66,
    });
    expect(duplicate.name).toBe('Duplicate official');
    expect(duplicate.specialGuest).toBeUndefined();
    expect(duplicate.x).toBe(12.25);
    expect(invalid.name).toBe('Invalid marker golfer');
    expect(invalid.specialGuest).toBeUndefined();
    expect(invalid.x).toBe(13.25);
    expect(S.golfers.filter((golfer) => golfer.specialGuest)).toHaveLength(1);
  });

  it('preserves queued tee groups on load while grandfathering active over-cap groups', () => {
    S.holes[0].par = 3;
    const savedGolfer = (name: string, state: Golfer['state'], ball: Golfer['ball']): Golfer => ({
      name, skill: .5, shirt: '#fff', skin: '#dba276', cap: '#333',
      x: 5.5, y: 5.5, tx: 5.5, ty: 5.5, phase: 0, state, t: 10,
      holeIdx: 0, strokes: 1, mood: 0, ball, lie: ball ? 'tee' : 'rough',
      chatCd: 0, scenicSaid: false, energy: 1, hunger: 1, thirst: 1,
    });
    S.golfers = [
      savedGolfer('Grandfathered one', 'preshot', { x: 5.5, y: 5.5 }),
      savedGolfer('Grandfathered two', 'watch', { x: 5.5, y: 5.5 }),
      savedGolfer('Queued', 'waitTee', null),
    ];

    saveGame();
    S.golfers = [];
    expect(loadGame()).toBe(true);

    expect(S.golfers.slice(0, 2).map((golfer) => golfer.state)).toEqual(['toBall', 'toBall']);
    expect(S.golfers[2].state).toBe('waitTee');
    expect(S.golfers[2].ball).toBeNull();
  });

  it('restores a completed golfer who is still leaving with holeIdx equal to the course length', () => {
    S.golfers = [{
      name: 'Ada Member', skill: .7, shirt: '#fff', skin: '#dba276', cap: '#333',
      x: 12.5, y: 12.5, tx: 2.5, ty: 2.5, phase: 0, state: 'leave', t: 0,
      holeIdx: S.holes.length, strokes: 0, mood: 3, ball: null, lie: 'rough',
      chatCd: 0, scenicSaid: false, energy: 1, hunger: 1, thirst: 1,
    }];

    saveGame();
    S.golfers = [];
    expect(loadGame()).toBe(true);

    expect(S.golfers).toHaveLength(1);
    expect(S.golfers[0]).toMatchObject({ name: 'Ada Member', state: 'leave', holeIdx: S.holes.length });
  });

  it('spawns an official entirely from the registry and gives the arrival ticker the same identity', () => {
    S.speed = 1;
    S.player = null;
    S.balls = [];
    S.golfers = [];
    S.nextGolfer = 999;
    S.nextStoryCheck = 999;
    S.owned.fill(1);
    S.owned[1] = 0;
    S.specialVisitors = {
      pickyCooldown: 0,
      ivanaCooldown: 9999,
      pickyVisits: 0,
      ivanaVisits: 0,
      landmarkDonated: false,
      landmarkCredits: 0,
      landPurchased: false,
      landOffer: null,
    };
    ui.set({ tickers: [] });
    const tickerSpy = vi.spyOn(ui, 'ticker');

    update(.05);

    const guest = SPECIAL_GUESTS.picky;
    expect(S.golfers).toHaveLength(1);
    expect(S.golfers[0]).toMatchObject({
      specialGuest: guest.kind,
      name: guest.name,
      skill: guest.skill,
      length: guest.skill,
      accuracy: guest.skill,
      imagination: guest.skill,
      shirt: guest.visual.shirt,
      skin: guest.visual.skin,
      cap: guest.visual.cap,
    });
    const arrival = tickerSpy.mock.calls.find(([name]) => name === guest.name);
    expect(arrival).toEqual([
      guest.name,
      `${guest.title} has arrived for an official round. Make an impression.`,
      'money',
      specialGuestPortrait('picky'),
    ]);
    tickerSpy.mockRestore();
  });

  it('preserves a full legacy ledger floor when the next live revenue entry arrives', () => {
    S.sandbox = false;
    S.speed = 1;
    S.golfers = [];
    S.nextGolfer = 999;
    S.buildings = [{ id: 99, kind: 'buildinglot', x: 10, y: 10, w: 2, h: 2, open: true, stage: 2 }];
    S.careerProgress = { version: 1, earningsProgressionVersion: 1, bestReputation: 2.5, tournamentHosted: false, sgaTop100Earned: false, sgaTop18Earned: false };
    S.financeLedger = Array.from({ length: 600 }, (_, index) => ({
      id: index + 1,
      time: index,
      year: 1,
      amount: 1,
      category: 'greenFees' as const,
      detail: `Legacy fee ${index}`,
    }));
    const beforeFloor = operatingEarningsFromLedger(S.financeLedger);
    const beforeCash = S.cash;

    update(10);

    const liveRevenue = S.cash - beforeCash;
    expect(liveRevenue).toBeGreaterThan(0);
    expect(S.financeLedger).toHaveLength(600);
    expect(S.careerProgress.lifetimeOperatingEarnings).toBe(beforeFloor + liveRevenue);
  });

  it('migrates all career resort ledgers once and excludes sandbox revenue', () => {
    S.sandbox = false;
    S.propertyId = 'maple-crossing';
    S.propertiesPurchased = [];
    S.cash = 0;
    S.careerProgress = { version: 1, bestReputation: 2.5, tournamentHosted: false, sgaTop100Earned: false, sgaTop18Earned: false };
    S.proProfile = createResidentPro();
    const record = (id: string, kind: ResortRecord['kind'], amount: number): ResortRecord => ({
      id,
      propertyId: 'maple-crossing',
      kind,
      updatedAt: 1,
      summary: { courseName: id, cash: 0, rep: 2.5, holes: 0, theme: 'parklands' },
      snapshot: {
        v: 2,
        propertyId: 'maple-crossing',
        courseName: id,
        cash: 0,
        rep: 2.5,
        holes: [],
        theme: 'parklands',
        tiles: Array.from({ length: W * H }, () => Tile.ROUGH),
        sandbox: kind === 'sandbox',
        financeLedger: [{ id: 1, time: 0, year: 1, amount, category: 'greenFees', detail: id }],
      },
    });

    expect(migrateLegacyCareerRevenue([record('one', 'career', 1_200), record('two', 'career', 1_800), record('free', 'sandbox', 99_000)])).toBe(true);
    expect(S.careerProgress).toMatchObject({ earningsProgressionVersion: 1, lifetimeOperatingEarnings: 3_000 });
    expect(migrateLegacyCareerRevenue([record('later', 'career', 50_000)])).toBe(false);
    expect(S.careerProgress.lifetimeOperatingEarnings).toBe(3_000);
  });

  it('grandfathers legacy deed eligibility at the former cash boundary', () => {
    S.sandbox = false;
    S.cash = 5_500;
    S.propertyId = 'maple-crossing';
    S.propertiesPurchased = [];
    S.rep = 3;
    S.careerProgress = { version: 1, bestReputation: 3, tournamentHosted: false, sgaTop100Earned: false, sgaTop18Earned: false };
    S.proProfile = createResidentPro();
    S.proProfile.fame = 25;

    expect(migrateLegacyCareerRevenue()).toBe(true);
    expect(S.careerProgress.lifetimeOperatingEarnings).toBe(4_000);
    expect(S.careerProgress.releasedProperties).toEqual(expect.arrayContaining(['atacama-wash', 'fiji-lagoon']));
  });

  it('persists the one-time migration marker when loading a legacy profile', () => {
    S.propertyId = 'maple-crossing';
    S.propertiesPurchased = ['maple-crossing'];
    S.cash = 5_500;
    S.rep = 3;
    S.proProfile.fame = 25;
    saveGame();
    const profile = JSON.parse(localStorage.getItem('fairway-mogul-profile-v1')!);
    delete profile.careerProgress.earningsProgressionVersion;
    delete profile.careerProgress.lifetimeOperatingEarnings;
    profile.careerProgress.bestReputation = 3;
    profile.proProfile.fame = 25;
    localStorage.setItem('fairway-mogul-profile-v1', JSON.stringify(profile));

    expect(loadGame()).toBe(true);

    const migrated = JSON.parse(localStorage.getItem('fairway-mogul-profile-v1')!).careerProgress;
    expect(migrated).toMatchObject({ earningsProgressionVersion: 1, lifetimeOperatingEarnings: 4_000 });
    expect(migrated.releasedProperties).toEqual(expect.arrayContaining(['atacama-wash', 'fiji-lagoon']));
  });

  it('migrates a surviving legacy course when its separate profile is missing', () => {
    S.propertyId = 'maple-crossing';
    S.propertiesPurchased = ['maple-crossing'];
    S.cash = 4_500;
    S.rep = 3;
    saveGame();
    localStorage.removeItem('fairway-mogul-profile-v1');
    // Simulate a fresh page runtime, whose default state already carries the
    // current marker before the legacy course is discovered.
    S.careerProgress = { version: 1, earningsProgressionVersion: 1, bestReputation: 2.5, tournamentHosted: false, sgaTop100Earned: false, sgaTop18Earned: false };
    S.proProfile = createResidentPro();
    S.propertiesPurchased = [];

    expect(loadGame()).toBe(true);

    const migrated = JSON.parse(localStorage.getItem('fairway-mogul-profile-v1')!).careerProgress;
    expect(migrated).toMatchObject({ earningsProgressionVersion: 1, lifetimeOperatingEarnings: 2_500 });
    expect(migrated.releasedProperties).toContain('atacama-wash');
  });

  it('uses the normal development fund and no current deed when migrating from Sandbox', () => {
    S.sandbox = true;
    S.cash = 5_000_000;
    S.propertyId = 'seychelles-crown';
    S.propertiesPurchased = [];
    S.careerProgress = { version: 1, bestReputation: 5, tournamentHosted: true, sgaTop100Earned: true, sgaTop18Earned: true };
    S.proProfile = createResidentPro();
    Object.assign(S.proProfile, { fame: 300, starts: 1, podiums: 1, wins: 1 });

    expect(migrateLegacyCareerRevenue()).toBe(true);

    expect(S.careerProgress.lifetimeOperatingEarnings).toBe(75_000);
    expect(S.careerProgress.releasedProperties).toContain('hebridean-reach');
    expect(S.careerProgress.releasedProperties).not.toContain('seychelles-crown');
  });

  it('round-trips bridge backing types, connectivity, and bulldozer restoration', () => {
    S.tiles[idx(2, 5)] = Tile.BRIDGE_WATER;
    S.tiles[idx(2, 6)] = Tile.BRIDGE_STREAM;
    S.tiles[idx(2, 7)] = Tile.PATH;
    saveGame();
    S.tiles.fill(Tile.ROUGH);

    expect(loadGame()).toBe(true);
    expect(S.tiles[idx(2, 5)]).toBe(Tile.BRIDGE_WATER);
    expect(S.tiles[idx(2, 6)]).toBe(Tile.BRIDGE_STREAM);
    expect(caches.pathConnected).toEqual(new Set(['2,5', '2,6', '2,7']));

    S.tool = 'dozer';
    beginPaintStroke();
    paintAt(2.2, 5.2);
    beginPaintStroke();
    paintAt(2.2, 6.2);
    expect(S.tiles[idx(2, 5)]).toBe(Tile.WATER);
    expect(S.tiles[idx(2, 6)]).toBe(Tile.STREAM);
  });

  it('immediately replaces the active autosave after loading a named slot', () => {
    saveToSlot('A', 'Before renovation');
    S.cash = 17;
    saveGame();

    expect(loadFromSlot('A')).toBe(true);
    expect(S.cash).toBe(12_345);
    expect(JSON.parse(localStorage.getItem('fairway-mogul-save-v1')!).cash).toBe(12_345);
  });

  it('rejects a save whose tile-array size no longer matches the current map', () => {
    saveGame();
    const raw = JSON.parse(localStorage.getItem('fairway-mogul-save-v1')!);
    raw.tiles = raw.tiles.slice(0, 10); // simulate an old save from a different map size
    localStorage.setItem('fairway-mogul-save-v1', JSON.stringify(raw));

    S.cash = 999;
    const resumed = loadGame();

    expect(resumed).toBe(false);
    expect(S.cash).toBe(999); // untouched — loadGame bailed before overwriting anything
  });

  it('migrates a propertyless save to the starter deed for its terrain theme', () => {
    saveGame();
    const raw = JSON.parse(localStorage.getItem('fairway-mogul-save-v1')!);
    delete raw.propertyId;
    raw.theme = 'desert';
    localStorage.setItem('fairway-mogul-save-v1', JSON.stringify(raw));

    expect(loadGame()).toBe(true);
    expect(S.propertyId).toBe('red-mesa');
    expect(S.propertiesPurchased).toContain('red-mesa');
    expect(JSON.parse(localStorage.getItem('fairway-mogul-profile-v1')!).propertiesPurchased).toContain('red-mesa');
  });

  it('persists a live SGA pro-challenge offer with the course', () => {
    S.proChallengeOffer = createProChallengeOffer(4, 4);
    saveGame();
    const opponent = S.proChallengeOffer.opponent.name;
    S.proChallengeOffer = null;

    expect(loadGame()).toBe(true);
    const restored = S.proChallengeOffer as ProChallengeOffer | null;
    expect(restored?.opponent.name).toBe(opponent);
    expect(restored?.wagerPerHole).toBeGreaterThan(0);
  });

  it('restores the home course after abandoning an isolated online competition round', () => {
    const event = JSON.parse(exportSaveText());
    event.courseName = 'Daily Test Course';
    event.cash = 0;
    event.holes[0].par = 3;

    expect(startCompetitionRound(event, 'daily', 'daily-2099-01-01')).toBe(true);
    expect(S.courseName).toBe('Daily Test Course');
    expect(S.player).toMatchObject({ source: 'daily', competitionId: 'daily-2099-01-01' });
    saveGame();
    expect(JSON.parse(localStorage.getItem('fairway-mogul-save-v1')!).courseName).toBe('Home Course');

    quitRound();

    expect(S.courseName).toBe('Home Course');
    expect(S.cash).toBe(12_345);
    expect(S.holes[0].par).toBe(4);
    expect(S.player).toBeNull();
  });

  it('labels a head-to-head card with its challenge and restores the home course', () => {
    const event = JSON.parse(exportSaveText());
    event.courseName = 'Rival Course';

    expect(startChallengeRound(event, 'challenge-123')).toBe(true);
    expect(S.player).toMatchObject({ source: 'challenge', challengeId: 'challenge-123' });
    quitRound();

    expect(S.courseName).toBe('Home Course');
    expect(S.player).toBeNull();
  });

  it('retires a course, starts an isolated championship with the saved pro, and restores home on quit', () => {
    S.courseName = 'Retired Links';
    const retired = retireCourseForChampionship();
    expect(retired).not.toBeNull();
    S.courseName = 'Working Home';
    S.cash = 22_222;

    expect(startChampionshipRound(retired!.id, 'difficult', true)).toBe(true);
    expect(S.courseName).toBe('Retired Links');
    expect(S.activeChampionship).toMatchObject({ difficulty: 'difficult', usesResidentPro: true });
    expect(S.player).toMatchObject({ source: 'tournament', localEvent: 'championship' });

    quitRound();
    expect(S.courseName).toBe('Working Home');
    expect(S.cash).toBe(22_222);
    expect(S.activeChampionship).toBeNull();
  });

  it('credits a completed championship prize to the restored home resort and finance ledger', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    S.courseName = 'Prize Links';
    const retired = retireCourseForChampionship()!;
    S.courseName = 'Working Home';
    S.cash = 22_222;
    const startsBefore = S.proProfile.starts;

    expect(startChampionshipRound(retired.id, 'difficult', true)).toBe(true);
    const cup = S.holes[0].cup;
    S.player!.ball = { x: cup.x - 0.2, y: cup.y };
    S.player!.lie = 'green';
    playerFire(1, 0, 0.02);
    update(5);

    expect(S.player).toBeNull();
    expect(S.courseName).toBe('Working Home');
    const result = S.championshipHistory[0];
    expect(result.prize).toBeGreaterThan(0);
    expect(S.cash).toBe(22_222 + result.prize);
    expect(S.financeLedger).toContainEqual(expect.objectContaining({ category: 'tournament', amount: result.prize, detail: `${result.title} prize` }));
    expect(S.proProfile.starts).toBe(startsBefore + 1);
    expect(S.proProfile.careerEarnings).toBe(result.prize);
    expect(S.roundHistory.at(-1)?.payout).toBe(result.prize);
    random.mockRestore();
  });

  it('turns a completed owner round into persistent, visible resident-pro practice', () => {
    const roundsBefore = S.proProfile.practiceRounds;
    startRound();
    const cup = S.holes[0].cup;
    S.player!.ball = { x: cup.x - 0.2, y: cup.y };
    S.player!.lie = 'green';

    playerFire(1, 0, 0.02);
    update(5);

    expect(S.player).toBeNull();
    expect(S.proProfile.practiceRounds).toBe(roundsBefore + 1);
    expect(S.proProfile.practice.accuratePutter).toBeGreaterThan(0);
    expect(ui.get().modal).toMatchObject({
      kind: 'round',
      practice: {
        practiceRound: roundsBefore + 1,
        facilities: ['Pro Shop'],
        gains: expect.arrayContaining([expect.objectContaining({ id: 'accuratePutter', earned: 5 })]),
      },
    });
  });

  it('makes allocated power and driving skills change the shared shot-distance math', () => {
    S.proProfile.skills.powerHitter = 0;
    S.proProfile.skills.longDriver = 0;
    const base = playerIntendedDistance('tee', 'driver', 1);
    S.proProfile.skills.powerHitter = 10;
    S.proProfile.skills.longDriver = 10;
    expect(playerIntendedDistance('tee', 'driver', 1)).toBeGreaterThan(base * 1.25);
  });

  it('gives every club a distinct lie-aware strategic profile', () => {
    expect(playerIntendedDistance('tee', 'driver', 1)).toBeGreaterThan(playerIntendedDistance('tee', 'threeWood', 1));
    expect(playerIntendedDistance('tee', 'threeWood', 1)).toBeGreaterThan(playerIntendedDistance('tee', 'fiveWood', 1));
    expect(playerIntendedDistance('tee', 'fiveWood', 1)).toBeGreaterThan(playerIntendedDistance('tee', 'lobWedge', 1));

    const driver = clubLieProfile('tee', 'driver');
    const threeWood = clubLieProfile('tee', 'threeWood');
    const fiveWood = clubLieProfile('tee', 'fiveWood');
    const lobWedge = clubLieProfile('tee', 'lobWedge');
    expect(driver.launchMultiplier).toBeLessThan(threeWood.launchMultiplier);
    expect(threeWood.launchMultiplier).toBeLessThan(fiveWood.launchMultiplier);
    expect(fiveWood.launchMultiplier).toBeLessThan(lobWedge.launchMultiplier);
    expect(driver.rolloutMultiplier).toBeGreaterThan(threeWood.rolloutMultiplier);
    expect(threeWood.rolloutMultiplier).toBeGreaterThan(fiveWood.rolloutMultiplier);
    expect(fiveWood.rolloutMultiplier).toBeGreaterThan(lobWedge.rolloutMultiplier);

    for (const lie of SEVERE_RECOVERY_LIES) {
      expect(clubLieProfile(lie, 'driver')).toMatchObject({ available: false });
      expect(clubLieProfile(lie, 'threeWood')).toMatchObject({ available: false });
      expect(clubLieProfile(lie, 'fiveWood')).toMatchObject({ available: false });
      expect(clubLieProfile(lie, 'lobWedge')).toMatchObject({ available: true });
    }
    expect(clubLieProfile('pot', 'driver').reason).toContain('pot bunker');
    expect(clubLieProfile('rough', 'driver')).toMatchObject({ available: true });
    expect(fallbackClubForLie('sand', 'driver')).toBe('lobWedge');

    const legacyIron = clubLieProfile('sand', 'iron');
    expect(lobWedge.carryMultiplier).toBeGreaterThan(legacyIron.carryMultiplier);
    expect(clubLieProfile('sand', 'lobWedge').dispersionMultiplier).toBeLessThan(legacyIron.dispersionMultiplier);
  });

  it('uses the same club-aware dispersion model across the original four-club bag', () => {
    const driver = playerShotDispersion('tee', 'driver', 'straight', 6);
    const threeWood = playerShotDispersion('tee', 'threeWood', 'straight', 6);
    const fiveWood = playerShotDispersion('tee', 'fiveWood', 'straight', 6);
    const lobWedge = playerShotDispersion('tee', 'lobWedge', 'straight', 6);
    expect(driver.angularScale).toBeGreaterThan(threeWood.angularScale);
    expect(threeWood.angularScale).toBeGreaterThan(fiveWood.angularScale);
    expect(fiveWood.angularScale).toBeGreaterThan(lobWedge.angularScale);
    expect(driver.lateral).toBeGreaterThan(threeWood.lateral);
    expect(threeWood.lateral).toBeGreaterThan(fiveWood.lateral);
    expect(fiveWood.lateral).toBeGreaterThan(lobWedge.lateral);
    expect(playerShotDispersion('tee', 'fiveWood', 'punch', 6).angularScale).toBeLessThan(fiveWood.angularScale);
  });

  it('rejects Driver from a severe recovery lie without charging a stroke and falls back to Lob Wedge', () => {
    startRound();
    S.player!.lie = 'sand';
    S.player!.club = 'iron';
    expect(setClub('driver')).toBe(false);
    expect(S.player!.club).toBe('iron');

    S.player!.club = 'driver'; // simulate a stale selection from an older save
    S.player!.aim = { on: true, sx: 0, sy: 0, cx: 0, cy: 0, kind: 'keyboard', worldDirX: 1, worldDirY: 0, worldPower: 0.5 };
    playerFire(1, 0, 0.5);
    expect(S.player!.club).toBe('lobWedge');
    expect(S.player!.aim).toBeNull();
    expect(S.player!.strokes).toBe(0);
    expect(S.balls.filter((ball) => ball.owner === 'P')).toHaveLength(0);
    quitRound();
  });

  it('publishes club availability, role, and carry-to-finish forecast through the live HUD', () => {
    startRound();
    S.wind.speed = 0;
    S.weather = { ...CLEAR_WEATHER };
    S.player!.aim = { on: true, sx: 0, sy: 0, cx: 0, cy: 0, kind: 'keyboard', worldDirX: 1, worldDirY: 0, worldPower: 0.5 };
    updatePlayHud();
    const teeHud = ui.get().playHud!;
    expect(teeHud.clubOptions.driver).toMatchObject({ available: true, role: 'Low · runs' });
    expect(teeHud.clubOptions.threeWood).toMatchObject({ available: true, role: 'Low-mid · long' });
    expect(teeHud.clubOptions.fiveWood).toMatchObject({ available: true, role: 'Mid · accurate' });
    expect(teeHud.clubOptions.lobWedge).toMatchObject({ available: true, role: 'Very high · stops' });
    expect(teeHud.finishDistance).toBeGreaterThan(teeHud.carry!);

    S.player!.lie = 'pot';
    S.player!.club = 'lobWedge';
    updatePlayHud();
    const recoveryHud = ui.get().playHud!;
    expect(recoveryHud.clubOptions.driver.available).toBe(false);
    expect(recoveryHud.clubOptions.driver.reason).toContain('pot bunker');
    expect(recoveryHud.selectedRole).toBe('Very high · stops');
    quitRound();
  });

  it('publishes ideal-line tree risk and the deterministic resting finish through the live HUD', () => {
    S.theme = 'parklands';
    S.holes = [{ id: 98, tee: { x: 5.5, y: 5.5 }, cup: { x: 30.5, y: 5.5 }, par: 5, teeTiles: [], greenTiles: [], beauty: 1, interest: 1 }];
    S.tiles.fill(Tile.FAIR);
    S.tiles[idx(8, 5)] = Tile.TREE;
    S.elevC.fill(0);
    rebuildStatics();
    startRound();
    S.wind = { dx: 1, dy: 0, speed: 0 };
    setClub('driver');
    setShape('straight');
    S.player!.aim = { on: true, sx: 0, sy: 0, cx: 0, cy: 0, kind: 'keyboard', worldDirX: 1, worldDirY: 0, worldPower: 1 };
    const start = { ...S.player!.ball! };
    const forecast = playerShotForecast(start, 'tee', 'driver', 'straight', 1, 0, 1, S.wind);

    updatePlayHud();
    const keyboardHud = ui.get().playHud!;
    expect(forecast.restingPoint).not.toBeNull();
    expect(keyboardHud.canopyStatus).toBe(forecast.canopyStatus);
    expect(keyboardHud.canopyLabel).toMatch(/risk$/);
    expect(keyboardHud.canopyAdvice).toContain('Ideal line');
    expect(keyboardHud.canopyAdvice).toContain('dispersion may miss');
    expect(keyboardHud.rollout).toBeNull();
    expect(keyboardHud.finishDistance).toBeCloseTo(Math.hypot(forecast.restingPoint!.x - start.x, forecast.restingPoint!.y - start.y), 10);
    expect(keyboardHud.coach).toContain(keyboardHud.canopyLabel!);

    S.rot = 0;
    S.cam = { x: 100, y: 80, z: 1 };
    const screenStart = P(start.x, start.y);
    const screenDrag = P(start.x + 9, start.y);
    S.player!.aim = { on: true, sx: screenStart.x, sy: screenStart.y, cx: screenDrag.x, cy: screenDrag.y, kind: 'pointer' };
    updatePlayHud();
    expect(ui.get().playHud!.canopyLabel).toBe(keyboardHud.canopyLabel);
    expect(ui.get().playHud!.coach).not.toContain(keyboardHud.canopyLabel!);
    quitRound();
  });

  it('keeps clear shots and putts free of blocked-risk advice', () => {
    S.holes = [{ id: 99, tee: { x: 5.5, y: 5.5 }, cup: { x: 30.5, y: 5.5 }, par: 5, teeTiles: [], greenTiles: [], beauty: 1, interest: 1 }];
    S.tiles.fill(Tile.FAIR);
    S.elevC.fill(0);
    rebuildStatics();
    startRound();
    S.wind = { dx: 1, dy: 0, speed: 0 };
    S.player!.aim = { on: true, sx: 0, sy: 0, cx: 0, cy: 0, kind: 'keyboard', worldDirX: 1, worldDirY: 0, worldPower: 0.5 };

    updatePlayHud();
    const clearHud = ui.get().playHud!;
    expect(clearHud.canopyStatus).toBe('clear');
    expect(clearHud.canopyLabel).toBe('Canopy clear');
    expect(clearHud.canopyAdvice).toBeNull();
    expect(clearHud.rollout).not.toBeNull();
    expect(clearHud.finishDistance).toBeGreaterThan(clearHud.carry!);
    expect(clearHud.coach).not.toContain('Canopy clear');

    S.player!.ball = { x: 29, y: 5.5 };
    S.player!.lie = 'green';
    updatePlayHud();
    const greenHud = ui.get().playHud!;
    expect(greenHud.canopyStatus).toBeNull();
    expect(greenHud.canopyLabel).toBeNull();
    expect(greenHud.canopyAdvice).toBeNull();
    expect(greenHud.rollout).toBeNull();
    expect(greenHud.finishDistance).toBeCloseTo(greenHud.carry!, 10);
    quitRound();
  });

  it('gives pointer and keyboard aim the same ideal canopy forecast', () => {
    S.tiles.fill(Tile.FAIR);
    S.tiles[idx(8, 5)] = Tile.TREE;
    S.elevC.fill(0);
    S.rot = 0;
    S.cam = { x: 100, y: 80, z: 1 };
    const from = { x: 5.5, y: 5.5 };
    const screenStart = P(from.x, from.y);
    const screenDrag = P(from.x + 4.5, from.y);
    const pointer = playerAimIntent({ on: true, sx: screenStart.x, sy: screenStart.y, cx: screenDrag.x, cy: screenDrag.y, kind: 'pointer' }, 'tee')!;
    const keyboard = playerAimIntent({ on: true, sx: 0, sy: 0, cx: 0, cy: 0, kind: 'keyboard', worldDirX: 1, worldDirY: 0, worldPower: 0.5 }, 'tee')!;
    expect(pointer).toEqual(keyboard);
    expect(playerShotForecast(from, 'tee', 'driver', 'straight', pointer.dirX, pointer.dirY, pointer.power, { dx: 1, dy: 0, speed: 0 }))
      .toEqual(playerShotForecast(from, 'tee', 'driver', 'straight', keyboard.dirX, keyboard.dirY, keyboard.power, { dx: 1, dy: 0, speed: 0 }));
  });

  it('shares one cached current-player forecast and invalidates terrain-safe state', () => {
    S.holes = [{ id: 87, tee: { x: 5.5, y: 5.5 }, cup: { x: 30.5, y: 5.5 }, par: 5, teeTiles: [], greenTiles: [], beauty: 1, interest: 1 }];
    S.tiles.fill(Tile.FAIR);
    S.tiles[idx(8, 5)] = Tile.TREE;
    S.elevC.fill(0);
    rebuildStatics();
    startRound();
    S.wind = { dx: 1, dy: 0, speed: 0 };
    const intent = { dirX: 1, dirY: 0, power: 1 };
    const first = cachedPlayerShotForecast(S.player!, intent)!;
    expect(cachedPlayerShotForecast(S.player!, intent)).toBe(first);
    S.elevC[0] = 1;
    expect(cachedPlayerShotForecast(S.player!, intent)).not.toBe(first);
    const elevated = cachedPlayerShotForecast(S.player!, intent)!;
    rebuildStatics();
    expect(cachedPlayerShotForecast(S.player!, intent)).not.toBe(elevated);
    quitRound();
  });

  it('applies club launch and rollout profiles to real equal-carry shots', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    S.holes = [{ id: 93, tee: { x: 5.5, y: 5.5 }, cup: { x: 30.5, y: 5.5 }, par: 5, teeTiles: [], greenTiles: [], beauty: 1, interest: 1 }];
    S.tiles.fill(Tile.FAIR);
    S.elevC.fill(0);
    const results = {} as Record<'driver' | 'threeWood' | 'fiveWood' | 'lobWedge', { height: number; finish: number }>;

    for (const club of ['driver', 'threeWood', 'fiveWood', 'lobWedge'] as const) {
      startRound();
      S.wind.speed = 0;
      setClub(club);
      const power = 5 / playerIntendedDistance('tee', club, 1);
      const start = { ...S.player!.ball! };
      playerFire(1, 0, power);
      results[club] = { height: S.balls.at(-1)!.h, finish: 0 };
      expect(S.balls.at(-1)!.rollMultiplier).toBe(clubLieProfile('tee', club).rolloutMultiplier);
      update(5);
      update(5);
      results[club].finish = S.player!.ball!.x - start.x;
      quitRound();
    }

    expect(results.driver.height).toBeLessThan(results.threeWood.height);
    expect(results.threeWood.height).toBeLessThan(results.fiveWood.height);
    expect(results.fiveWood.height).toBeLessThan(results.lobWedge.height);
    expect(results.driver.finish).toBeGreaterThan(results.threeWood.finish);
    expect(results.threeWood.finish).toBeGreaterThan(results.fiveWood.finish);
    expect(results.fiveWood.finish).toBeGreaterThan(results.lobWedge.finish);
    random.mockRestore();
  });

  it('makes club height and shaped routing change the ideal canopy forecast', () => {
    S.tiles.fill(Tile.FAIR);
    S.tiles[idx(8, 5)] = Tile.TREE;
    S.elevC.fill(0);
    const from = { x: 5.5, y: 5.5 };
    const calm = { dx: 1, dy: 0, speed: 0 };
    const driver = playerShotForecast(from, 'tee', 'driver', 'straight', 1, 0, 1, calm);
    const wedge = playerShotForecast(from, 'tee', 'wedge', 'straight', 1, 0, 1, calm);
    const hook = playerShotForecast(from, 'tee', 'driver', 'hook', 1, 0, 1, calm);

    expect(driver.canopyStatus).not.toBe('clear');
    expect(wedge.canopyStatus).toBe('clear');
    expect(hook.canopyStatus).toBe('clear');
  });

  it('uses the forecasted curved path for actual Fade, Draw, and Hook impacts', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    for (const shape of ['fade', 'draw', 'hook'] as const) {
      S.holes = [{ id: 95, tee: { x: 5.5, y: 10.5 }, cup: { x: 35.5, y: 10.5 }, par: 5, teeTiles: [], greenTiles: [], beauty: 1, interest: 1 }];
      S.tiles.fill(Tile.FAIR);
      S.elevC.fill(0);
      startRound();
      S.wind = { dx: 1, dy: 0, speed: 0 };
      setClub('driver');
      setShape(shape);
      const start = { ...S.player!.ball! };
      const plan = playerShotPlan(start, 'tee', 'driver', shape, 1, 0, 1, S.wind);
      let tree = playerShotPlanPosition(plan, 0.22);
      for (let t = 0.16; t <= 0.35; t += 0.01) {
        const candidate = playerShotPlanPosition(plan, t);
        if (Math.hypot(candidate.x - (Math.floor(candidate.x) + 0.5), candidate.y - (Math.floor(candidate.y) + 0.5)) < 0.22) {
          tree = candidate;
          break;
        }
      }
      S.tiles[idx(Math.floor(tree.x), Math.floor(tree.y))] = Tile.TREE;
      const forecast = playerShotForecast(start, 'tee', 'driver', shape, 1, 0, 1, S.wind);
      expect(forecast.canopyImpact, shape).not.toBeNull();
      playerFire(1, 0, 1);
      expect(S.balls.at(-1)!.canopyImpact, shape).toEqual(forecast.canopyImpact ?? undefined);
      quitRound();
    }
    random.mockRestore();
  });

  it('applies actual Wedge height and Punch trajectory without collision exemptions', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    S.holes = [{ id: 96, tee: { x: 5.5, y: 5.5 }, cup: { x: 30.5, y: 5.5 }, par: 5, teeTiles: [], greenTiles: [], beauty: 1, interest: 1 }];
    S.tiles.fill(Tile.FAIR);
    S.tiles[idx(8, 5)] = Tile.TREE;
    S.elevC.fill(0);

    startRound();
    S.wind.speed = 0;
    setClub('wedge');
    playerFire(1, 0, 1);
    expect(S.balls.at(-1)!.canopyImpact).toBeUndefined();
    quitRound();

    S.tiles[idx(8, 5)] = Tile.FAIR;
    S.tiles[idx(6, 5)] = Tile.TREE;
    startRound();
    S.wind.speed = 0;
    S.player!.ball = { x: 5.5, y: 5.99 };
    S.player!.lie = 'tee';
    setClub('iron');
    setShape('punch');
    playerFire(1, 0, 1);
    expect(S.balls.at(-1)!.canopyImpact).toBeUndefined();
    quitRound();

    startRound();
    S.wind.speed = 0;
    setClub('iron');
    setShape('punch');
    playerFire(1, 0, 1);
    expect(S.balls.at(-1)!.canopyImpact).toMatchObject({ kind: 'trunk' });
    quitRound();
    random.mockRestore();
  });

  it('uses the actual tapered pine profile and resolves tree before downstream water', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    S.theme = 'links';
    S.holes = [{ id: 97, tee: { x: 4.5, y: 1.5 }, cup: { x: 30.5, y: 1.5 }, par: 5, teeTiles: [], greenTiles: [], beauty: 1, interest: 1 }];
    S.tiles.fill(Tile.FAIR);
    S.tiles[idx(6, 1)] = Tile.TREE;
    S.tiles[idx(16, 1)] = Tile.WATER;
    S.elevC.fill(0);
    startRound();
    S.wind.speed = 0;
    S.weather = { ...CLEAR_WEATHER };
    setClub('iron');
    playerFire(1, 0, 1);
    expect(S.balls.at(-1)!.canopyImpact).toMatchObject({ treeX: 6, treeY: 1, kind: 'pine' });
    update(99);
    expect(S.player!.currentHole!.shots[0]).toMatchObject({ events: ['tree'], penalty: 0, resultLie: 'tree' });
    expect(S.player!.strokes).toBe(1);
    quitRound();
    random.mockRestore();
  });

  it('charges Punch carry in the shared plan instead of granting a free low flight', () => {
    const from = { x: 5.5, y: 5.5 };
    const calm = { dx: 1, dy: 0, speed: 0 };
    const straight = playerShotPlan(from, 'tee', 'iron', 'straight', 1, 0, 1, calm);
    const punch = playerShotPlan(from, 'tee', 'iron', 'punch', 1, 0, 1, calm);
    expect(punch.intend).toBeCloseTo(straight.intend * 0.82, 10);
    expect(punch.targetDistance).toBeCloseTo(punch.intend, 10);
  });

  it('precomputes the same zero-noise canopy impact and resolves it without tunneling, rollout, or penalty', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    S.holes = [{ id: 89, tee: { x: 5.5, y: 5.5 }, cup: { x: 30.5, y: 5.5 }, par: 5, teeTiles: [], greenTiles: [], beauty: 1, interest: 1 }];
    S.tiles.fill(Tile.FAIR);
    S.tiles[idx(8, 5)] = Tile.TREE;
    S.elevC.fill(0);
    startRound();
    S.wind.speed = 0;
    setClub('driver');
    setShape('straight');
    const start = { ...S.player!.ball! };
    const forecast = playerShotForecast(start, 'tee', 'driver', 'straight', 1, 0, 1, S.wind);

    playerFire(1, 0, 1);
    const launched = S.balls.at(-1)!;
    expect(forecast.canopyImpact).not.toBeNull();
    expect(launched.canopyImpact?.t).toBeCloseTo(forecast.canopyImpact!.t, 10);
    expect(launched.canopyImpact?.x).toBeCloseTo(forecast.canopyImpact!.x, 10);
    expect(launched.canopyImpact?.y).toBeCloseTo(forecast.canopyImpact!.y, 10);
    expect(forecast.restingPoint).not.toBeNull();

    update(99); // one large frame cannot tunnel through the sampled obstruction
    const shot = S.player!.currentHole!.shots[0];
    expect(S.player!.strokes).toBe(1);
    expect(shot.events).toContain('tree');
    expect(shot.penalty).toBe(0);
    expect(shot.resultLie).toBe('tree');
    expect(shot.end.x).toBeCloseTo(forecast.restingPoint!.x, 10);
    expect(shot.end.y).toBeCloseTo(forecast.restingPoint!.y, 10);
    expect(shot.end.x).toBeLessThan(forecast.plan.target.x);
    expect(S.player!.currentHole!.hazards).toContain('tree');
    expect(S.player!.club).toBe('lobWedge');
    expect(S.balls.filter((ball) => ball.owner === 'P')).toHaveLength(0);
    quitRound();
    random.mockRestore();
  });

  it('deterministically resolves a descending destination tree for the player', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    S.holes = [{ id: 88, tee: { x: 5.5, y: 5.5 }, cup: { x: 30.5, y: 5.5 }, par: 5, teeTiles: [], greenTiles: [], beauty: 1, interest: 1 }];
    S.tiles.fill(Tile.FAIR);
    S.tiles[idx(17, 5)] = Tile.TREE;
    S.elevC.fill(0);
    startRound();
    S.wind.speed = 0;
    S.weather = { ...CLEAR_WEATHER };
    setClub('iron');
    playerFire(1, 0, 1);
    expect(S.balls.at(-1)!.canopyImpact).toMatchObject({ treeX: 17, treeY: 5 });
    update(5);
    expect(S.player!.currentHole!.shots[0]).toMatchObject({ resultLie: 'tree', events: ['tree'], penalty: 0 });
    quitRound();
    random.mockRestore();
  });

  it('retains legacy random endpoint tree deflection for AI only', () => {
    expect(usesLegacyEndpointTreeDeflection({ owner: 'P', lowFlight: false })).toBe(false);
    expect(usesLegacyEndpointTreeDeflection({ owner: {} as Golfer, lowFlight: false })).toBe(true);
    expect(usesLegacyEndpointTreeDeflection({ owner: {} as Golfer, lowFlight: true })).toBe(false);
  });

  it('automatically selects Lob Wedge after a Driver lands in a severe recovery lie', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    S.holes = [{ id: 90, tee: { x: 5.5, y: 5.5 }, cup: { x: 30.5, y: 5.5 }, par: 5, teeTiles: [], greenTiles: [], beauty: 1, interest: 1 }];
    S.tiles.fill(Tile.SAND);
    S.elevC.fill(0);
    startRound();
    S.wind.speed = 0;
    setClub('driver');
    playerFire(1, 0, 0.25);
    update(5);
    expect(S.player).toMatchObject({ lie: 'sand', club: 'lobWedge', strokes: 1 });
    quitRound();
    random.mockRestore();
  });

  it('curves fade, draw, and the stronger hook to their intended sides', () => {
    const carry = 12;
    expect(shapeCurveOffset('fade', carry, 1)).toBeGreaterThan(0);
    expect(shapeCurveOffset('draw', carry, 1)).toBeLessThan(0);
    expect(shapeCurveOffset('hook', carry, 1)).toBeLessThan(shapeCurveOffset('draw', carry, 1));
    expect(Math.abs(shapeCurveOffset('fade', carry, 0.5))).toBeLessThan(Math.abs(shapeCurveOffset('fade', carry, 1)));
    expect(shapeCurveOffset('straight', carry, 1)).toBe(0);
  });

  it('composes opposite draw and fade curves with the same crosswind while rain changes carry and control', () => {
    const from = { x: 10, y: 10 };
    const crosswind = { dx: 0, dy: 1, speed: 0.4 };
    const rain = { condition: 'rain' as const, intensity: 0.9, wetness: 1 };
    const fade = playerShotPlan(from, 'tee', 'iron', 'fade', 1, 0, 1, crosswind, CLEAR_WEATHER);
    const draw = playerShotPlan(from, 'tee', 'iron', 'draw', 1, 0, 1, crosswind, CLEAR_WEATHER);
    const wetFade = playerShotPlan(from, 'tee', 'iron', 'fade', 1, 0, 1, crosswind, rain);

    expect(fade.target.y).toBeGreaterThan(draw.target.y);
    expect(fade.windPush).toBeCloseTo(draw.windPush, 10);
    expect(wetFade.intend).toBeLessThan(fade.intend);
    expect(playerShotDispersion('tee', 'iron', 'fade', fade.targetDistance, rain).previewRadius)
      .toBeGreaterThan(playerShotDispersion('tee', 'iron', 'fade', fade.targetDistance, CLEAR_WEATHER).previewRadius);
    expect(playerShotDispersion('green', 'iron', 'fade', 4, rain))
      .toEqual(playerShotDispersion('green', 'iron', 'fade', 4, CLEAR_WEATHER));
    expect(playerEstimatedRoll('fair', 'straight', 'iron', rain))
      .toBeLessThan(playerEstimatedRoll('fair', 'straight', 'iron', CLEAR_WEATHER));
    expect(playerEstimatedRoll('fair', 'backspin', 'iron', rain)).toBe(0);
  });

  it('publishes aiming-frame wind displacement and the actual carry, release, and finish result', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    S.tiles.fill(Tile.FAIR);
    S.balls = [];
    S.parts = [];
    startRound();
    S.wind = { dx: 0, dy: 1, speed: 0.5 };
    S.weather = { ...CLEAR_WEATHER };
    setClub('iron');
    setShape('draw');
    S.player!.aim = { on: true, sx: 0, sy: 0, cx: 0, cy: 0, kind: 'keyboard', worldDirX: 1, worldDirY: 0, worldPower: 0.45 };
    updatePlayHud();

    const forecastHud = ui.get().playHud!;
    expect(forecastHud.windAlong).toBeCloseTo(0, 10);
    expect(forecastHud.windCross).toBeGreaterThan(0);
    expect(forecastHud.windDisplacement).toBeCloseTo(forecastHud.windCross!, 10);

    playerFire(1, 0, 0.45);
    for (let step = 0; step < 100 && !ui.get().playHud?.lastShotFeedback; step++) update(0.1);

    const result = ui.get().playHud!.lastShotFeedback!;
    expect(result).toMatchObject({ club: 'iron', shape: 'draw', power: 0.45, resultLie: 'fair', penalty: 0 });
    expect(result.carryDistance).toBeGreaterThan(0);
    expect(result.rollDistance).toBeGreaterThanOrEqual(0);
    expect(result.finishDistance).toBeCloseTo(result.carryDistance + result.rollDistance, 10);
    expect(S.parts.some((particle) => particle.c === '#ffe36e')).toBe(true);
    quitRound();
    random.mockRestore();
  });

  it('clears manual-round rain and wind before autonomous play resumes', () => {
    startRound();
    S.wind = { dx: -0.6, dy: 0.8, speed: 0.72 };
    S.weather = { condition: 'rain', intensity: 0.9, wetness: 1 };

    quitRound();

    expect(S.weather).toEqual(CLEAR_WEATHER);
    expect(S.wind).toEqual({ dx: 1, dy: 0, speed: 0 });
  });

  it('uses one putter dispersion profile independent of hidden full-swing club and shape', () => {
    S.proProfile.skills.drawShot = 0;
    S.proProfile.skills.fadeShot = 0;
    S.proProfile.skills.highBackspin = 0;
    const straight = playerShotSkill('green', 'iron', 'straight');
    expect(playerShotSkill('green', 'iron', 'draw')).toBe(straight);
    expect(playerShotSkill('green', 'iron', 'fade')).toBe(straight);
    expect(playerShotSkill('green', 'iron', 'hook')).toBe(straight);
    expect(playerShotSkill('green', 'iron', 'backspin')).toBe(straight);
    const baseline = playerShotDispersion('green', 'iron', 'straight', 3.5);
    expect(baseline.angularScale).toBe(0.8);
    expect(playerShotDispersion('green', 'driver', 'hook', 3.5)).toEqual(baseline);
    expect(playerShotDispersion('green', 'wedge', 'punch', 3.5)).toEqual(baseline);
  });

  it('launches identical putts when only hidden full-swing club and shape differ', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.75);
    const putt = (club: 'driver' | 'wedge', shape: 'hook' | 'punch') => {
      startRound();
      S.player!.ball = { x: 8, y: 8 };
      S.player!.lie = 'green';
      S.player!.club = club;
      S.player!.shape = shape;
      playerFire(1, 0, 0.4);
      const ball = S.balls.at(-1)!;
      const landing = { x: ball.tx, y: ball.ty };
      quitRound();
      return landing;
    };
    expect(putt('driver', 'hook')).toEqual(putt('wedge', 'punch'));
    random.mockRestore();
  });

  it('uses the complete wind/curve target chord for preview, actual dispersion, and flight apex', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.75);
    S.holes = [{ id: 94, tee: { x: 12, y: 20 }, cup: { x: 40, y: 20 }, par: 5, teeTiles: [], greenTiles: [], beauty: 1, interest: 1 }];
    S.elevC.fill(0);
    startRound();
    S.wind = { dx: 1, dy: 0, speed: 0.5 };
    setClub('iron');
    setShape('hook');
    const start = { ...S.player!.ball! };
    const plan = playerShotPlan(start, 'tee', 'iron', 'hook', 1, 0, 1);
    const calm = playerShotPlan(start, 'tee', 'iron', 'hook', 1, 0, 1, { dx: 1, dy: 0, speed: 0 });
    const headwind = playerShotPlan(start, 'tee', 'iron', 'hook', 1, 0, 1, { dx: -1, dy: 0, speed: 0.5 });
    expect(plan.target.x).toBeGreaterThan(calm.target.x);
    expect(headwind.target.x).toBeLessThan(calm.target.x);
    expect(playerShotPlanPosition(plan, 1)).toEqual(plan.target);
    expect(plan.targetDistance).toBeCloseTo(Math.hypot(plan.target.x - start.x, plan.target.y - start.y), 10);
    expect(plan.targetDistance).toBeGreaterThan(plan.intend);
    const dispersion = playerShotDispersion('tee', 'iron', 'hook', plan.targetDistance);
    expect(dispersion.previewRadius).toBeGreaterThan(playerShotDispersion('tee', 'iron', 'hook', plan.intend).previewRadius);

    const targetAngle = Math.atan2(plan.target.y - start.y, plan.target.x - start.x);
    const expectedAngle = targetAngle + 0.5 * LIE.tee.ang * (Math.PI / 180) * (1.35 - dispersion.skill) * dispersion.angularScale;
    const expectedDistance = plan.targetDistance * (1 + 0.5 * (LIE.tee.dst + (1 - dispersion.skill) * 0.05));

    playerFire(1, 0, 1);
    const ball = S.balls.at(-1)!;
    expect(ball.tx).toBeCloseTo(start.x + Math.cos(expectedAngle) * expectedDistance, 6);
    expect(ball.ty).toBeCloseTo(start.y + Math.sin(expectedAngle) * expectedDistance, 6);
    const heightMultiplier = SHOT_SHAPES.hook.heightMul * clubLieProfile('tee', 'iron').launchMultiplier;
    expect(ball.h).toBeCloseTo(flightApexHeight(plan.targetDistance, heightMultiplier), 10);
    quitRound();
    random.mockRestore();
  });

  it('preserves sub-eight-percent power in the shared short-putt aim intent', () => {
    startRound();
    S.player!.lie = 'green';
    S.rot = 0;
    S.cam = { x: 120, y: 80, z: 1 };
    const start = P(10, 10);
    const current = P(9.73, 10);
    const aim = { on: true, sx: start.x, sy: start.y, cx: current.x, cy: current.y, kind: 'keyboard' as const };
    expect(playerAimIntent(aim, 'green')?.power).toBeCloseTo(0.03, 6);
    expect(playerAimIntent(aim, 'tee')?.power).toBe(0.08);
    S.player!.aim = aim;
    updatePlayHud();
    expect(ui.get().playHud?.power).toBeCloseTo(0.03, 6);
    expect(ui.get().playHud?.coach).toContain('Keyboard aim');
    expect(ui.get().playHud?.coach).toContain('3% power');
    quitRound();
  });

  it('moves the real flying ball along the shaped curve instead of a straight endpoint chord', () => {
    const curveBall = {
      fx: 0, fy: 0, tx: 12, ty: -2.64,
      shotShape: 'draw' as const, curvePerpX: 0, curvePerpY: 1, curveDistance: 12,
    };
    const halfway = ballFlightPosition(curveBall, 0.5);
    const chordY = curveBall.fy + (curveBall.ty - curveBall.fy) * 0.5;
    expect(halfway.y).not.toBeCloseTo(chordY);
    expect(ballFlightPosition(curveBall, 0)).toEqual({ x: 0, y: 0 });
    expect(ballFlightPosition(curveBall, 1)).toEqual({ x: 12, y: -2.64 });
  });

  it('lands a full driver beyond an iron and preserves real power-skill distance gains', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    S.holes = [{ id: 92, tee: { x: 8, y: 8 }, cup: { x: 40, y: 8 }, par: 5, teeTiles: [], greenTiles: [], beauty: 1, interest: 1 }];
    S.elevC.fill(0);
    S.proProfile.skills.powerHitter = 0;
    S.proProfile.skills.longDriver = 0;

    startRound();
    S.wind.speed = 0;
    setClub('iron');
    playerFire(1, 0, 1);
    const ironCarry = Math.hypot(S.balls.at(-1)!.tx - S.balls.at(-1)!.fx, S.balls.at(-1)!.ty - S.balls.at(-1)!.fy);
    quitRound();

    startRound();
    S.wind.speed = 0;
    setClub('driver');
    playerFire(1, 0, 1);
    const baseDriverCarry = Math.hypot(S.balls.at(-1)!.tx - S.balls.at(-1)!.fx, S.balls.at(-1)!.ty - S.balls.at(-1)!.fy);
    quitRound();
    expect(baseDriverCarry).toBeGreaterThan(ironCarry * 1.2);

    S.proProfile.skills.powerHitter = 10;
    S.proProfile.skills.longDriver = 10;
    startRound();
    S.wind.speed = 0;
    setClub('driver');
    playerFire(1, 0, 1);
    const skilledDriverCarry = Math.hypot(S.balls.at(-1)!.tx - S.balls.at(-1)!.fx, S.balls.at(-1)!.ty - S.balls.at(-1)!.fy);
    quitRound();
    expect(skilledDriverCarry).toBeGreaterThan(baseDriverCarry * 1.25);
    random.mockRestore();
  });

  it('uses landing-lie rollout scale and stops backspin instead of scaling roll by carry', () => {
    expect(playerEstimatedRoll('fair', 'straight', 'iron', CLEAR_WEATHER)).toBeCloseTo(0.9);
    expect(playerEstimatedRoll('firmfair', 'straight', 'iron', CLEAR_WEATHER)).toBeCloseTo(1.5);
    expect(playerEstimatedRoll('fair', 'straight', 'driver', CLEAR_WEATHER)).toBeGreaterThan(playerEstimatedRoll('fair', 'straight', 'iron', CLEAR_WEATHER));
    expect(playerEstimatedRoll('fair', 'straight', 'iron', CLEAR_WEATHER)).toBeGreaterThan(playerEstimatedRoll('fair', 'straight', 'wedge', CLEAR_WEATHER));
    expect(playerEstimatedRoll('fair', 'backspin', 'iron', CLEAR_WEATHER)).toBe(0);
  });

  it('puts backspin and punch behavior directly on the launched ball', () => {
    S.holes = [{ id: 91, tee: { x: 5.5, y: 5.5 }, cup: { x: 24.5, y: 5.5 }, par: 4, teeTiles: [], greenTiles: [], beauty: 1, interest: 1 }];
    startRound();
    setShape('backspin');
    playerFire(1, 0, 0.4);
    expect(S.balls.at(-1)).toMatchObject({ noRoll: true, lowFlight: false });
    quitRound();

    startRound();
    setShape('punch');
    playerFire(1, 0, 0.4);
    expect(S.balls.at(-1)).toMatchObject({ noRoll: false, lowFlight: true });
    quitRound();
  });

  it('accepts an affordable touring-pro challenge as a wagered resident-pro round', () => {
    const original = S.holes[0];
    S.holes = [original, { ...original, id: 2, tee: { x: 6, y: 6 }, cup: { x: 17, y: 6 } }, { ...original, id: 3, tee: { x: 7, y: 7 }, cup: { x: 18, y: 7 } }];
    S.proChallengeOffer = createProChallengeOffer(1, 3.5);
    S.cash = 20_000;

    expect(acceptProChallenge()).toBe(true);
    expect(S.player).toMatchObject({ source: 'tournament', localEvent: 'proChallenge' });
    expect(S.activeProChallenge?.opponent.name).toBe('Molly Fairway');
    expect(S.proChallengeOffer).toBeNull();
    quitRound();
    expect(S.activeProChallenge).toBeNull();
  });

  it('issues and expires SGA pro challenges only after the course qualifies', () => {
    const original = S.holes[0];
    S.holes = [original, { ...original, id: 2 }, { ...original, id: 3 }];
    S.rep = 3;
    S.speed = 1;
    S.nextGolfer = 999;
    S.proChallengeCooldown = 0;
    update(.1);
    expect(S.proChallengeOffer).not.toBeNull();
    S.proChallengeOffer!.remaining = .01;
    update(.1);
    expect(S.proChallengeOffer).toBeNull();
    expect(S.proChallengeCooldown).toBe(75);
  });
});

describe('out of bounds', () => {
  const hole = { tee: { x: 10.5, y: 20.5 }, cup: { x: 34.5, y: 20.5 } };

  beforeEach(() => {
    newCourse(true);
    S.tiles.fill(Tile.ROUGH);
  });

  it('widens the corridor with hole length inside hard caps', () => {
    expect(holeCorridorRadius(hole)).toBeCloseTo(24 * 0.33, 6);
    expect(holeCorridorRadius({ tee: { x: 0, y: 0 }, cup: { x: 4, y: 0 } })).toBe(5);
    expect(holeCorridorRadius({ tee: { x: 0, y: 0 }, cup: { x: 90, y: 0 } })).toBe(11);
  });

  it('keeps the corridor playable and rules distant rough out of bounds', () => {
    expect(isOutOfBounds({ x: 20, y: 20.5 }, hole)).toBe(false); // on the ideal line
    expect(isOutOfBounds({ x: 20, y: 27 }, hole)).toBe(false); // rough inside the corridor
    expect(isOutOfBounds({ x: 20.5, y: 32.5 }, hole)).toBe(true); // rough beyond the corridor
    expect(isOutOfBounds({ x: 20.5, y: 60.5 }, hole)).toBe(true); // another part of the course entirely
  });

  it('lets built golf surfaces stretch the corridor for doglegs, but only so far', () => {
    S.tiles[idx(20, 32)] = Tile.FAIR;
    expect(isOutOfBounds({ x: 20.5, y: 32.5 }, hole)).toBe(false); // painted dogleg fairway stays in
    S.tiles[idx(20, 40)] = Tile.FAIR;
    expect(isOutOfBounds({ x: 20.5, y: 40.5 }, hole)).toBe(true); // fairway across the map is still OB
  });

  it('never doubles a water penalty with an OB penalty', () => {
    S.tiles[idx(20, 32)] = Tile.WATER;
    expect(isOutOfBounds({ x: 20.5, y: 32.5 }, hole)).toBe(false);
  });
});

describe('Theme Pack course setup', () => {
  beforeEach(() => {
    (globalThis as { localStorage?: Storage }).localStorage = {
      getItem: () => null, setItem: () => undefined, removeItem: () => undefined, clear: () => undefined, key: () => null, length: 0,
    } as Storage;
  });
  afterEach(() => delete (globalThis as { localStorage?: Storage }).localStorage);

  it('opens a bundled course and seeds its themed cast', () => {
    const profile = S.proProfile;
    newCourse(false, 'moderate', 'parklands', 'neighborhood-nine', 'garden-loop');

    expect(S.courseName).toBe('Garden Loop');
    expect(S.themePackId).toBe('neighborhood-nine');
    expect(S.themeCourseId).toBe('garden-loop');
    expect(S.holes.map((hole) => [hole.tee.x, hole.tee.y, hole.cup.x, hole.cup.y])).toEqual([
      [8, 8, 15.5, 10.5], [18, 14, 25.5, 18.5], [9, 20, 15.5, 16.5],
    ]);
    expect(S.regulars).toHaveLength(24);
    expect(S.regulars.some((regular) => regular.name === 'Mara Maple')).toBe(true);
    expect(S.regulars.filter((regular) => regular.celebrity)).toHaveLength(2);
    expect(S.proProfile).toBe(profile); // course content never overwrites the player's profile
  });

  it('falls back to the one-hole property when no bundled course is selected', () => {
    newCourse(false, 'difficult', 'links', 'storybook-club', null);

    expect(S.courseName).toBe('Donegal Point');
    expect(S.holes).toHaveLength(1);
    expect(S.regulars[0].name).toBe('Big Earl');
  });

  it('opens the Backlot bundled layout without overlapping terrain or holes', () => {
    newCourse(false, 'moderate', 'desert', 'backlot-legends', 'studio-trilogy');

    expect(S.courseName).toBe('Studio Trilogy');
    expect(S.holes).toHaveLength(3);
    expect(S.regulars.some((regular) => regular.name === 'Rex Marquee' && regular.celebrity)).toBe(true);
  });
});

describe('golfer state machine', () => {
  function makeGolfer(overrides: Partial<Golfer> = {}): Golfer {
    return {
      name: 'Test Golfer',
      skill: 0.6,
      shirt: '#d0453a',
      skin: '#f1c6a0',
      cap: '#3f7fd0',
      x: 5.5,
      y: 5.5,
      tx: 5.5,
      ty: 5.5,
      phase: 0,
      state: 'toTee',
      t: 0,
      holeIdx: 0,
      strokes: 0,
      mood: 0,
      ball: null,
      lie: 'tee',
      chatCd: 0,
      scenicSaid: false,
      energy: 1,
      hunger: 1,
      thirst: 1,
      ...overrides,
    };
  }

  beforeEach(() => {
    S.tiles = new Uint8Array(W * H);
    S.tiles.fill(Tile.ROUGH);
    S.elevC = new Uint8Array((W + 1) * (H + 1));
    S.owned = new Uint8Array(PW * PH);
    S.owned.fill(1);
    const hole: Hole = {
      id: 1,
      tee: { x: 5.5, y: 5.5 },
      cup: { x: 15.5, y: 5.5 },
      par: 4,
      teeTiles: ['5,5'],
      greenTiles: ['15,5'],
      beauty: 0.4,
      interest: 0.5,
    };
    S.holes = [hole];
    S.buildings = [];
    S.employees = [];
    S.golfers = [];
    S.balls = [];
    S.speed = 1;
    S.nextGolfer = 999; // don't let the spawner add extra golfers mid-test
    S.regulars = [];
    S.nextStoryCheck = 999;
    S.tournament = null;
    S.tournamentCooldown = 999;
  });

  it('arriving at the tee moves a golfer from toTee into a preshot dwell', () => {
    const g = makeGolfer({ state: 'toTee' });
    S.golfers.push(g);

    update(0.1); // already co-located with tx,ty — the very next frame should "arrive"

    expect(g.state).toBe('preshot');
    expect(g.ball).not.toBeNull();
    expect(g.strokes).toBe(0);
  });

  it('a preshot dwell that expires swings the ball and moves to watch', () => {
    const g = makeGolfer({ state: 'preshot', t: 0.001, ball: { x: 5.5, y: 5.5 }, lie: 'tee' });
    S.golfers.push(g);

    update(0.1);

    expect(g.state).toBe('watch');
    expect(g.strokes).toBe(1);
    expect(S.balls).toHaveLength(1);
  });

  it('walks toward a distant target instead of teleporting there in one frame', () => {
    const g = makeGolfer({ state: 'toBall', x: 5.5, y: 5.5, tx: 25.5, ty: 5.5, ball: { x: 25.5, y: 5.5 } });
    S.golfers.push(g);

    update(0.1);

    expect(g.state).toBe('toBall'); // far from arriving yet
    expect(g.x).toBeGreaterThan(5.5);
    expect(g.x).toBeLessThan(25.5);
  });

  it('holds instead of falling back to a direct walk across an unreachable water barrier', () => {
    for (let y = 0; y < H; y++) S.tiles[idx(10, y)] = Tile.WATER;
    rebuildStatics();
    const g = makeGolfer({ state: 'toBall', x: 5.5, y: 5.5, tx: 25.5, ty: 5.5, ball: { x: 25.5, y: 5.5 } });
    S.golfers.push(g);

    update(0.1);

    expect(g.path).toBeNull();
    expect({ x: g.x, y: g.y }).toEqual({ x: 5.5, y: 5.5 });
  });

  it('invalidates a live route after terrain changes and resumes when a bridge opens it', () => {
    const g = makeGolfer({ state: 'toBall', x: 5.5, y: 5.5, tx: 25.5, ty: 5.5, ball: { x: 25.5, y: 5.5 } });
    S.golfers.push(g);
    rebuildStatics();
    update(0.1);
    expect(g.x).toBeGreaterThan(5.5);

    for (let y = 0; y < H; y++) S.tiles[idx(10, y)] = Tile.WATER;
    rebuildStatics();
    const blockedAt = { x: g.x, y: g.y };
    update(0.1);
    expect(g.path).toBeNull();
    expect({ x: g.x, y: g.y }).toEqual(blockedAt);

    S.tiles[idx(10, 5)] = Tile.BRIDGE_WATER;
    rebuildStatics();
    update(0.1);
    expect(g.path).not.toBeNull();
    expect(g.x).toBeGreaterThan(blockedAt.x);
  });

  it.each([
    { water: Tile.WATER, bridge: Tile.BRIDGE_WATER },
    { water: Tile.STREAM, bridge: Tile.BRIDGE_STREAM },
  ])('keeps every multi-tick actor position off raw water and on the authored bridge deck ($water)', ({ water, bridge }) => {
    for (let y = 0; y < H; y++) {
      S.tiles[idx(10, y)] = water;
      S.tiles[idx(11, y)] = water;
    }
    S.tiles[idx(10, 5)] = bridge;
    S.tiles[idx(11, 5)] = bridge;
    rebuildStatics();
    const g = makeGolfer({ state: 'toBall', x: 5.5, y: 5.5, tx: 15.5, ty: 5.5, ball: { x: 15.5, y: 5.5 } });
    S.golfers.push(g);
    let bridgeSamples = 0;

    for (let tick = 0; tick < 160 && g.state === 'toBall'; tick++) {
      update(0.05);
      const tile = S.tiles[idx(Math.floor(g.x), Math.floor(g.y))];
      expect(tile, `raw water at tick ${tick} (${g.x}, ${g.y})`).not.toBe(Tile.WATER);
      expect(tile, `raw stream at tick ${tick} (${g.x}, ${g.y})`).not.toBe(Tile.STREAM);
      if (tile === Tile.BRIDGE_WATER || tile === Tile.BRIDGE_STREAM) {
        bridgeSamples++;
        expect(isPointOnBridgeDeck(S.tiles, g.x, g.y), `off-deck bridge position at tick ${tick} (${g.x}, ${g.y})`).toBe(true);
      }
    }

    expect(bridgeSamples).toBeGreaterThan(0);
    expect(g.state).toBe('preshot');
    expect({ x: g.x, y: g.y }).toEqual({ x: 15.5, y: 5.5 });
  });

  it('times out an unreachable reserved group, releases its par-three slot, and admits the waiter', () => {
    S.holes[0].par = 3;
    for (let y = 0; y < H; y++) S.tiles[idx(10, y)] = Tile.WATER;
    rebuildStatics();
    const blocked = makeGolfer({
      name: 'Blocked reservation', state: 'toTee', x: 15.5, y: 5.5, tx: 5.5, ty: 5.5,
      path: null, routeBlockedFor: 9.9, routeRetryIn: 1,
    });
    const waiting = makeGolfer({ name: 'Next in queue', state: 'waitTee', teeQueueSeq: 1 });
    S.golfers.push(blocked, waiting);

    update(0.2);
    expect(S.golfers).not.toContain(blocked);
    expect(waiting.state).toBe('waitTee');

    update(0.1);
    expect(waiting.state).not.toBe('waitTee');
    expect(S.golfers.filter((golfer) => golfer.holeIdx === 0 && golfer.state !== 'waitTee' && golfer.state !== 'leave')).toEqual([waiting]);
  });

  it('times out unreachable leavers and settles special-guest and membership outcomes exactly once', () => {
    const baseHole = S.holes[0];
    S.holes = [baseHole, { ...baseHole, id: 2 }, { ...baseHole, id: 3 }];
    for (let y = 0; y < H; y++) S.tiles[idx(10, y)] = Tile.WATER;
    rebuildStatics();
    S.cash = 1_000;
    S.fee = 20;
    S.time = 0;
    S.difficulty = 'moderate';
    S.financeLedger = [{ id: 1, time: 0, year: 1, amount: 1_000, category: 'capital', detail: 'Opening balance' }];
    S.regulars = [{
      name: 'Future Member', shirt: '#fff', skin: '#dba276', cap: '#333',
      length: .6, accuracy: .6, imagination: .6, visits: 3, streak: 1,
      lastVisit: 0, holesPlayed: 3, lifetimeSpend: 0,
    }];
    S.specialVisitors = {
      pickyCooldown: 9_999, ivanaCooldown: 9_999, pickyVisits: 0, ivanaVisits: 0,
      landmarkDonated: false, landmarkCredits: 0, landPurchased: false, landOffer: null,
    };
    ui.set({ modal: null, tickers: [] });
    const official = makeGolfer({
      name: SPECIAL_GUESTS.picky.name, specialGuest: 'picky', state: 'leave', holeIdx: S.holes.length,
      mood: 2, x: 15.5, y: 5.5, tx: 3.5, ty: 4.5, path: null, routeBlockedFor: 9.9, routeRetryIn: 1,
    });
    const member = makeGolfer({
      name: 'Future Member', state: 'leave', holeIdx: S.holes.length,
      mood: 4, x: 15.5, y: 6.5, tx: 3.5, ty: 4.5, path: null, routeBlockedFor: 9.9, routeRetryIn: 1,
    });
    S.golfers.push(official, member);

    update(0.2);

    expect(S.golfers).toEqual([]);
    expect(S.specialVisitors.pickyVisits).toBe(1);
    expect(S.regulars[0].membership).toMatchObject({ tier: 'annual', paid: 300 });
    expect(S.regulars[0].lifetimeSpend).toBe(300);
    expect(S.financeLedger.filter((entry) => entry.category === 'memberships')).toHaveLength(1);
    expect(S.cash).toBe(1_300);

    update(0.2);
    expect(S.specialVisitors.pickyVisits).toBe(1);
    expect(S.regulars[0].membership).toMatchObject({ tier: 'annual', paid: 300 });
    expect(S.regulars[0].lifetimeSpend).toBe(300);
    expect(S.financeLedger.filter((entry) => entry.category === 'memberships')).toHaveLength(1);
    expect(S.cash).toBe(1_300);
  });

  it.each([
    { par: 3, admitted: 1 },
    { par: 4, admitted: 2 },
    { par: 5, admitted: 2 },
  ])('reserves at most $admitted AI groups on a par-$par hole', ({ par, admitted }) => {
    S.holes[0].par = par;
    const groups = Array.from({ length: 3 }, (_, index) => makeGolfer({ name: `Queue ${index + 1}`, state: 'waitTee' }));
    S.golfers.push(...groups);

    update(0.1);

    expect(groups.filter((g) => g.state !== 'waitTee')).toHaveLength(admitted);
    expect(groups.filter((g) => g.state === 'waitTee')).toHaveLength(3 - admitted);
  });

  it('counts a special guest reservation and admits the FIFO waiter after it releases', () => {
    S.holes[0].par = 3;
    const guest = makeGolfer({ name: 'Official', state: 'toTee', t: 999, specialGuest: 'picky' });
    const waiting = makeGolfer({ name: 'Waiting regular', state: 'waitTee' });
    S.golfers.push(guest, waiting);

    update(0.1);
    expect(waiting.state).toBe('waitTee');

    guest.state = 'leave';
    update(0.1);
    expect(waiting.state).not.toBe('waitTee');
  });

  it('admits two or more waiters strictly by persisted tee queue sequence', () => {
    S.holes[0].par = 3;
    const active = makeGolfer({ name: 'Current group', state: 'preshot', t: 999, ball: { x: 5.5, y: 5.5 } });
    const second = makeGolfer({ name: 'Second', state: 'waitTee', teeQueueSeq: 20 });
    const first = makeGolfer({ name: 'First', state: 'waitTee', teeQueueSeq: 10 });
    const third = makeGolfer({ name: 'Third', state: 'waitTee', teeQueueSeq: 30 });
    const waiting = [second, first, third];
    S.golfers.push(active, ...waiting);

    update(0.1);
    expect(waiting.every((golfer) => golfer.state === 'waitTee')).toBe(true);

    const admitted: string[] = [];
    let occupying = active;
    for (let turn = 0; turn < waiting.length; turn++) {
      occupying.state = 'leave';
      occupying.ball = null;
      occupying.tx = occupying.x;
      occupying.ty = occupying.y;
      update(0.1);
      const next = waiting.find((golfer) => golfer.state !== 'waitTee' && golfer.state !== 'leave');
      expect(next, `missing admission at queue turn ${turn + 1}`).toBeDefined();
      admitted.push(next!.name);
      occupying = next!;
    }

    expect(admitted).toEqual(['First', 'Second', 'Third']);
  });

  it('grandfathers an over-cap par change until every excess reservation drains', () => {
    S.holes[0].par = 3;
    const first = makeGolfer({ name: 'First active', state: 'preshot', t: 999, ball: { x: 5.5, y: 5.5 } });
    const second = makeGolfer({ name: 'Second active', state: 'preshot', t: 999, ball: { x: 5.5, y: 5.5 } });
    const waiting = makeGolfer({ name: 'Waiting', state: 'waitTee' });
    S.golfers.push(first, second, waiting);

    update(0.1);
    expect(first.state).toBe('preshot');
    expect(second.state).toBe('preshot');
    expect(waiting.state).toBe('waitTee');

    first.state = 'leave';
    update(0.1);
    expect(waiting.state).toBe('waitTee');

    second.state = 'leave';
    update(0.1);
    expect(waiting.state).not.toBe('waitTee');
  });

  it('safely releases active and queued groups when their hole is removed', () => {
    const active = makeGolfer({ name: 'Active', state: 'preshot', t: 999, ball: { x: 5.5, y: 5.5 } });
    const waiting = makeGolfer({ name: 'Waiting', state: 'waitTee' });
    const alreadyLeaving = makeGolfer({ name: 'Leaving', state: 'leave' });
    S.golfers.push(active, waiting, alreadyLeaving);
    S.tool = 'dozer';

    paintAt(5.5, 5.5);

    expect(S.holes).toHaveLength(0);
    expect(active.state).toBe('leave');
    expect(waiting.state).toBe('leave');
    expect(alreadyLeaving.state).toBe('leave');
  });

  it('persists facility training and applies the improved trait to later holes immediately', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    const training = createRegularTraining();
    training.progress.accuracy = 95;
    S.regulars = [{
      name: 'Test Golfer', shirt: '#d0453a', skin: '#f1c6a0', cap: '#3f7fd0',
      length: 0.6, accuracy: 0.6, imagination: 0.6, visits: 1, streak: 1, lastVisit: 0,
      holesPlayed: 0, lifetimeSpend: 0, training,
    }];
    S.buildings = [{ id: 1, kind: 'proshop', x: 20, y: 20, w: 3, h: 2, open: true }];
    const cup = S.holes[0].cup;
    const g = makeGolfer({
      state: 'prePutt', t: 0.001, ball: { x: cup.x - 0.2, y: cup.y }, lie: 'green',
      x: cup.x - 0.2, y: cup.y, tx: cup.x - 0.2, ty: cup.y,
      strokes: 2, length: 0.6, accuracy: 0.6, imagination: 0.6,
    });
    S.golfers.push(g);

    update(0.1);
    update(5);

    expect(S.regulars[0].accuracy).toBe(0.61);
    expect(S.regulars[0].training).toMatchObject({ holes: 1, progress: { accuracy: 13 }, gained: { accuracy: 1 } });
    expect(g.accuracy).toBe(0.61);
    expect(g.skill).toBeCloseTo((0.6 + 0.61 + 0.6) / 3);
    random.mockRestore();
  });
});
