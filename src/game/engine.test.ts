import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { H, LIE, MAXE, PW, PH, SHOT_SHAPES, W } from './constants';
import { acceptProChallenge, ballFlightPosition, beginPaintStroke, exportSaveText, flightApexHeight, holeToolTap, loadFromSlot, loadGame, newCourse, paintAt, playerAimIntent, playerEstimatedRoll, playerFire, playerIntendedDistance, playerShotDispersion, playerShotPlan, playerShotPlanPosition, playerShotSkill, quitRound, rebuildStatics, retireCourseForChampionship, saveGame, saveToSlot, setClub, setShape, shapeCurveOffset, startChallengeRound, startChampionshipRound, startCompetitionRound, startRound, update, updatePlayHud } from './engine';
import { clubLieProfile, fallbackClubForLie, SEVERE_RECOVERY_LIES } from './clubProfiles';
import { createProChallengeOffer, createResidentPro } from './proCircuit';
import { P } from './camera';
import { idx, idxC } from './rng';
import { S, caches } from './state';
import { Tile } from './types';
import type { Golfer, Hole, ProChallengeOffer } from './types';
import { ui } from '../ui/store';

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
    S.theme = 'tropical';
    S.propertyId = 'fiji-lagoon';
    S.propertiesPurchased = ['fiji-lagoon'];
    S.careerProgress = { version: 1, bestReputation: 4.2, tournamentHosted: false, sgaTop100Earned: true, sgaTop18Earned: false };
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
      landPurchased: true,
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
    expect(S.careerProgress).toEqual({ version: 1, bestReputation: 4.2, tournamentHosted: true, sgaTop100Earned: true, sgaTop18Earned: false });
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

  it('makes allocated power and driving skills change the shared shot-distance math', () => {
    S.proProfile.skills.powerHitter = 0;
    S.proProfile.skills.longDriver = 0;
    const base = playerIntendedDistance('tee', 'driver', 1);
    S.proProfile.skills.powerHitter = 10;
    S.proProfile.skills.longDriver = 10;
    expect(playerIntendedDistance('tee', 'driver', 1)).toBeGreaterThan(base * 1.25);
  });

  it('gives every club a distinct lie-aware strategic profile', () => {
    expect(playerIntendedDistance('tee', 'driver', 1)).toBeGreaterThan(playerIntendedDistance('tee', 'iron', 1));
    expect(playerIntendedDistance('tee', 'iron', 1)).toBeGreaterThan(playerIntendedDistance('tee', 'wedge', 1));

    const driver = clubLieProfile('tee', 'driver');
    const iron = clubLieProfile('tee', 'iron');
    const wedge = clubLieProfile('tee', 'wedge');
    expect(driver.launchMultiplier).toBeLessThan(iron.launchMultiplier);
    expect(iron.launchMultiplier).toBeLessThan(wedge.launchMultiplier);
    expect(driver.rolloutMultiplier).toBeGreaterThan(iron.rolloutMultiplier);
    expect(iron.rolloutMultiplier).toBeGreaterThan(wedge.rolloutMultiplier);

    for (const lie of SEVERE_RECOVERY_LIES) expect(clubLieProfile(lie, 'driver')).toMatchObject({ available: false });
    expect(clubLieProfile('pot', 'driver').reason).toContain('pot bunker');
    expect(clubLieProfile('rough', 'driver')).toMatchObject({ available: true });
    expect(fallbackClubForLie('sand', 'driver')).toBe('wedge');

    const ironRetention = clubLieProfile('sand', 'iron');
    const wedgeRetention = clubLieProfile('sand', 'wedge');
    expect(wedgeRetention.carryMultiplier).toBeGreaterThan(ironRetention.carryMultiplier);
    expect(wedgeRetention.dispersionMultiplier).toBeLessThan(ironRetention.dispersionMultiplier);
  });

  it('uses the same club-aware dispersion model for wide Driver and tight Wedge shots', () => {
    const driver = playerShotDispersion('tee', 'driver', 'straight', 6);
    const iron = playerShotDispersion('tee', 'iron', 'straight', 6);
    const wedge = playerShotDispersion('tee', 'wedge', 'straight', 6);
    expect(driver.angularScale).toBeGreaterThan(iron.angularScale);
    expect(iron.angularScale).toBeGreaterThan(wedge.angularScale);
    expect(driver.lateral).toBeGreaterThan(iron.lateral);
    expect(iron.lateral).toBeGreaterThan(wedge.lateral);
    expect(playerShotDispersion('tee', 'iron', 'punch', 6).angularScale).toBeLessThan(iron.angularScale);
  });

  it('rejects Driver from a severe recovery lie without charging a stroke and falls back to Wedge', () => {
    startRound();
    S.player!.lie = 'sand';
    S.player!.club = 'iron';
    expect(setClub('driver')).toBe(false);
    expect(S.player!.club).toBe('iron');

    S.player!.club = 'driver'; // simulate a stale selection from an older save
    S.player!.aim = { on: true, sx: 0, sy: 0, cx: 0, cy: 0, kind: 'keyboard', worldDirX: 1, worldDirY: 0, worldPower: 0.5 };
    playerFire(1, 0, 0.5);
    expect(S.player!.club).toBe('wedge');
    expect(S.player!.aim).toBeNull();
    expect(S.player!.strokes).toBe(0);
    expect(S.balls.filter((ball) => ball.owner === 'P')).toHaveLength(0);
    quitRound();
  });

  it('publishes club availability, role, and carry-to-finish forecast through the live HUD', () => {
    startRound();
    S.wind.speed = 0;
    S.player!.aim = { on: true, sx: 0, sy: 0, cx: 0, cy: 0, kind: 'keyboard', worldDirX: 1, worldDirY: 0, worldPower: 0.5 };
    updatePlayHud();
    const teeHud = ui.get().playHud!;
    expect(teeHud.clubOptions.driver).toMatchObject({ available: true, role: 'Low · runs' });
    expect(teeHud.clubOptions.wedge).toMatchObject({ available: true, role: 'High · checks' });
    expect(teeHud.finishDistance).toBeGreaterThan(teeHud.carry!);

    S.player!.lie = 'pot';
    S.player!.club = 'wedge';
    updatePlayHud();
    const recoveryHud = ui.get().playHud!;
    expect(recoveryHud.clubOptions.driver.available).toBe(false);
    expect(recoveryHud.clubOptions.driver.reason).toContain('pot bunker');
    expect(recoveryHud.selectedRole).toBe('High · checks');
    quitRound();
  });

  it('applies club launch and rollout profiles to real equal-carry shots', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    S.holes = [{ id: 93, tee: { x: 5.5, y: 5.5 }, cup: { x: 30.5, y: 5.5 }, par: 5, teeTiles: [], greenTiles: [], beauty: 1, interest: 1 }];
    S.tiles.fill(Tile.FAIR);
    S.elevC.fill(0);
    const results = {} as Record<'driver' | 'iron' | 'wedge', { height: number; finish: number }>;

    for (const club of ['driver', 'iron', 'wedge'] as const) {
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

    expect(results.driver.height).toBeLessThan(results.iron.height);
    expect(results.iron.height).toBeLessThan(results.wedge.height);
    expect(results.driver.finish).toBeGreaterThan(results.iron.finish);
    expect(results.iron.finish).toBeGreaterThan(results.wedge.finish);
    random.mockRestore();
  });

  it('automatically selects Wedge after a Driver lands in a severe recovery lie', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    S.holes = [{ id: 90, tee: { x: 5.5, y: 5.5 }, cup: { x: 30.5, y: 5.5 }, par: 5, teeTiles: [], greenTiles: [], beauty: 1, interest: 1 }];
    S.tiles.fill(Tile.SAND);
    S.elevC.fill(0);
    startRound();
    S.wind.speed = 0;
    setClub('driver');
    playerFire(1, 0, 0.25);
    update(5);
    expect(S.player).toMatchObject({ lie: 'sand', club: 'wedge', strokes: 1 });
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
    expect(playerEstimatedRoll('fair', 'straight')).toBeCloseTo(0.9);
    expect(playerEstimatedRoll('firmfair', 'straight')).toBeCloseTo(1.5);
    expect(playerEstimatedRoll('fair', 'straight', 'driver')).toBeGreaterThan(playerEstimatedRoll('fair', 'straight', 'iron'));
    expect(playerEstimatedRoll('fair', 'straight', 'iron')).toBeGreaterThan(playerEstimatedRoll('fair', 'straight', 'wedge'));
    expect(playerEstimatedRoll('fair', 'backspin')).toBe(0);
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
