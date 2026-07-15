import { beforeEach, describe, expect, it } from 'vitest';
import { H, PH, PW, W } from './constants';
import { acceptLandOffer, placeBuilding } from './engine';
import {
  SPECIAL_GUESTS,
  adjacentUnownedParcels,
  isSpecialGuestKind,
  specialGuestEnjoyed,
  specialGuestPortrait,
} from './specialGuests';
import { S } from './state';
import { Tile } from './types';

describe('manual special visitors', () => {
  it('keeps both marquee identities explicit, bare-headed, and visually distinct', () => {
    const picky = SPECIAL_GUESTS.picky;
    const ivana = SPECIAL_GUESTS.ivana;

    expect(picky).toMatchObject({ name: 'I.M. Picky', skill: 0.58, defaultExpression: 'neutral' });
    expect(picky.visual).toMatchObject({
      identity: 'special-guest:picky',
      skin: '#9a6546',
      hairTone: '#211916',
      signature: 'commissioner',
      appearance: { build: 'broad', headwear: 'none', hair: 'close' },
    });
    expect(ivana).toMatchObject({ name: 'Ivana Richman', skill: 0.74, defaultExpression: 'pleased' });
    expect(ivana.visual).toMatchObject({
      identity: 'special-guest:ivana',
      skin: '#d9a47c',
      hairTone: '#c79b4c',
      hairHighlight: '#e5c77e',
      signature: 'patron',
      appearance: { build: 'classic', headwear: 'none', hair: 'shoulder' },
    });
    expect(ivana.visual.identity).not.toBe(picky.visual.identity);
  });

  it('builds complete portrait profiles and rejects forged persisted guest kinds', () => {
    expect(specialGuestPortrait('picky')).toEqual({ ...SPECIAL_GUESTS.picky.visual, expression: 'neutral' });
    expect(specialGuestPortrait('ivana', 'cross')).toEqual({ ...SPECIAL_GUESTS.ivana.visual, expression: 'cross' });
    expect(isSpecialGuestKind('picky')).toBe(true);
    expect(isSpecialGuestKind('ivana')).toBe(true);
    expect(isSpecialGuestKind('commissioner')).toBe(false);
    expect(isSpecialGuestKind(null)).toBe(false);
  });

  it('offers only edge-adjacent, contiguous expansion parcels', () => {
    const owned = new Uint8Array(PW * PH);
    owned[0] = owned[1] = owned[PW] = owned[PW + 1] = 1;
    expect(adjacentUnownedParcels(owned, PW, PH)).toEqual([2, 6, 8, 9]);
  });

  it('requires both a completed round and a positive mood', () => {
    expect(specialGuestEnjoyed(2, false)).toBe(false);
    expect(specialGuestEnjoyed(0.5, true)).toBe(false);
    expect(specialGuestEnjoyed(0.75, true)).toBe(true);
  });

  beforeEach(() => {
    S.sandbox = false;
    S.cash = 10_000;
    S.tiles = new Uint8Array(W * H);
    S.tiles.fill(Tile.ROUGH);
    S.elevC = new Uint8Array((W + 1) * (H + 1));
    S.owned = new Uint8Array(PW * PH);
    S.owned[0] = 1;
    S.holes = [];
    S.buildings = [];
    S.golfers = [];
    S.specialVisitors = {
      pickyCooldown: 20,
      ivanaCooldown: 30,
      pickyVisits: 0,
      ivanaVisits: 0,
      landmarkDonated: false,
      landmarkCredits: 0,
      landOffer: null,
    };
  });

  it('purchases only a parcel included in Picky’s live selection', () => {
    S.specialVisitors.landOffer = { id: 1, parcelIndices: [1], price: 3500, remaining: 90 };
    expect(acceptLandOffer(2)).toBe(false);
    expect(acceptLandOffer(1)).toBe(true);
    expect(S.owned[1]).toBe(1);
    expect(S.cash).toBe(6500);
    expect(S.specialVisitors.landOffer).toBeNull();
  });

  it('locks Landmarks until Ivana donates the first and consumes her free credit', () => {
    expect(placeBuilding('landmark', 10, 10)).toBeNull();
    S.specialVisitors.landmarkDonated = true;
    S.specialVisitors.landmarkCredits = 1;
    const before = S.cash;
    expect(placeBuilding('landmark', 10, 10)).not.toBeNull();
    expect(S.cash).toBe(before);
    expect(S.specialVisitors.landmarkCredits).toBe(0);
  });
});
