import { describe, expect, it } from 'vitest';
import { adjustProSkill, applyChampionshipCareer, createProChallengeOffer, createResidentPro, resolveProChallenge, sanitizeProChallengeOffer, sanitizeProProfile, simulateChampionshipResult } from './proCircuit';
import type { RoundRecord } from './types';

function round(scoreToPar = 0): RoundRecord {
  return {
    version: 1,
    id: 'round-1',
    playerName: 'Gary Golf',
    source: 'tournament',
    startedAt: 1,
    completedAt: 2,
    durationSeconds: 1,
    courseName: 'Test Links',
    courseTheme: 'links',
    courseHash: 'hash',
    holesPlayed: 18,
    par: 72,
    strokes: 72 + scoreToPar,
    scoreToPar,
    payout: 0,
    eagles: 0,
    birdies: 0,
    pars: 18,
    bogeys: 0,
    penalties: 0,
    putts: 36,
    fairwaysHit: 10,
    fairwayOpportunities: 14,
    greensInRegulation: 12,
    longestShot: 12,
    card: [],
  };
}

describe('resident pro and Championship Mode', () => {
  it('starts with exactly ten allocatable points and refunds reassigned points', () => {
    const pro = createResidentPro();
    expect(pro.unspentSkillPoints).toBe(10);
    expect(adjustProSkill(pro, 'longDriver', 1)).toBe(true);
    expect(pro.skills.longDriver).toBe(1);
    expect(pro.unspentSkillPoints).toBe(9);
    expect(adjustProSkill(pro, 'longDriver', -1)).toBe(true);
    expect(pro.skills.longDriver).toBe(0);
    expect(pro.unspentSkillPoints).toBe(10);
  });

  it('sanitizes profile names, colors, levels and career totals', () => {
    const pro = sanitizeProProfile({ name: '  Tour Pro  ', shirt: 'red', skills: { luck: 99 } as never, starts: -5 });
    expect(pro.name).toBe('Tour Pro');
    expect(pro.shirt).toBe('#e9b53c');
    expect(pro.skills.luck).toBe(10);
    expect(pro.starts).toBe(0);
  });

  it('creates deterministic 12-player fields and stronger opposition at higher difficulty', () => {
    const options = { id: 'event-fixed', title: 'Test Open', courseId: 'course', proName: 'Gary Golf' };
    const easy = simulateChampionshipResult(round(0), { ...options, difficulty: 'easy' });
    const repeat = simulateChampionshipResult(round(0), { ...options, difficulty: 'easy' });
    const impossible = simulateChampionshipResult(round(0), { ...options, difficulty: 'impossible' });
    expect(easy).toEqual(repeat);
    expect(easy.standings).toHaveLength(12);
    expect(impossible.rank).toBeGreaterThanOrEqual(easy.rank);
    expect(easy.standings.filter((standing) => standing.player)).toHaveLength(1);
  });

  it('awards money and fame according to final rank', () => {
    const pro = createResidentPro();
    const champion = simulateChampionshipResult(round(-20), { id: 'win', title: 'World Championship', courseId: 'course', difficulty: 'difficult', proName: 'Gary Golf' });
    expect(champion.rank).toBe(1);
    expect(champion.prize).toBeGreaterThan(5000);
    expect(champion.fame).toBe(100);
    applyChampionshipCareer(pro, champion);
    expect(pro).toMatchObject({ starts: 1, wins: 1, podiums: 1, careerEarnings: champion.prize, fame: 100 });
  });

  it('creates reputation-scaled challenge terms and resolves every hole wager', () => {
    const offer = createProChallengeOffer(2, 4.5);
    expect(offer.opponent.name).toBe('Carmen Links');
    expect(offer.wagerPerHole).toBeGreaterThan(150);
    const card = [
      { hole: 1, holeId: 1, par: 4, strokes: 3 },
      { hole: 2, holeId: 2, par: 4, strokes: 5 },
      { hole: 3, holeId: 3, par: 3, strokes: 3 },
    ].map((hole) => ({ ...hole, distance: 14, relative: hole.strokes - hole.par, penalties: 0, putts: 1, fairwayHit: null, greenInRegulation: true, hazards: [], wind: { dx: 1, dy: 0, speed: 0 }, shots: [] }));
    const record = { ...round(0), holesPlayed: 3, par: 11, strokes: 11, scoreToPar: 0, card };
    const result = resolveProChallenge(record, offer, [
      { id: 1, interest: .7, skillDemand: { length: .8, accuracy: .8, imagination: .8 } },
      { id: 2, interest: .4, skillDemand: { length: .2, accuracy: .9, imagination: .1 } },
      { id: 3, interest: .2, skillDemand: { length: .1, accuracy: .1, imagination: .1 } },
    ]);
    expect(result.holes).toHaveLength(3);
    expect(result.holesWon + result.holesLost + result.holesTied).toBe(3);
    expect(result.net).toBe((result.holesWon - result.holesLost) * offer.wagerPerHole);
  });

  it('sanitizes persisted challenge colors, strengths, wager and expiry', () => {
    const offer = sanitizeProChallengeOffer({ id: 'offer', opponent: { name: 'Tour Pro', shirt: 'red', length: 99 }, wagerPerHole: 9000, remaining: -5 });
    expect(offer?.opponent.shirt).toMatch(/^#/);
    expect(offer?.opponent.length).toBe(1);
    expect(offer?.wagerPerHole).toBe(1000);
    expect(offer?.remaining).toBe(1);
  });
});
