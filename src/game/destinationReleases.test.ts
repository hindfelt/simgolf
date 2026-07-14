import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { checkDestinationReleases, resetDestinationReleaseTracking } from './engine';
import { createResidentPro } from './proCircuit';
import { S } from './state';
import type { CareerProgress, PropertyId } from './types';
import type { PropertyAvailabilityContext } from './properties';
import { ui } from '../ui/store';

const progress = (patch: Partial<CareerProgress> = {}): CareerProgress => ({
  version: 1,
  bestReputation: 2.5,
  tournamentHosted: false,
  sgaTop100Earned: false,
  sgaTop18Earned: false,
  ...patch,
});

const memoryStorage = (): Storage => {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
    clear: () => data.clear(),
    key: (index) => [...data.keys()][index] ?? null,
    get length() { return data.size; },
  };
};

function context(funds: number, career: CareerProgress, fame = 0): PropertyAvailabilityContext {
  return {
    funds,
    progress: { ...career },
    proProfile: { fame, starts: 0, podiums: 0, wins: 0 },
    purchased: ['maple-crossing'] as PropertyId[],
    currentPropertyId: 'maple-crossing',
    sandbox: false,
  };
}

describe('central worldwide destination releases', () => {
  beforeEach(() => {
    (globalThis as { localStorage?: Storage }).localStorage = memoryStorage();
    S.sandbox = false;
    S.mode = 'build';
    S.propertyId = 'maple-crossing';
    S.propertiesPurchased = ['maple-crossing'];
    S.cash = 0;
    S.rep = 2.5;
    S.history = [];
    S.holes = [];
    S.retiredCourses = [];
    S.goalsAchieved = {};
    S.tournamentHostedEver = false;
    S.proProfile = createResidentPro();
    S.careerProgress = progress();
    S.comments = [];
    ui.set({ destinationRelease: [], tickers: [] });
    resetDestinationReleaseTracking();
  });

  afterEach(() => {
    delete (globalThis as { localStorage?: Storage }).localStorage;
    ui.set({ destinationRelease: [], tickers: [] });
  });

  it('announces a fame-and-cash crossing outside manual-round completion', () => {
    const earned = progress({ lifetimeOperatingEarnings: 4_000 });
    const before = context(0, earned, 24);
    S.cash = 0;
    S.careerProgress = earned;
    S.proProfile.fame = 25;

    expect(checkDestinationReleases(before)).toEqual(['fiji-lagoon']);
    expect(S.careerProgress.releasedProperties).toContain('fiji-lagoon');
    expect(ui.get().destinationRelease).toContain('fiji-lagoon');
    expect(ui.get().tickers.at(-1)).toMatchObject({ name: 'World Screen', cls: 'money' });
  });

  it('keeps the background watcher active while managing the course', () => {
    S.cash = 0;
    S.careerProgress = progress({ lifetimeOperatingEarnings: 4_000 });
    S.proProfile.fame = 24;
    resetDestinationReleaseTracking();

    S.proProfile.fame = 25;

    expect(checkDestinationReleases()).toEqual(['fiji-lagoon']);
    expect(S.careerProgress.releasedProperties).toContain('fiji-lagoon');
    expect(ui.get().destinationRelease).toContain('fiji-lagoon');
  });

  it('defers the background watcher during play so round completion owns the release', () => {
    S.cash = 0;
    S.careerProgress = progress({ lifetimeOperatingEarnings: 4_000 });
    S.proProfile.fame = 24;
    resetDestinationReleaseTracking();
    const roundStart = context(0, progress({ lifetimeOperatingEarnings: 4_000 }), 24);

    S.mode = 'play';
    S.proProfile.fame = 25;

    expect(checkDestinationReleases()).toEqual([]);
    expect(S.careerProgress.releasedProperties ?? []).not.toContain('fiji-lagoon');
    expect(ui.get().destinationRelease).not.toContain('fiji-lagoon');

    expect(checkDestinationReleases(roundStart, true)).toEqual(['fiji-lagoon']);
    expect(S.careerProgress.releasedProperties).toContain('fiji-lagoon');
    expect(ui.get().destinationRelease).toContain('fiji-lagoon');
  });

  it('persists acknowledgement so a later cash dip cannot replay the same release', () => {
    const earned = progress({ lifetimeOperatingEarnings: 4_000 });
    const before = context(0, earned, 24);
    S.cash = 0;
    S.careerProgress = earned;
    S.proProfile.fame = 25;
    expect(checkDestinationReleases(before)).toEqual(['fiji-lagoon']);

    const repeatBefore = context(5_500, { ...S.careerProgress }, 25);
    S.cash = 0;
    expect(checkDestinationReleases(repeatBefore)).toEqual([]);
    expect(ui.get().destinationRelease.filter((id) => id === 'fiji-lagoon')).toHaveLength(1);
  });

  it('uses the same watcher for reputation and tournament milestones', () => {
    const reputationBefore = context(0, progress({ bestReputation: 2.99, lifetimeOperatingEarnings: 2_500 }));
    S.cash = 0;
    S.careerProgress = progress({ bestReputation: 2.99, lifetimeOperatingEarnings: 2_500 });
    S.rep = 3;
    expect(checkDestinationReleases(reputationBefore)).toContain('atacama-wash');

    const tournamentBefore = context(0, progress({ bestReputation: 3.5, lifetimeOperatingEarnings: 7_500, tournamentHosted: false }));
    S.cash = 0;
    S.careerProgress = progress({ bestReputation: 3.5, lifetimeOperatingEarnings: 7_500, tournamentHosted: false });
    S.rep = 3.5;
    S.tournamentHostedEver = true;
    expect(checkDestinationReleases(tournamentBefore)).toContain('bavarian-vale');
  });

  it('releases an earned-money destination permanently even with an empty bank', () => {
    S.cash = 0;
    S.rep = 3;
    S.careerProgress = progress({ bestReputation: 3, lifetimeOperatingEarnings: 2_499 });
    resetDestinationReleaseTracking();
    const before = context(0, { ...S.careerProgress });

    S.careerProgress.lifetimeOperatingEarnings = 2_500;

    expect(checkDestinationReleases(before)).toContain('atacama-wash');
    expect(S.careerProgress.releasedProperties).toContain('atacama-wash');
    expect(S.cash).toBe(0);
  });

  it('routes SGA and championship milestones through the same permanent release watcher', () => {
    S.cash = 0;
    S.rep = 4;
    S.careerProgress = progress({ bestReputation: 4, lifetimeOperatingEarnings: 18_000, sgaTop100Earned: false });
    resetDestinationReleaseTracking();
    const sgaBefore = context(0, { ...S.careerProgress });
    S.careerProgress.sgaTop100Earned = true;
    expect(checkDestinationReleases(sgaBefore)).toContain('namib-canyon');

    S.rep = 5;
    S.proProfile.fame = 300;
    S.proProfile.wins = 0;
    S.careerProgress = progress({ bestReputation: 5, lifetimeOperatingEarnings: 100_000, sgaTop100Earned: true, sgaTop18Earned: true });
    resetDestinationReleaseTracking();
    const championshipBefore: PropertyAvailabilityContext = {
      ...context(0, { ...S.careerProgress }, 300),
      proProfile: { fame: 300, starts: 1, podiums: 1, wins: 0 },
    };
    S.proProfile.wins = 1;
    expect(checkDestinationReleases(championshipBefore)).toContain('seychelles-crown');
  });
});
