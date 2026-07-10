import { beforeEach, describe, expect, it } from 'vitest';
import { H, PH, PW, W } from './constants';
import { acceptLandOffer, placeBuilding } from './engine';
import { adjacentUnownedParcels, specialGuestEnjoyed } from './specialGuests';
import { S } from './state';
import { Tile } from './types';

describe('manual special visitors', () => {
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
