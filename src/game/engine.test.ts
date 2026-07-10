import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { H, MAXE, PW, PH, W } from './constants';
import { acceptProChallenge, beginPaintStroke, exportSaveText, holeToolTap, loadGame, newCourse, paintAt, playerIntendedDistance, quitRound, rebuildStatics, retireCourseForChampionship, saveGame, startChallengeRound, startChampionshipRound, startCompetitionRound, update } from './engine';
import { createProChallengeOffer, createResidentPro } from './proCircuit';
import { idx, idxC } from './rng';
import { S, caches } from './state';
import { Tile } from './types';
import type { Golfer, Hole, ProChallengeOffer } from './types';

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

    S.cash = 12_345;
    S.time = 410;
    S.courseName = 'Home Course';
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
      landOffer: { id: 7, parcelIndices: [], price: 3500, remaining: 44 },
    };
    S.goalsAchieved = { rep3: true };
    S.tournamentHostedEver = true;
    S.comments = [{ id: 1, time: 12, name: 'Big Earl', txt: 'Frame that scorecard!', cls: 'money' }];
  });
  afterEach(() => {
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

    const resumed = loadGame();

    expect(resumed).toBe(true);
    expect(S.cash).toBe(12_345);
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
    expect(S.specialVisitors.landmarkDonated).toBe(true);
    expect(S.specialVisitors.landmarkCredits).toBe(1);
    expect(S.specialVisitors.pickyVisits).toBe(2);
    expect(S.time).toBe(410);
    expect(S.financeLedger).toHaveLength(2);
    expect(S.financeLedger[1]).toMatchObject({ year: 2, amount: 2345, category: 'greenFees' });
    expect(S.regulars[0].membership).toMatchObject({ tier: 'lifetime', paid: 2400 });
    expect(S.regulars[0].lifetimeSpend).toBe(4200);
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

  it('makes allocated power and driving skills change the shared shot-distance math', () => {
    S.proProfile.skills.powerHitter = 0;
    S.proProfile.skills.longDriver = 0;
    const base = playerIntendedDistance('tee', 'driver', 1);
    S.proProfile.skills.powerHitter = 10;
    S.proProfile.skills.longDriver = 10;
    expect(playerIntendedDistance('tee', 'driver', 1)).toBeGreaterThan(base * 1.25);
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
});
