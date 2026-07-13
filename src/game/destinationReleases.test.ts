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
    const before = context(5_500, progress(), 24);
    S.cash = 5_500;
    S.proProfile.fame = 25;

    expect(checkDestinationReleases(before)).toEqual(['fiji-lagoon']);
    expect(S.careerProgress.releasedProperties).toContain('fiji-lagoon');
    expect(ui.get().destinationRelease).toContain('fiji-lagoon');
    expect(ui.get().tickers.at(-1)).toMatchObject({ name: 'World Screen', cls: 'money' });
  });

  it('keeps the background watcher active while managing the course', () => {
    S.cash = 5_500;
    S.proProfile.fame = 24;
    resetDestinationReleaseTracking();

    S.proProfile.fame = 25;

    expect(checkDestinationReleases()).toEqual(['fiji-lagoon']);
    expect(S.careerProgress.releasedProperties).toContain('fiji-lagoon');
    expect(ui.get().destinationRelease).toContain('fiji-lagoon');
  });

  it('defers the background watcher during play so round completion owns the release', () => {
    S.cash = 5_500;
    S.proProfile.fame = 24;
    resetDestinationReleaseTracking();
    const roundStart = context(5_500, progress(), 24);

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
    const before = context(5_500, progress(), 24);
    S.cash = 5_500;
    S.proProfile.fame = 25;
    expect(checkDestinationReleases(before)).toEqual(['fiji-lagoon']);

    const repeatBefore = context(5_499, { ...S.careerProgress }, 25);
    S.cash = 5_500;
    expect(checkDestinationReleases(repeatBefore)).toEqual([]);
    expect(ui.get().destinationRelease.filter((id) => id === 'fiji-lagoon')).toHaveLength(1);
  });

  it('uses the same watcher for reputation and tournament milestones', () => {
    const reputationBefore = context(4_500, progress({ bestReputation: 2.99 }));
    S.cash = 4_500;
    S.rep = 3;
    expect(checkDestinationReleases(reputationBefore)).toContain('atacama-wash');

    const tournamentBefore = context(6_500, progress({ bestReputation: 3.5, tournamentHosted: false }));
    S.cash = 6_500;
    S.rep = 3.5;
    S.tournamentHostedEver = true;
    expect(checkDestinationReleases(tournamentBefore)).toContain('bavarian-vale');
  });
});
