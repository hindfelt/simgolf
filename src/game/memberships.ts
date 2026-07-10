import type { Membership, Regular } from './types';

export const MEMBER_GREEN_FEE_MULTIPLIER = 0.9;

function roundTo25(value: number): number {
  return Math.round(value / 25) * 25;
}

export function annualMembershipPrice(fee: number, holeCount: number): number {
  return Math.max(300, Math.min(2000, roundTo25(fee * Math.max(3, holeCount) * 3)));
}

export function lifetimeMembershipPrice(fee: number, holeCount: number): number {
  return annualMembershipPrice(fee, holeCount) * 4;
}

export function membershipActive(membership: Membership | undefined, year: number): boolean {
  return !!membership && (membership.tier === 'lifetime' || (membership.expiresYear ?? 0) >= year);
}

/** Members appear three times in the arrival draw, so membership is operational rather than decorative. */
export function membershipVisitWeight(membership: Membership | undefined, year: number): number {
  return membershipActive(membership, year) ? 3 : 1;
}

export type MembershipOffer =
  | { kind: 'annual'; price: number }
  | { kind: 'renewal'; price: number }
  | { kind: 'lifetime'; price: number }
  | null;

export function membershipOfferFor(
  regular: Pick<Regular, 'visits' | 'membership'>,
  completedHoles: number,
  courseHoles: number,
  mood: number,
  year: number,
  fee: number,
): MembershipOffer {
  if (courseHoles < 3 || completedHoles < courseHoles) return null;
  const annual = annualMembershipPrice(fee, courseHoles);
  const membership = regular.membership;
  if (!membership) return regular.visits >= 3 && mood >= 2.1 ? { kind: 'annual', price: annual } : null;
  if (membership.tier === 'lifetime') return null;
  if (regular.visits >= 10 && mood >= 3.2) return { kind: 'lifetime', price: lifetimeMembershipPrice(fee, courseHoles) };
  if (!membershipActive(membership, year) && mood >= 1.5) return { kind: 'renewal', price: annual };
  return null;
}

export function sanitizeMembership(value: unknown): Membership | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Partial<Membership>;
  if (raw.tier !== 'annual' && raw.tier !== 'lifetime') return undefined;
  const sinceYear = Math.max(1, Math.trunc(Number(raw.sinceYear) || 1));
  const lastRenewedYear = Math.max(sinceYear, Math.trunc(Number(raw.lastRenewedYear) || sinceYear));
  const paid = Math.max(0, Math.trunc(Number(raw.paid) || 0));
  if (raw.tier === 'lifetime') return { tier: 'lifetime', sinceYear, lastRenewedYear, paid };
  return {
    tier: 'annual',
    sinceYear,
    lastRenewedYear,
    paid,
    expiresYear: Math.max(lastRenewedYear, Math.trunc(Number(raw.expiresYear) || lastRenewedYear)),
  };
}
