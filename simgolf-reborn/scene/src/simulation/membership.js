import { inviteVisitor } from "./visitor-pool.js";
export const MEMBERSHIP_TIERS = [
  "Visitor",
  "Basic",
  "Silver",
  "Gold",
  "Platinum",
];
// Provisional eligibility; the original uses great shots and finishing attitude.
export const MEMBERSHIP_POLICY = Object.freeze({
  minimumHappiness: 4,
  minimumGreatShots: 1,
});
export function considerMembership(g, v) {
  if (
    v.pro ||
    !v.roundFinished ||
    !v.scorecard.length ||
    v.scorecard.length !== v.itinerary.length
  )
    return null;
  let m = g.memberships.find((m) => m.golferId === v.id);
  if (!m) {
    m = {
      golferId: v.id,
      tier: 0,
      lastRoundId: null,
      application: null,
      history: [],
    };
    g.memberships.push(m);
  }
  if (m.lastRoundId === v.roundId || m.application || m.tier === 4) return null;
  m.lastRoundId = v.roundId;
  const greatShots = v.scorecard.filter((s) =>
    v.happinessReactions?.includes("great-shot:" + s.holeId),
  ).length;
  if (
    greatShots < MEMBERSHIP_POLICY.minimumGreatShots ||
    v.happiness < MEMBERSHIP_POLICY.minimumHappiness
  )
    return null;
  m.application = {
    tier: m.tier + 1,
    roundId: v.roundId,
    happiness: v.happiness,
    greatShots,
  };
  return (
    v.name +
    " applies for " +
    MEMBERSHIP_TIERS[m.application.tier] +
    " membership. Review the membership roster."
  );
}
export function decideMembership(g, golferId, accept) {
  const m = g.memberships.find((m) => m.golferId === golferId);
  if (!m?.application)
    return { ok: false, message: "No pending membership application." };
  if (accept && g.visitorPool.length >= 100000)
    return { ok: false, message: "The visitor pool is full." };
  let message = "Membership application declined.";
  if (accept) {
    const invited = inviteVisitor(g, golferId, m.application.tier);
    m.tier = m.application.tier;
    m.history.push({
      tier: m.tier,
      roundId: m.application.roundId,
      invitedId: invited.id,
    });
    message =
      MEMBERSHIP_TIERS[m.tier] +
      " membership accepted. " +
      invited.name +
      " has been invited.";
  }
  m.application = null;
  g.revision++;
  return { ok: true, message };
}
export function validateMemberships(g) {
  if (
    !Array.isArray(g.memberships) ||
    g.memberships.length > g.visitorPool.length
  )
    throw Error("Invalid memberships.");
  const ids = new Set(),
    invitations = new Set();
  const round = (id) => typeof id === "string" && /^round-\d+$/.test(id);
  for (const m of g.memberships) {
    if (
      !m ||
      ids.has(m.golferId) ||
      !g.guestRoster.some((p) => p.id === m.golferId) ||
      !g.visitorPool.some((p) => p.id === m.golferId) ||
      !Number.isInteger(m.tier) ||
      m.tier < 0 ||
      m.tier > 4 ||
      m.tier > g.guestRoster.find((p) => p.id === m.golferId).rounds ||
      !round(m.lastRoundId) ||
      !Array.isArray(m.history) ||
      m.history.length !== m.tier
    )
      throw Error("Invalid membership record.");
    ids.add(m.golferId);
    if (m.application !== null) {
      const a = m.application;
      if (
        !a ||
        a.tier !== m.tier + 1 ||
        a.tier > 4 ||
        a.roundId !== m.lastRoundId ||
        !Number.isInteger(a.happiness) ||
        a.happiness < 4 ||
        a.happiness > 10000 ||
        !Number.isInteger(a.greatShots) ||
        a.greatShots < 1 ||
        a.greatShots > 18
      )
        throw Error("Invalid membership application.");
    }
    const reviewedRounds = new Set();
    for (const [index, h] of m.history.entries()) {
      const p = g.visitorPool.find((p) => p.id === h?.invitedId);
      if (
        !h ||
        h.tier !== index + 1 ||
        !round(h.roundId) ||
        reviewedRounds.has(h.roundId) ||
        invitations.has(h.invitedId) ||
        p?.invitation?.memberId !== m.golferId ||
        p?.invitation?.tier !== h.tier
      )
        throw Error("Invalid membership invitation.");
      invitations.add(h.invitedId);
      reviewedRounds.add(h.roundId);
    }
  }
  for (const p of g.visitorPool)
    if (p.invitation !== undefined && !invitations.has(p.id))
      throw Error("Unrecorded membership invitation.");
}
