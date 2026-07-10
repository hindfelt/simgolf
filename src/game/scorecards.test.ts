import { beforeEach, describe, expect, it } from 'vitest';
import { H, PH, PW, W } from './constants';
import { exportRoundHistoryText, importRoundHistoryText, playerFire, startRound, update } from './engine';
import {
  buildRoundRecord,
  compareRoundScore,
  courseFingerprint,
  isCourseRecord,
  isPersonalBest,
  roundToCsv,
  sanitizeRoundHistory,
} from './scorecards';
import { S } from './state';
import { Tile } from './types';
import type { PlayerHoleScore, PlayerRound, PlayerShotRecord, RoundRecord } from './types';

function shot(overrides: Partial<PlayerShotRecord> = {}): PlayerShotRecord {
  return {
    stroke: 1,
    club: 'driver',
    shape: 'straight',
    fromLie: 'tee',
    resultLie: 'fair',
    power: 0.8,
    intendedDistance: 10,
    distance: 9.5,
    start: { x: 5.5, y: 5.5 },
    end: { x: 15, y: 5.5 },
    events: [],
    penalty: 0,
    holed: false,
    ...overrides,
  };
}

function holeScore(overrides: Partial<PlayerHoleScore> = {}): PlayerHoleScore {
  return {
    hole: 1,
    holeId: 101,
    par: 4,
    distance: 14,
    strokes: 4,
    relative: 0,
    penalties: 0,
    putts: 2,
    fairwayHit: true,
    greenInRegulation: true,
    hazards: [],
    wind: { dx: 1, dy: 0, speed: 0.2 },
    shots: [shot()],
    ...overrides,
  };
}

function playerRound(card: PlayerHoleScore[]): PlayerRound {
  return {
    id: 'round-test',
    startedAt: 1_000,
    courseHash: 'fm1-12345678',
    source: 'exhibition',
    holeIdx: card.length - 1,
    strokes: 0,
    card,
    currentHole: null,
    pendingShot: null,
    ball: null,
    lie: 'tee',
    state: 'between',
    aim: null,
    club: 'iron',
    shape: 'straight',
  };
}

