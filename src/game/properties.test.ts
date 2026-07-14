import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PH, PW } from './constants';
import { GOAL_DEFS, acceptLandOffer, newCourse } from './engine';
import {
  PROPERTY_INHERITANCE,
  WORLD_PROPERTIES,
  legacyCareerEligibleProperties,
  newlyAvailableProperties,
  operatingEarningsAmount,
  operatingEarningsFromLedger,
  propertyAvailability,
  propertyAffordable,
  propertyById,
  sanitizeCareerProgress,
  sanitizePropertyHistory,
  starterPropertyForTheme,
} from './properties';
import { S } from './state';
import { Tile } from './types';
import type { CareerProgress, ProProfile, PropertyId } from './types';
import { createResidentPro } from './proCircuit';

const emptyProgress = (): CareerProgress => ({ version: 1, earningsProgressionVersion: 1, bestReputation: 2.5, tournamentHosted: false, sgaTop100Earned: false, sgaTop18Earned: false });

function unlockedContext(propertyId: PropertyId) {
  const property = propertyById(propertyId);
  const progress = emptyProgress();
  const proProfile = createResidentPro();
  const unlock = property.unlock ?? {};
  progress.lifetimeOperatingEarnings = unlock.earnings ?? 0;
  progress.bestReputation = unlock.reputation ?? 2.5;
  progress.tournamentHosted = !!unlock.tournament;
  progress.sgaTop100Earned = !!unlock.sgaTop100 || !!unlock.sgaTop18;
  progress.sgaTop18Earned = !!unlock.sgaTop18;
  proProfile.fame = unlock.fame ?? 0;
  proProfile.starts = unlock.championshipStart ? 1 : 0;
  proProfile.podiums = unlock.championshipPodium ? 1 : 0;
  proProfile.wins = unlock.championshipWin ? 1 : 0;
  return { funds: property.price, progress, proProfile, purchased: [] as PropertyId[] };
}

function memoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => void store.set(key, value),
    removeItem: (key) => void store.delete(key),
    clear: () => store.clear(),
    key: (index) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

