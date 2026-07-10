import { describe, expect, it } from 'vitest';
import { createProChallengeOffer, simulateChampionshipResult } from './proCircuit';
import type { RoundRecord } from './types';
import { fillThemeStory, isThemePackId, themePackById, themePackCourse, themePackPlayers, themePackStories, themePackTouringPros } from './themePacks';

function round(): RoundRecord {
  return {
    version: 1, id: 'theme-round', completedAt: 1, playerName: 'Resident Pro', courseName: 'Pack Course', courseTheme: 'parklands',
    courseHash: 'theme-hash', source: 'tournament', startedAt: 0, durationSeconds: 10, holesPlayed: 3, par: 12, strokes: 12,
    scoreToPar: 0, payout: 0, birdies: 0, eagles: 0, pars: 3, bogeys: 0, fairwaysHit: 0, fairwayOpportunities: 0,
    greensInRegulation: 0, putts: 6, penalties: 0, longestShot: 0, card: [],
  };
}

describe('manual-style Theme Packs', () => {
  it('falls back to Standard when an id is missing or invalid', () => {
    expect(isThemePackId('neighborhood-nine')).toBe(true);
    expect(isThemePackId('ripped-pack')).toBe(false);
    expect(themePackById('missing').id).toBe('standard');
  });

  it('lets a story-only pack inherit the standard players, pros, and course', () => {
    expect(themePackStories('storybook-club', 'rivalry').length).toBeGreaterThan(0);
    expect(themePackPlayers('storybook-club').map((player) => player.name)).toEqual(themePackPlayers('standard').map((player) => player.name));
    expect(themePackTouringPros('storybook-club')).toBeUndefined();
    expect(themePackCourse('storybook-club', 'anything')).toBeNull();
  });

  it('ships complete original player, celebrity, pro, and course bundles', () => {
    const players = themePackPlayers('neighborhood-nine');
    const pros = themePackTouringPros('neighborhood-nine');
    const course = themePackCourse('neighborhood-nine', 'garden-loop');

    expect(players).toHaveLength(24);
    expect(players.filter((player) => player.celebrity)).toHaveLength(2);
    expect(pros).toHaveLength(6);
    expect(course?.holes).toHaveLength(3);
  });

  it('fills story tokens without corrupting unknown placeholders', () => {
    expect(fillThemeStory('{leader} leads {chaser} on visit {visits}. {unknown}', { leader: 'Mara', chaser: 'Theo', visits: 10 }))
      .toBe('Mara leads Theo on visit 10. {unknown}');
  });

  it('uses the active pack touring field for Pro Challenges and championships', () => {
    const pros = themePackTouringPros('backlot-legends')!;
    const offer = createProChallengeOffer(0, 4, pros);
    const result = simulateChampionshipResult(round(), {
      id: 'pack-event', title: 'Backlot Open', courseId: 'pack-course', difficulty: 'moderate', proName: 'Resident Pro',
      fieldNames: pros.map((pro) => pro.name),
    });

    expect(offer.opponent.name).toBe('Dash Driver');
    expect(result.standings.some((standing) => standing.name === 'Dash Driver')).toBe(true);
    expect(result.standings).toHaveLength(12);
  });
});
