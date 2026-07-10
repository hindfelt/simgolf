import { describe, expect, it } from 'vitest';
import { annualMembershipPrice, lifetimeMembershipPrice, membershipActive, membershipOfferFor, membershipVisitWeight, sanitizeMembership } from './memberships';

describe('club memberships', () => {
  it('prices dues from the course fee and playable hole count', () => {
    expect(annualMembershipPrice(20, 3)).toBe(300);
    expect(annualMembershipPrice(40, 9)).toBe(1075);
    expect(lifetimeMembershipPrice(40, 9)).toBe(4300);
  });

  it('offers annual membership only to happy repeat guests who finish the course', () => {
    expect(membershipOfferFor({ visits: 3 }, 9, 9, 2.1, 1, 20)).toEqual({ kind: 'annual', price: 550 });
    expect(membershipOfferFor({ visits: 3 }, 8, 9, 5, 1, 20)).toBeNull();
    expect(membershipOfferFor({ visits: 2 }, 9, 9, 5, 1, 20)).toBeNull();
  });

  it('renews expired annual members and upgrades exceptional regulars for life', () => {
    const annual = { tier: 'annual' as const, sinceYear: 1, lastRenewedYear: 1, expiresYear: 1, paid: 550 };
    expect(membershipOfferFor({ visits: 6, membership: annual }, 9, 9, 2, 2, 20)).toEqual({ kind: 'renewal', price: 550 });
    expect(membershipOfferFor({ visits: 10, membership: annual }, 9, 9, 3.2, 2, 20)).toEqual({ kind: 'lifetime', price: 2200 });
  });

  it('makes active members three times as likely to return', () => {
    const annual = { tier: 'annual' as const, sinceYear: 1, lastRenewedYear: 1, expiresYear: 1, paid: 300 };
    expect(membershipActive(annual, 1)).toBe(true);
    expect(membershipActive(annual, 2)).toBe(false);
    expect(membershipVisitWeight(annual, 1)).toBe(3);
    expect(membershipVisitWeight(annual, 2)).toBe(1);
  });

  it('sanitizes lifetime and annual records from course saves', () => {
    expect(sanitizeMembership({ tier: 'lifetime', sinceYear: 2, lastRenewedYear: 3, paid: 4200 })).toEqual({
      tier: 'lifetime', sinceYear: 2, lastRenewedYear: 3, paid: 4200,
    });
    expect(sanitizeMembership({ tier: 'annual', sinceYear: 2, lastRenewedYear: 3, expiresYear: 1, paid: 500 })).toMatchObject({
      tier: 'annual', sinceYear: 2, lastRenewedYear: 3, expiresYear: 3, paid: 500,
    });
    expect(sanitizeMembership({ tier: 'coupon' })).toBeUndefined();
  });
});
