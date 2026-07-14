import { CLUBS } from './constants';
import type { ClubId, LieKey } from './types';

export interface ClubLieProfile {
  available: boolean;
  reason: string | null;
  /** Multiplies the lie's carry after the club's base range multiplier. */
  carryMultiplier: number;
  /** Lower values tighten the angular component of shot dispersion. */
  dispersionMultiplier: number;
  launchMultiplier: number;
  rolloutMultiplier: number;
  role: string;
}

interface LieTuning {
  carry: number;
  dispersion: number;
}

const DEFAULT_TUNING: LieTuning = { carry: 1, dispersion: 1 };

/**
 * Lie-specific contact quality. The terrain's own LIE table remains authoritative for
 * raw difficulty; these values express how each club copes with that same lie.
 */
const LIE_TUNING: Record<ClubId, Partial<Record<LieKey, LieTuning>>> = {
  driver: {
    rough: { carry: 0.72, dispersion: 1.25 },
    flower: { carry: 0.72, dispersion: 1.25 },
    bridge: { carry: 0.82, dispersion: 1.15 },
  },
  threeWood: {
    rough: { carry: 0.76, dispersion: 1.18 },
    flower: { carry: 0.76, dispersion: 1.18 },
    bridge: { carry: 0.86, dispersion: 1.1 },
  },
  fiveWood: {
    rough: { carry: 0.82, dispersion: 1.12 },
    flower: { carry: 0.82, dispersion: 1.12 },
    bridge: { carry: 0.9, dispersion: 1.06 },
  },
  lobWedge: {
    rough: { carry: 1, dispersion: 0.88 },
    flower: { carry: 1, dispersion: 0.88 },
    deeprough: { carry: 1, dispersion: 0.8 },
    sand: { carry: 1, dispersion: 0.74 },
    waste: { carry: 0.96, dispersion: 0.8 },
    pot: { carry: 1, dispersion: 0.72 },
    stream: { carry: 0.9, dispersion: 0.84 },
    brush: { carry: 0.92, dispersion: 0.82 },
    rock: { carry: 0.92, dispersion: 0.84 },
    tree: { carry: 0.94, dispersion: 0.8 },
  },
  iron: {
    rough: { carry: 0.9, dispersion: 1.05 },
    flower: { carry: 0.9, dispersion: 1.05 },
    deeprough: { carry: 0.68, dispersion: 1.08 },
    sand: { carry: 0.58, dispersion: 1.12 },
    waste: { carry: 0.62, dispersion: 1.14 },
    pot: { carry: 0.42, dispersion: 1.2 },
    stream: { carry: 0.5, dispersion: 1.18 },
    brush: { carry: 0.48, dispersion: 1.18 },
    rock: { carry: 0.56, dispersion: 1.16 },
    tree: { carry: 0.54, dispersion: 1.12 },
  },
  wedge: {
    rough: { carry: 1, dispersion: 0.92 },
    flower: { carry: 1, dispersion: 0.92 },
    deeprough: { carry: 0.96, dispersion: 0.88 },
    sand: { carry: 1, dispersion: 0.82 },
    waste: { carry: 0.94, dispersion: 0.88 },
    pot: { carry: 1, dispersion: 0.82 },
    stream: { carry: 0.88, dispersion: 0.92 },
    brush: { carry: 0.9, dispersion: 0.9 },
    rock: { carry: 0.9, dispersion: 0.92 },
    tree: { carry: 0.92, dispersion: 0.88 },
  },
};

export const SEVERE_RECOVERY_LIES = new Set<LieKey>([
  'deeprough', 'sand', 'waste', 'pot', 'stream', 'brush', 'rock', 'tree', 'water',
]);

const LIE_NAMES: Partial<Record<LieKey, string>> = {
  deeprough: 'deep rough', sand: 'sand', waste: 'waste bunker', pot: 'pot bunker',
  stream: 'stream', brush: 'brush', rock: 'rocks', tree: 'trees', water: 'water',
};

/** The single source of truth for how a selected club behaves from a particular lie. */
export function clubLieProfile(lie: LieKey, clubId: ClubId): ClubLieProfile {
  const club = CLUBS[clubId];
  const unavailable = (clubId === 'driver' || clubId === 'threeWood' || clubId === 'fiveWood') && SEVERE_RECOVERY_LIES.has(lie);
  const tuning = LIE_TUNING[clubId][lie] ?? DEFAULT_TUNING;
  return {
    available: !unavailable,
    reason: unavailable ? `${club.label} unavailable · ${LIE_NAMES[lie] ?? 'recovery lie'}` : null,
    carryMultiplier: tuning.carry,
    dispersionMultiplier: club.angScale * tuning.dispersion,
    launchMultiplier: club.launchMul,
    rolloutMultiplier: club.rollMul,
    role: club.role,
  };
}

/** Preserve a legal selection after landing; severe recoveries deliberately reach for Lob Wedge. */
export function fallbackClubForLie(lie: LieKey, selected: ClubId): ClubId {
  if (clubLieProfile(lie, selected).available) return selected;
  if (clubLieProfile(lie, 'lobWedge').available) return 'lobWedge';
  if (clubLieProfile(lie, 'wedge').available) return 'wedge';
  return 'fiveWood';
}
