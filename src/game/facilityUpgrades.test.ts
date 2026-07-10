import { beforeEach, describe, expect, it } from 'vitest';
import { H, PH, PW, W } from './constants';
import {
  facilityLevel,
  facilityMaintenancePerSec,
  facilityOperational,
  facilityUpgradeOptions,
  feeMultiplier,
  moveSpeedMul,
  passiveIncomePerSec,
} from './buildings';
import { upgradeFacility, updateFacilityUpgrades } from './engine';
import { S } from './state';
import { Tile } from './types';
import type { Building, Hole } from './types';

function hole(id: number): Hole {
  return {
    id,
    tee: { x: 4.5 + id, y: 5.5 },
    cup: { x: 14.5 + id, y: 5.5 },
    par: 4,
    teeTiles: [`${4 + id},5`],
    greenTiles: [`${14 + id},5`],
    beauty: 0.5,
    interest: 0.5,
  };
}

function facility(kind: Building['kind'], id = 1): Building {
  return { id, kind, x: 20, y: 20, w: 3, h: 2, open: true, level: 1 };
}

describe('facility upgrade progression', () => {
  beforeEach(() => {
    S.theme = 'parklands';
    S.cash = 50_000;
    S.rep = 3;
    S.time = 0;
    S.tiles = new Uint8Array(W * H);
    S.tiles.fill(Tile.ROUGH);
    S.elevC = new Uint8Array((W + 1) * (H + 1));
    S.owned = new Uint8Array(PW * PH);
    S.owned.fill(1);
    S.holes = [hole(1), hole(2), hole(3)];
    S.buildings = [];
    S.employees = [];
    S.golfers = [];
    S.balls = [];
    S.floaters = [];
    S.parts = [];
    S.comments = [];
  });

  it('offers permanent Service and Prestige branches at level I', () => {
    const shop = facility('proshop');
    S.buildings = [shop];

    const options = facilityUpgradeOptions(shop);

    expect(options.map((option) => option.branch)).toEqual(['service', 'prestige']);
    expect(options.every((option) => option.targetLevel === 2)).toBe(true);
    expect(options.every((option) => option.lockedReason === null)).toBe(true);
    expect(options.find((option) => option.branch === 'prestige')!.cost).toBeGreaterThan(options.find((option) => option.branch === 'service')!.cost);
  });

  it('takes a facility offline during construction and activates the chosen tier on completion', () => {
    const shop = facility('proshop');
    S.buildings = [shop];
    const service = facilityUpgradeOptions(shop).find((option) => option.branch === 'service')!;
    const cashBefore = S.cash;

    expect(upgradeFacility(shop.id, 'service')).toBe(true);
    expect(S.cash).toBe(cashBefore - service.cost);
    expect(shop.upgrade?.targetLevel).toBe(2);
    expect(facilityOperational(shop)).toBe(false);

    updateFacilityUpgrades(service.duration - 1);
    expect(facilityLevel(shop)).toBe(1);
    expect(shop.upgrade?.remaining).toBeCloseTo(1);

    updateFacilityUpgrades(1);
    expect(shop.upgrade).toBeUndefined();
    expect(facilityLevel(shop)).toBe(2);
    expect(shop.branch).toBe('service');
    expect(facilityOperational(shop)).toBe(true);
  });

  it('locks level III behind six holes and 3.5-star reputation', () => {
    const hotel = { ...facility('hotel'), level: 2 as const, branch: 'prestige' as const };
    S.buildings = [hotel];

    expect(facilityUpgradeOptions(hotel)[0].lockedReason).toContain('6 holes');
    S.holes = [hole(1), hole(2), hole(3), hole(4), hole(5), hole(6)];
    expect(facilityUpgradeOptions(hotel)[0].lockedReason).toContain('3.5');
    S.rep = 3.5;
    expect(facilityUpgradeOptions(hotel)[0].lockedReason).toBeNull();
  });

  it('makes completed branches affect operations and charge maintenance', () => {
    const baseCart = facility('cartgarage', 1);
    const upgradedCart = { ...facility('cartgarage', 2), level: 3 as const, branch: 'service' as const };
    const prestigeAirstrip = { ...facility('airstrip', 3), w: 8, h: 3, level: 3 as const, branch: 'prestige' as const };

    S.buildings = [baseCart];
    const baseSpeed = moveSpeedMul();
    S.buildings = [upgradedCart];
    expect(moveSpeedMul()).toBeGreaterThan(baseSpeed);

    S.buildings = [prestigeAirstrip];
    expect(feeMultiplier()).toBeGreaterThan(1.05);
    expect(facilityMaintenancePerSec()).toBeGreaterThan(0);
  });

  it('makes the Routing Map home value change real building-lot income', () => {
    const lot: Building = { id: 9, kind: 'buildinglot', x: 20, y: 20, w: 2, h: 2, open: true, stage: 2 };
    S.buildings = [lot];
    const plainIncome = passiveIncomePerSec();
    for (let y = 17; y <= 24; y++) for (let x = 17; x <= 24; x++) {
      if (x >= lot.x && x < lot.x + lot.w && y >= lot.y && y < lot.y + lot.h) continue;
      S.tiles[y * W + x] = Tile.WATER;
    }
    expect(passiveIncomePerSec()).toBeGreaterThan(plainIncome);
  });
});
