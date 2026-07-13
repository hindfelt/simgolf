import { describe, expect, it } from 'vitest';
import type { PlayerHoleScore, PlayerShotRecord, RoundRecord } from './types';
import {
  applyProPracticeSession,
  createProPracticeSession,
  createResidentPro,
  sanitizeProProfile,
} from './proCircuit';

const shot = (patch: Partial<PlayerShotRecord>): PlayerShotRecord => ({
  stroke: 1,
  club: 'iron',
  shape: 'straight',
  fromLie: 'fair',
  resultLie: 'green',
  power: 0.7,
  intendedDistance: 6,
  distance: 6,
  start: { x: 1, y: 1 },
  end: { x: 7, y: 1 },
  events: [],
  penalty: 0,
  holed: false,
  ...patch,
});

const practiceRound = (shots: PlayerShotRecord[]): RoundRecord => {
  const card: PlayerHoleScore[] = [{
    hole: 1,
    holeId: 1,
    par: 3,
    distance: 8,
    strokes: 3,
    relative: 0,
    penalties: 0,
    putts: 1,
    fairwayHit: true,
    greenInRegulation: true,
    hazards: [],
    wind: { dx: 1, dy: 0, speed: 0.2 },
    shots,
  }];
  return {
    version: 1,
    id: 'practice-round',
    playerName: 'Gary Golf',
    source: 'exhibition',
    startedAt: 1,
    completedAt: 2,
    durationSeconds: 1,
    courseName: 'Practice Links',
    courseTheme: 'parklands',
    courseHash: 'practice',
    holesPlayed: 1,
    par: 3,
    strokes: 3,
    scoreToPar: 0,
    payout: 0,
    eagles: 0,
    birdies: 0,
    pars: 1,
    bogeys: 0,
    penalties: 0,
    putts: 1,
    fairwaysHit: 1,
    fairwayOpportunities: 1,
    greensInRegulation: 1,
    longestShot: 8,
    card,
  };
};

describe('resident-pro practice progression', () => {
  it('trains the clubs, shot shapes, recovery lies, and results actually played', () => {
    const record = practiceRound([
      shot({ club: 'driver', shape: 'fade', fromLie: 'tee', power: 0.9 }),
      shot({ club: 'iron', shape: 'backspin', fromLie: 'sand' }),
      shot({ club: 'putter', shape: 'putt', fromLie: 'green', power: 0.1, holed: true }),
    ]);

    const session = createProPracticeSession(record, { drivingRange: false, puttingGreen: false, proShop: false });

    expect(session.earned).toMatchObject({
      powerHitter: 2,
      longDriver: 3,
      accurateDriver: 5,
      accurateIrons: 5,
      accuratePutter: 4,
      fadeShot: 5,
      highBackspin: 5,
      recovery: 6,
      luck: 3,
    });
    expect(session.earned.drawShot).toBe(0);
  });

  it('makes original-style practice facilities accelerate matching disciplines', () => {
    const record = practiceRound([
      shot({ club: 'driver', shape: 'fade', fromLie: 'tee', power: 0.9 }),
      shot({ club: 'iron', shape: 'backspin', fromLie: 'sand' }),
      shot({ club: 'putter', shape: 'putt', fromLie: 'green', power: 0.1, holed: true }),
    ]);

    const boosted = createProPracticeSession(record, { drivingRange: true, puttingGreen: true, proShop: true });

    expect(boosted.facilities).toEqual(['Driving Range', 'Putting Green', 'Pro Shop']);
    expect(boosted.earned.accurateDriver).toBe(9);
    expect(boosted.earned.fadeShot).toBe(9);
    expect(boosted.earned.accurateIrons).toBe(9);
    expect(boosted.earned.recovery).toBe(10);
    expect(boosted.earned.luck).toBe(4);
  });

  it('levels skills at 100 practice, carries overflow, and never exceeds mastery', () => {
    const pro = createResidentPro();
    pro.practice.fadeShot = 97;
    pro.skills.powerHitter = 10;
    pro.practice.powerHitter = 55;
    const earned = { ...pro.practice, powerHitter: 20, fadeShot: 9 };
    for (const id of Object.keys(earned) as Array<keyof typeof earned>) if (id !== 'powerHitter' && id !== 'fadeShot') earned[id] = 0;

    const result = applyProPracticeSession(pro, { holes: 3, facilities: ['Driving Range'], earned });

    expect(pro.practiceRounds).toBe(1);
    expect(pro.skills.fadeShot).toBe(1);
    expect(pro.practice.fadeShot).toBe(6);
    expect(pro.skills.powerHitter).toBe(10);
    expect(pro.practice.powerHitter).toBe(0);
    expect(result.gains[0]).toMatchObject({ id: 'fadeShot', earned: 9, levels: 1, level: 1, progress: 6 });
  });

  it('backfills clean practice state for legacy saved pros', () => {
    const legacy = createResidentPro() as Partial<ReturnType<typeof createResidentPro>>;
    delete legacy.practice;
    delete legacy.practiceRounds;

    const restored = sanitizeProProfile(legacy);

    expect(restored.practiceRounds).toBe(0);
    expect(Object.values(restored.practice)).toEqual(Array(10).fill(0));
  });
});