describe('persistent scorecards', () => {
  it('builds aggregate competition fields from detailed hole and shot records', () => {
    const card = [
      holeScore({ hole: 1, holeId: 1, par: 4, strokes: 3, relative: -1, putts: 1, shots: [shot({ distance: 11 })] }),
      holeScore({ hole: 2, holeId: 2, par: 3, strokes: 5, relative: 2, penalties: 1, putts: 2, fairwayHit: null, greenInRegulation: false, hazards: ['water'], shots: [shot({ penalty: 1, events: ['water'], distance: 12 })] }),
    ];

    const player = playerRound(card);
    player.source = 'challenge';
    player.challengeId = 'challenge-123';
    const record = buildRoundRecord({ player, courseName: 'Test Links', courseTheme: 'links', completedAt: 61_000, payout: 270 });

    expect(record.par).toBe(7);
    expect(record.strokes).toBe(8);
    expect(record.scoreToPar).toBe(1);
    expect(record.birdies).toBe(1);
    expect(record.bogeys).toBe(1);
    expect(record.penalties).toBe(1);
    expect(record.putts).toBe(3);
    expect(record.fairwaysHit).toBe(1);
    expect(record.fairwayOpportunities).toBe(1);
    expect(record.greensInRegulation).toBe(1);
    expect(record.longestShot).toBe(12);
    expect(record.durationSeconds).toBe(60);
    expect(record.challengeId).toBe('challenge-123');
  });

  it('fingerprints gameplay layout deterministically and changes when terrain changes', () => {
    const state = {
      theme: 'parklands' as const,
      tiles: new Uint8Array(12),
      elevC: new Uint8Array(16),
      holes: [{ id: 99, tee: { x: 1.5, y: 1.5 }, cup: { x: 8.5, y: 1.5 }, par: 3, teeTiles: ['1,1'], greenTiles: ['8,1'], beauty: 0, interest: 0 }],
      buildings: [],
    };
    const first = courseFingerprint(state);
    expect(courseFingerprint(state)).toBe(first);
    state.tiles[4] = Tile.WATER;
    expect(courseFingerprint(state)).not.toBe(first);
  });

  it('ranks lower relative scores first and identifies course and personal records', () => {
    const base = buildRoundRecord({ player: playerRound([holeScore()]), courseName: 'A', courseTheme: 'parklands', completedAt: 10_000, payout: 0 });
    const better: RoundRecord = { ...base, id: 'better', completedAt: 20_000, strokes: 3, scoreToPar: -1 };
    expect(compareRoundScore(better, base)).toBeLessThan(0);
    expect(isCourseRecord(better, [base])).toBe(true);
    expect(isPersonalBest(better, [base])).toBe(true);
    expect(isCourseRecord(base, [better])).toBe(false);
  });

  it('rejects malformed history records and exports a readable CSV card', () => {
    const record = buildRoundRecord({ player: playerRound([holeScore()]), courseName: 'CSV Club', courseTheme: 'parklands', completedAt: 10_000, payout: 0 });
    expect(sanitizeRoundHistory([{ nope: true }, record])).toEqual([record]);
    const csv = roundToCsv(record);
    expect(csv).toContain('"Fairway Mogul scorecard"');
    expect(csv).toContain('"CSV Club"');
    expect(csv).toContain('"Hole","Par","Score"');
  });

  it('exports and restores a portable profile archive without duplicating round ids', () => {
    const storage = new Map<string, string>();
    (globalThis as { localStorage?: Storage }).localStorage = {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => void storage.set(key, value),
      removeItem: (key) => void storage.delete(key),
      clear: () => storage.clear(),
      key: () => null,
      get length() { return storage.size; },
    } as Storage;
    try {
      const record = buildRoundRecord({ player: playerRound([holeScore()]), courseName: 'Archive Club', courseTheme: 'parklands', completedAt: 10_000, payout: 0 });
      S.roundHistory = [record];
      const archive = exportRoundHistoryText();
      S.roundHistory = [];

      expect(importRoundHistoryText(archive)).toBe(1);
      expect(importRoundHistoryText(archive)).toBe(1);
      expect(S.roundHistory).toHaveLength(1);
      expect(S.roundHistory[0].courseName).toBe('Archive Club');
    } finally {
      delete (globalThis as { localStorage?: Storage }).localStorage;
    }
  });
});

describe('live player shot capture', () => {
  beforeEach(() => {
    S.theme = 'parklands';
    S.cash = 20_000;
    S.rep = 2.5;
    S.speed = 1;
    S.tiles = new Uint8Array(W * H);
    S.tiles.fill(Tile.ROUGH);
    S.elevC = new Uint8Array((W + 1) * (H + 1));
    S.owned = new Uint8Array(PW * PH);
    S.owned.fill(1);
    S.holes = [{ id: 1, tee: { x: 5.5, y: 5.5 }, cup: { x: 25.5, y: 5.5 }, par: 4, teeTiles: ['5,5'], greenTiles: ['25,5'], beauty: 0.4, interest: 0.5 }];
    S.buildings = [];
    S.facilityActivities = [];
    S.nextFacilityActivity = 999;
    S.employees = [];
    S.golfers = [];
    S.balls = [];
    S.parts = [];
    S.floaters = [];
    S.player = null;
    S.nextGolfer = 999;
    S.nextStoryCheck = 999;
    S.tournament = null;
    S.tournamentCooldown = 999;
    S.roundHistory = [];
  });

  it('captures club, shape, power, lie and actual landing distance for every swing', () => {
    startRound();
    playerFire(1, 0, 0.2);

    expect(S.player?.currentHole?.shots).toHaveLength(1);
    expect(S.player?.pendingShot?.club).toBe('iron');
    expect(S.player?.pendingShot?.shape).toBe('straight');
    expect(S.player?.pendingShot?.fromLie).toBe('tee');
    expect(S.player?.pendingShot?.power).toBeCloseTo(0.2);

    update(2); // flight
    update(2); // possible roll-out

    expect(S.player?.pendingShot).toBeNull();
    expect(S.player?.currentHole?.shots[0].distance).toBeGreaterThan(0);
    expect(S.player?.currentHole?.shots[0].end).not.toEqual(S.player?.currentHole?.shots[0].start);
  });
});
