import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PH, PW } from './constants';
import { GOAL_DEFS, acceptLandOffer, newCourse } from './engine';
import {
  PROPERTY_INHERITANCE,
  WORLD_PROPERTIES,
  propertyAffordable,
  propertyById,
  sanitizePropertyHistory,
  starterPropertyForTheme,
} from './properties';
import { S } from './state';
import { Tile } from './types';

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
});

describe('property purchase flow', () => {
  beforeEach(() => {
    (globalThis as { localStorage?: Storage }).localStorage = memoryStorage();
    S.propertiesPurchased = [];
    S.sandbox = false;
  });

  afterEach(() => {
    delete (globalThis as { localStorage?: Storage }).localStorage;
  });

  it('charges the deed, grants its starting parcels, and records profile ownership', () => {
    const property = propertyById('fiji-lagoon');
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

    expect(newCourse(false, 'moderate', 'tropical', 'standard', null, 'fiji-lagoon', S.cash)).toBe(true);
    expect(S.cash).toBe(PROPERTY_INHERITANCE - propertyById('fiji-lagoon').price);
  });

  it('awards county-expansion progress only after a Picky parcel purchase', () => {
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
    expect(newCourse(false, 'moderate', 'parklands', 'standard', null, 'ontario-lakes', PROPERTY_INHERITANCE)).toBe(true);
    const ontarioWater = Array.from(S.tiles).filter((tile) => tile === Tile.WATER).length;

    expect(ontarioWater).toBeGreaterThan(mapleWater);
    expect(Array.from(S.elevC)).not.toEqual(mapleElevation);
  });
});