describe('World Screen property catalog', () => {
  it('contains four distinct properties for every terrain region', () => {
    expect(WORLD_PROPERTIES).toHaveLength(16);
    expect(new Set(WORLD_PROPERTIES.map((property) => property.id)).size).toBe(16);
    for (const theme of ['parklands', 'links', 'desert', 'tropical'] as const) {
      expect(WORLD_PROPERTIES.filter((property) => property.theme === theme)).toHaveLength(4);
    }
  });

  it('keeps every deed anchored to the northwest starter block', () => {
    for (const property of WORLD_PROPERTIES) {
      expect(property.ownedParcels).toEqual(expect.arrayContaining([0, 1, PW, PW + 1]));
      expect(new Set(property.ownedParcels).size).toBe(property.ownedParcels.length);
      expect(property.ownedParcels.every((parcel) => parcel >= 0 && parcel < PW * PH)).toBe(true);
    }
  });

  it('handles affordability, fallback, and profile-history migration defensively', () => {
    const crown = propertyById('seychelles-crown');
    expect(propertyAffordable(crown, crown.price)).toBe(true);
    expect(propertyAffordable(crown, crown.price - 1)).toBe(false);
    expect(propertyAffordable(propertyById('maple-crossing'), -500)).toBe(true);
    expect(propertyById('not-a-property').id).toBe('maple-crossing');
    expect(starterPropertyForTheme('desert').id).toBe('red-mesa');
    expect(sanitizePropertyHistory(['fiji-lagoon', 'bad-id', 'fiji-lagoon', 'donegal-point'])).toEqual(['fiji-lagoon', 'donegal-point']);
  });

  it('uses six starter deeds followed by the exact rating, fame and championship career ladder', () => {
    const expected = {
      'maple-crossing': undefined,
      'donegal-point': undefined,
      'red-mesa': undefined,
      'maui-grove': undefined,
      'kyoto-gardens': undefined,
      'skagen-dunes': undefined,
      'atacama-wash': { earnings: 2_500, reputation: 3 },
      'fiji-lagoon': { earnings: 4_000, fame: 25 },
      'bavarian-vale': { earnings: 7_500, reputation: 3.5, tournament: true },
      'cape-breton-links': { earnings: 12_000, reputation: 3.5, fame: 50 },
      'namib-canyon': { earnings: 18_000, reputation: 4, sgaTop100: true },
      'palawan-bay': { earnings: 28_000, reputation: 4, fame: 100, sgaTop100: true },
      'ontario-lakes': { earnings: 40_000, reputation: 4.5, fame: 125 },
      'wadi-rum-reserve': { earnings: 55_000, reputation: 4.5, fame: 175, sgaTop18: true, championshipStart: true },
      'hebridean-reach': { earnings: 75_000, reputation: 5, fame: 225, sgaTop18: true, championshipPodium: true },
      'seychelles-crown': { earnings: 100_000, reputation: 5, fame: 300, sgaTop18: true, championshipWin: true },
    } satisfies Record<PropertyId, (typeof WORLD_PROPERTIES)[number]['unlock']>;

    for (const property of WORLD_PROPERTIES) {
      expect(property.unlock, property.id).toEqual(expected[property.id]);
      expect(propertyAvailability(property, unlockedContext(property.id)).canPurchase, property.id).toBe(true);
    }
  });

  it('reports every unmet milestone independently and unlocks exactly at each threshold', () => {
    for (const property of WORLD_PROPERTIES.filter((candidate) => candidate.unlock)) {
      const context = unlockedContext(property.id);
      const unlock = property.unlock!;
      for (const key of Object.keys(unlock) as (keyof NonNullable<typeof property.unlock>)[]) {
        const failing = {
          ...context,
          progress: { ...context.progress },
          proProfile: { ...context.proProfile } as ProProfile,
        };
        if (key === 'earnings') failing.progress.lifetimeOperatingEarnings = unlock.earnings! - 1;
        if (key === 'reputation') failing.progress.bestReputation = unlock.reputation! - 0.1;
        if (key === 'fame') failing.proProfile.fame = unlock.fame! - 1;
        if (key === 'tournament') failing.progress.tournamentHosted = false;
        if (key === 'sgaTop100') failing.progress.sgaTop100Earned = false;
        if (key === 'sgaTop18') failing.progress.sgaTop18Earned = false;
        if (key === 'championshipStart') failing.proProfile.starts = 0;
        if (key === 'championshipPodium') failing.proProfile.podiums = 0;
        if (key === 'championshipWin') failing.proProfile.wins = 0;
        const result = propertyAvailability(property, failing);
        expect(result.canPurchase, `${property.id}:${key}`).toBe(false);
        expect(result.missing.some((requirement) => requirement.id === key), `${property.id}:${key}`).toBe(true);
      }
    }
  });

  it('distinguishes current, purchased, locked, available, and sandbox states without spending prestige', () => {
    const property = propertyById('seychelles-crown');
    const releasedUnfunded = propertyAvailability(property, { ...unlockedContext(property.id), funds: property.price - 1 });
    expect(releasedUnfunded).toMatchObject({ status: 'available', released: true, affordable: false, canPurchase: false, cashShortfall: 1 });

    const careerLocked = unlockedContext(property.id);
    careerLocked.progress.lifetimeOperatingEarnings = property.unlock!.earnings! - 1;
    expect(propertyAvailability(property, careerLocked)).toMatchObject({ status: 'locked', released: false, affordable: true, canPurchase: false });

    const available = propertyAvailability(property, unlockedContext(property.id));
    expect(available).toMatchObject({ status: 'available', released: true, affordable: true, canPurchase: true, cashShortfall: 0 });
    expect(available.requirements.every((requirement) => requirement.met)).toBe(true);

    expect(propertyAvailability(property, { ...unlockedContext(property.id), purchased: [property.id] })).toMatchObject({ status: 'purchased', canPurchase: false });
    expect(propertyAvailability(property, { ...unlockedContext(property.id), currentPropertyId: property.id })).toMatchObject({ status: 'current', canPurchase: false });
    expect(propertyAvailability(property, { funds: 0, progress: emptyProgress(), proProfile: createResidentPro(), purchased: [], sandbox: true })).toMatchObject({ status: 'available', canPurchase: true });
  });

  it('keeps an acknowledged legacy release coherent even when a newer milestone is absent', () => {
    const property = propertyById('atacama-wash');
    const result = propertyAvailability(property, {
      funds: 0,
      progress: { ...emptyProgress(), lifetimeOperatingEarnings: 0, releasedProperties: [property.id] },
      proProfile: createResidentPro(),
      purchased: [],
    });

    expect(result).toMatchObject({ status: 'available', released: true, affordable: false, canPurchase: false });
    expect(result.missing.map((requirement) => requirement.id)).toEqual(['cash']);
    expect(result.requirements.filter((requirement) => requirement.id !== 'cash').every((requirement) => requirement.met)).toBe(true);
  });

  it('uses the exact former cash boundary when grandfathering unacknowledged legacy deeds', () => {
    const progress = { ...emptyProgress(), earningsProgressionVersion: undefined, bestReputation: 3 };
    const proProfile = createResidentPro();
    proProfile.fame = 25;
    const below = legacyCareerEligibleProperties({ funds: 5_499, progress, proProfile, purchased: [] }).map((property) => property.id);
    const atPrice = legacyCareerEligibleProperties({ funds: 5_500, progress, proProfile, purchased: [] }).map((property) => property.id);

    expect(below).toContain('atacama-wash');
    expect(below).not.toContain('fiji-lagoon');
    expect(atPrice).toEqual(expect.arrayContaining(['atacama-wash', 'fiji-lagoon']));
    expect(atPrice).not.toContain('bavarian-vale');
  });

  it('grandfathers purchased and acknowledged deeds even after the operating bank is spent', () => {
    const progress = { ...emptyProgress(), earningsProgressionVersion: undefined, releasedProperties: ['fiji-lagoon'] as PropertyId[] };
    const eligible = legacyCareerEligibleProperties({
      funds: 0,
      progress,
      proProfile: createResidentPro(),
      purchased: ['atacama-wash'],
    }).map((property) => property.id);

    expect(eligible).toEqual(expect.arrayContaining(['atacama-wash', 'fiji-lagoon']));
  });

  it('reports only deeds that cross from career-locked to permanently released', () => {
    const beforeCash = unlockedContext('kyoto-gardens');
    beforeCash.funds = propertyById('kyoto-gardens').price - 1;
    const afterCash = { ...beforeCash, funds: propertyById('kyoto-gardens').price };
    expect(newlyAvailableProperties(beforeCash, afterCash).map((property) => property.id)).not.toContain('kyoto-gardens');

    const beforeEarnings = unlockedContext('atacama-wash');
    beforeEarnings.funds = 0;
    beforeEarnings.progress.lifetimeOperatingEarnings = propertyById('atacama-wash').unlock!.earnings! - 1;
    const afterEarnings = { ...beforeEarnings, progress: { ...beforeEarnings.progress, lifetimeOperatingEarnings: propertyById('atacama-wash').unlock!.earnings } };
    expect(newlyAvailableProperties(beforeEarnings, afterEarnings).map((property) => property.id)).toContain('atacama-wash');

    const beforeFame = unlockedContext('fiji-lagoon');
    beforeFame.proProfile.fame = 24;
    const afterFame = { ...beforeFame, proProfile: { ...beforeFame.proProfile, fame: 25 } };
    expect(newlyAvailableProperties(beforeFame, afterFame).map((property) => property.id)).toContain('fiji-lagoon');

    const purchasedAfter = { ...afterFame, purchased: ['fiji-lagoon'] as PropertyId[] };
    expect(newlyAvailableProperties(beforeFame, purchasedAfter).map((property) => property.id)).not.toContain('fiji-lagoon');
  });

  it('migrates legacy career accomplishments conservatively and clamps malformed progress', () => {
    expect(sanitizeCareerProgress(null, ['rep4', 'tournament'])).toEqual({ version: 1, bestReputation: 4, tournamentHosted: true, sgaTop100Earned: false, sgaTop18Earned: false });
    expect(sanitizeCareerProgress({ bestReputation: 99, tournamentHosted: 'yes', sgaTop100Earned: true, sgaTop18Earned: 1 })).toEqual({ version: 1, bestReputation: 5, tournamentHosted: false, sgaTop100Earned: true, sgaTop18Earned: false });
    expect(sanitizeCareerProgress({ sgaTop100Earned: false, sgaTop18Earned: true })).toMatchObject({ sgaTop100Earned: true, sgaTop18Earned: true });
    expect(sanitizeCareerProgress({ lifetimeOperatingEarnings: 12_345.9 }).lifetimeOperatingEarnings).toBe(12_345);
    expect(sanitizeCareerProgress({ lifetimeOperatingEarnings: -50 }).lifetimeOperatingEarnings).toBeUndefined();
    expect(sanitizeCareerProgress({ earningsProgressionVersion: 1 }).earningsProgressionVersion).toBe(1);
    expect(sanitizeCareerProgress({ releasedProperties: ['fiji-lagoon', 'fiji-lagoon', 'not-a-place'] as PropertyId[] }).releasedProperties).toEqual(['fiji-lagoon']);
  });

  it('counts gross operating revenue while excluding capital, refunds, and losses', () => {
    expect(operatingEarningsAmount(125.9, 'greenFees')).toBe(125);
    expect(operatingEarningsAmount(900, 'capital')).toBe(0);
    expect(operatingEarningsAmount(300, 'refunds')).toBe(0);
    expect(operatingEarningsAmount(-200, 'proChallenge')).toBe(0);
    expect(operatingEarningsFromLedger([
      { amount: 1_000, category: 'capital' },
      { amount: 450, category: 'greenFees' },
      { amount: 700, category: 'property' },
      { amount: 300, category: 'refunds' },
      { amount: -80, category: 'proChallenge' },
      { amount: 120, category: 'roundBonuses' },
    ])).toBe(1_270);
  });
});

describe('property purchase flow', () => {
  beforeEach(() => {
    (globalThis as { localStorage?: Storage }).localStorage = memoryStorage();
    S.propertiesPurchased = [];
    S.sandbox = false;
    S.proProfile = createResidentPro();
    S.careerProgress = emptyProgress();
  });

  afterEach(() => {
    delete (globalThis as { localStorage?: Storage }).localStorage;
  });

  it('charges the deed, grants its starting parcels, and records profile ownership', () => {
    const property = propertyById('fiji-lagoon');
    S.careerProgress.lifetimeOperatingEarnings = property.unlock!.earnings;
    S.proProfile.fame = 25;
    expect(newCourse(false, 'moderate', property.theme, 'standard', null, property.id, PROPERTY_INHERITANCE)).toBe(true);

    expect(S.propertyId).toBe(property.id);
    expect(S.cash).toBe(PROPERTY_INHERITANCE - property.price);
    expect(Array.from(S.owned)).toEqual(Array.from({ length: PW * PH }, (_, parcel) => Number(property.ownedParcels.includes(parcel))));
    expect(S.propertiesPurchased).toContain(property.id);
    expect(JSON.parse(localStorage.getItem('fairway-mogul-profile-v1')!).propertiesPurchased).toContain(property.id);
    expect(JSON.parse(localStorage.getItem('fairway-mogul-save-v1')!).propertyId).toBe(property.id);
  });

  it('rejects unaffordable or already-developed deeds without replacing the course', () => {
    S.courseName = 'Existing Course';
    expect(newCourse(false, 'moderate', 'tropical', 'standard', null, 'seychelles-crown', 10_000)).toBe(false);
    expect(S.courseName).toBe('Existing Course');

    S.propertiesPurchased = ['fiji-lagoon'];
    expect(newCourse(false, 'moderate', 'tropical', 'standard', null, 'fiji-lagoon', PROPERTY_INHERITANCE)).toBe(false);
    expect(S.courseName).toBe('Existing Course');
  });

  it('enforces prestige gates in the engine and leaves the live course untouched on rejection', () => {
    S.courseName = 'Existing Course';
    S.cash = 50_000;
    expect(newCourse(false, 'moderate', 'desert', 'standard', null, 'atacama-wash', 50_000)).toBe(false);
    expect(S.courseName).toBe('Existing Course');
    expect(S.propertiesPurchased).toEqual([]);

    S.careerProgress.bestReputation = 3;
    S.careerProgress.lifetimeOperatingEarnings = propertyById('atacama-wash').unlock!.earnings;
    expect(newCourse(false, 'moderate', 'desert', 'standard', null, 'atacama-wash', 50_000)).toBe(true);
    expect(S.propertyId).toBe('atacama-wash');
    expect(S.cash).toBe(50_000 - propertyById('atacama-wash').price);
  });

  it('allows a purchased property in Sandbox Mode without altering purchase history', () => {
    S.propertiesPurchased = ['fiji-lagoon'];
    expect(newCourse(true, 'moderate', 'tropical', 'standard', null, 'fiji-lagoon', 0)).toBe(true);

    expect(S.propertyId).toBe('fiji-lagoon');
    expect(Array.from(S.owned).every(Boolean)).toBe(true);
    expect(S.propertiesPurchased).toEqual(['fiji-lagoon']);
  });

  it('does not carry an unlimited Sandbox treasury into a normal property purchase', () => {
    expect(newCourse(true, 'moderate', 'parklands', 'standard', null, 'maple-crossing', 0)).toBe(true);
    S.propertiesPurchased = [];
    S.careerProgress.lifetimeOperatingEarnings = propertyById('fiji-lagoon').unlock!.earnings;
    S.proProfile.fame = 25;

    expect(newCourse(false, 'moderate', 'tropical', 'standard', null, 'fiji-lagoon', S.cash)).toBe(true);
    expect(S.cash).toBe(PROPERTY_INHERITANCE - propertyById('fiji-lagoon').price);
  });

  it('awards county-expansion progress only after a Picky parcel purchase', () => {
    S.careerProgress = { version: 1, bestReputation: 4.5, lifetimeOperatingEarnings: 40_000, tournamentHosted: false, sgaTop100Earned: false, sgaTop18Earned: false };
    S.proProfile.fame = 125;
    expect(newCourse(false, 'moderate', 'parklands', 'standard', null, 'ontario-lakes', PROPERTY_INHERITANCE)).toBe(true);
    const pickyLand = GOAL_DEFS.find((goal) => goal.id === 'pickyLand')!;

    expect(Array.from(S.owned).filter(Boolean).length).toBeGreaterThan(4);
    expect(pickyLand.check()).toBe(false);
    S.specialVisitors.landOffer = { id: 1, parcelIndices: [3], price: 3_500, remaining: 60 };
    expect(acceptLandOffer(3)).toBe(true);
    expect(pickyLand.check()).toBe(true);
  });

  it('generates visibly different terrain from each property profile', () => {
    expect(newCourse(false, 'moderate', 'parklands', 'standard', null, 'maple-crossing', PROPERTY_INHERITANCE)).toBe(true);
    const mapleWater = Array.from(S.tiles).filter((tile) => tile === Tile.WATER).length;
    const mapleElevation = Array.from(S.elevC);

    S.propertiesPurchased = [];
    S.careerProgress = { version: 1, bestReputation: 4.5, lifetimeOperatingEarnings: 40_000, tournamentHosted: false, sgaTop100Earned: false, sgaTop18Earned: false };
    S.proProfile.fame = 125;
    expect(newCourse(false, 'moderate', 'parklands', 'standard', null, 'ontario-lakes', PROPERTY_INHERITANCE)).toBe(true);
    const ontarioWater = Array.from(S.tiles).filter((tile) => tile === Tile.WATER).length;

    expect(ontarioWater).toBeGreaterThan(mapleWater);
    expect(Array.from(S.elevC)).not.toEqual(mapleElevation);
  });
});
