import type {
  ChampionshipResult,
  ChampionshipStanding,
  Difficulty,
  ProProfile,
  ProSkillId,
  ProChallengeOffer,
  ProChallengeResult,
  Hole,
  TouringPro,
  RoundRecord,
} from './types';

export interface ProSkillDefinition {
  id: ProSkillId;
  label: string;
  short: string;
  description: string;
}

/** Manual p.12, in the same order as the original skill-allocation screen. */
export const PRO_SKILLS: readonly ProSkillDefinition[] = [
  { id: 'powerHitter', label: 'Power Hitter', short: 'Power', description: 'Adds force to every full swing.' },
  { id: 'longDriver', label: 'Long Driver', short: 'Drive', description: 'Extends Driver carry.' },
  { id: 'accurateDriver', label: 'Accurate Driver', short: 'D-Acc', description: 'Tightens tee-shot dispersion.' },
  { id: 'accurateIrons', label: 'Accurate Irons', short: 'I-Acc', description: 'Tightens Iron and Wedge dispersion.' },
  { id: 'accuratePutter', label: 'Accurate Putter', short: 'Putt', description: 'Improves putting precision.' },
  { id: 'drawShot', label: 'Draw Shot', short: 'Draw', description: 'Controls right-to-left shaped shots.' },
  { id: 'fadeShot', label: 'Fade Shot', short: 'Fade', description: 'Controls left-to-right shaped shots.' },
  { id: 'highBackspin', label: 'High Backspin', short: 'Spin', description: 'Controls high stopping shots.' },
  { id: 'recovery', label: 'Recovery Skill', short: 'Recover', description: 'Restores carry and control from bad lies.' },
  { id: 'luck', label: 'Luck', short: 'Luck', description: 'Softens the worst shot dispersion.' },
] as const;

const emptySkills = (): Record<ProSkillId, number> => Object.fromEntries(PRO_SKILLS.map((skill) => [skill.id, 0])) as Record<ProSkillId, number>;
const emptyPractice = (): Record<ProSkillId, number> => Object.fromEntries(PRO_SKILLS.map((skill) => [skill.id, 0])) as Record<ProSkillId, number>;

export const PRO_PRACTICE_THRESHOLD = 100;

export interface ProPracticeFacilities {
  drivingRange: boolean;
  puttingGreen: boolean;
  proShop: boolean;
}

export interface ProPracticeSession {
  holes: number;
  earned: Record<ProSkillId, number>;
  facilities: string[];
}

export interface ProPracticeGain {
  id: ProSkillId;
  earned: number;
  progress: number;
  levels: number;
  level: number;
}

export interface ProPracticeResult {
  holes: number;
  practiceRound: number;
  facilities: string[];
  gains: ProPracticeGain[];
}

export function createResidentPro(): ProProfile {
  return {
    version: 1,
    name: 'Gary Golf',
    visualSeed: 'resident-pro',
    shirt: '#e9b53c',
    skin: '#f1c6a0',
    cap: '#fffdf2',
    skills: emptySkills(),
    practice: emptyPractice(),
    practiceRounds: 0,
    unspentSkillPoints: 10,
    accomplishments: [],
    starts: 0,
    wins: 0,
    podiums: 0,
    careerEarnings: 0,
    fame: 0,
  };
}

/** Balanced built-in pro offered alongside the player's saved resident pro. */
export function createDefaultTourPro(identity?: TouringPro): ProProfile {
  const profile = createResidentPro();
  profile.name = identity?.name ?? 'Gary Golf';
  profile.visualSeed = identity?.name ?? 'default-tour-pro';
  profile.shirt = identity?.shirt ?? '#3f7fd0';
  profile.skin = identity?.skin ?? profile.skin;
  profile.cap = identity?.cap ?? '#efefef';
  profile.unspentSkillPoints = 0;
  for (const skill of PRO_SKILLS) profile.skills[skill.id] = 1;
  return profile;
}

const validColor = (value: unknown, fallback: string) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;

export function sanitizeProProfile(value: unknown): ProProfile {
  const fallback = createResidentPro();
  if (!value || typeof value !== 'object') return fallback;
  const raw = value as Partial<ProProfile>;
  const skills = emptySkills();
  const practice = emptyPractice();
  for (const definition of PRO_SKILLS) {
    const level = Number(raw.skills?.[definition.id]);
    skills[definition.id] = Number.isFinite(level) ? Math.max(0, Math.min(10, Math.trunc(level))) : 0;
    const progress = Number(raw.practice?.[definition.id]);
    practice[definition.id] = skills[definition.id] >= 10 || !Number.isFinite(progress)
      ? 0
      : Math.max(0, Math.min(PRO_PRACTICE_THRESHOLD - 1, Math.trunc(progress)));
  }
  return {
    version: 1,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 28) : fallback.name,
    visualSeed: typeof raw.visualSeed === 'string' && raw.visualSeed.trim() ? raw.visualSeed.trim().slice(0, 64) : fallback.visualSeed,
    shirt: validColor(raw.shirt, fallback.shirt),
    skin: validColor(raw.skin, fallback.skin),
    cap: validColor(raw.cap, fallback.cap),
    skills,
    practice,
    practiceRounds: Math.max(0, Math.trunc(Number(raw.practiceRounds) || 0)),
    unspentSkillPoints: Math.max(0, Math.min(99, Math.trunc(Number(raw.unspentSkillPoints) || 0))),
    accomplishments: Array.isArray(raw.accomplishments) ? raw.accomplishments.filter((id): id is string => typeof id === 'string').slice(0, 100) : [],
    starts: Math.max(0, Math.trunc(Number(raw.starts) || 0)),
    wins: Math.max(0, Math.trunc(Number(raw.wins) || 0)),
    podiums: Math.max(0, Math.trunc(Number(raw.podiums) || 0)),
    careerEarnings: Math.max(0, Math.trunc(Number(raw.careerEarnings) || 0)),
    fame: Math.max(0, Math.trunc(Number(raw.fame) || 0)),
  };
}

const PRACTICE_RECOVERY_LIES = new Set(['deeprough', 'sand', 'waste', 'pot', 'stream', 'brush', 'rock', 'tree']);
const DRIVING_SKILLS = new Set<ProSkillId>(['powerHitter', 'longDriver', 'accurateDriver', 'drawShot', 'fadeShot']);
const SHORT_GAME_SKILLS = new Set<ProSkillId>(['accurateIrons', 'accuratePutter', 'highBackspin', 'recovery']);

/** Translate actual shot choices into a deterministic practice session. */
export function createProPracticeSession(record: RoundRecord, facilities: ProPracticeFacilities): ProPracticeSession {
  const earned = emptyPractice();
  for (const hole of record.card) {
    for (const shot of hole.shots) {
      if (shot.club === 'driver') {
        earned.accurateDriver += 4;
        if (shot.power >= 0.72) earned.longDriver += 3;
        if (shot.power >= 0.86) earned.powerHitter += 2;
      } else if (shot.club === 'putter') {
        earned.accuratePutter += 4;
      } else {
        earned.accurateIrons += 4;
        if (shot.power >= 0.86) earned.powerHitter += 1;
      }
      if (shot.shape === 'draw') earned.drawShot += 5;
      else if (shot.shape === 'hook') earned.drawShot += 6;
      else if (shot.shape === 'fade') earned.fadeShot += 5;
      else if (shot.shape === 'backspin') earned.highBackspin += 5;
      else if (shot.shape === 'punch') earned.recovery += 3;
      if (PRACTICE_RECOVERY_LIES.has(shot.fromLie)) earned.recovery += 6;
      if (shot.holed) earned.luck += 1;
    }
    if (hole.fairwayHit) earned.accurateDriver += 1;
    if (hole.greenInRegulation) earned.accurateIrons += 1;
    if (hole.relative <= 0) earned.luck += 2;
  }

  for (const skill of PRO_SKILLS) {
    let multiplier = facilities.proShop ? 1.2 : 1;
    if (facilities.drivingRange && DRIVING_SKILLS.has(skill.id)) multiplier += 0.5;
    if (facilities.puttingGreen && SHORT_GAME_SKILLS.has(skill.id)) multiplier += 0.5;
    earned[skill.id] = Math.round(earned[skill.id] * multiplier);
  }

  const facilityNames = [
    facilities.drivingRange && 'Driving Range',
    facilities.puttingGreen && 'Putting Green',
    facilities.proShop && 'Pro Shop',
  ].filter((name): name is string => !!name);
  return { holes: record.holesPlayed, earned, facilities: facilityNames };
}

/** Apply a completed session after any isolated competition course restores home. */
export function applyProPracticeSession(profile: ProProfile, session: ProPracticeSession): ProPracticeResult {
  profile.practiceRounds++;
  const gains: ProPracticeGain[] = [];
  for (const skill of PRO_SKILLS) {
    const earned = Math.max(0, Math.trunc(session.earned[skill.id]));
    if (profile.skills[skill.id] >= 10) {
      profile.practice[skill.id] = 0;
      continue;
    }
    if (!earned) continue;
    const total = profile.practice[skill.id] + earned;
    const levels = Math.min(10 - profile.skills[skill.id], Math.floor(total / PRO_PRACTICE_THRESHOLD));
    profile.skills[skill.id] += levels;
    profile.practice[skill.id] = profile.skills[skill.id] >= 10 ? 0 : total - levels * PRO_PRACTICE_THRESHOLD;
    gains.push({ id: skill.id, earned, progress: profile.practice[skill.id], levels, level: profile.skills[skill.id] });
  }
  gains.sort((a, b) => b.levels - a.levels || b.earned - a.earned || a.id.localeCompare(b.id));
  return { holes: session.holes, practiceRound: profile.practiceRounds, facilities: session.facilities, gains };
}

export function adjustProSkill(profile: ProProfile, id: ProSkillId, delta: -1 | 1): boolean {
  const current = profile.skills[id];
  if (delta > 0) {
    if (profile.unspentSkillPoints <= 0 || current >= 10) return false;
    profile.skills[id]++;
    if (profile.skills[id] >= 10) profile.practice[id] = 0;
    profile.unspentSkillPoints--;
    return true;
  }
  if (current <= 0) return false;
  profile.skills[id]--;
  profile.unspentSkillPoints++;
  return true;
}

export function proSkillMultiplier(profile: ProProfile, id: ProSkillId): number {
  return 1 + profile.skills[id] * 0.1;
}

const FIELD_NAMES = [
  'Ace Hollister', 'Molly Fairway', 'Bunker Beaumont', 'Carmen Links', 'Hank Hazards', 'Penny Pinseeker',
  'Rory Redwood', 'Tess Tumbler', 'Lionel Longdrive', 'Mags McMulligan', 'Sterling Green',
] as const;

const DIFFICULTY_TARGET: Record<Difficulty, number> = { easy: 5, moderate: 2, difficult: -1, impossible: -4 };
const DIFFICULTY_PRIZE: Record<Difficulty, number> = { easy: 0.75, moderate: 1, difficult: 1.3, impossible: 1.65 };

function hashUnit(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

export function championshipTitle(courseName: string, starts: number): string {
  const tiers = ['Club Open', 'Regional Classic', 'National Invitational', 'World Championship'];
  return `${courseName} ${tiers[Math.min(tiers.length - 1, Math.floor(starts / 3))]}`;
}

export function simulateChampionshipResult(
  record: RoundRecord,
  options: { id: string; title: string; courseId: string; difficulty: Difficulty; proName: string; fieldNames?: readonly string[] },
): ChampionshipResult {
  const scale = Math.max(1, record.holesPlayed) / 18;
  const target = DIFFICULTY_TARGET[options.difficulty] * scale;
  const fieldNames = [...new Set([...(options.fieldNames ?? []), ...FIELD_NAMES])].filter((name) => name !== options.proName).slice(0, 11);
  const field: ChampionshipStanding[] = fieldNames.map((name, index) => {
    const form = (hashUnit(`${options.id}:${name}`) - 0.5) * 8 * Math.sqrt(scale);
    const quality = ((index - 5) / 5) * 2.2 * scale;
    const scoreToPar = Math.round(target + form + quality);
    return { rank: 0, name, scoreToPar, strokes: Math.max(record.holesPlayed, record.par + scoreToPar), player: false };
  });
  field.push({ rank: 0, name: options.proName, scoreToPar: record.scoreToPar, strokes: record.strokes, player: true });
  field.sort((a, b) => a.scoreToPar - b.scoreToPar || a.strokes - b.strokes || Number(b.player) - Number(a.player) || a.name.localeCompare(b.name));
  field.forEach((standing, index) => standing.rank = index + 1);
  const player = field.find((standing) => standing.player)!;
  const basePrize = player.rank === 1 ? 5000 : player.rank === 2 ? 3000 : player.rank === 3 ? 1800 : player.rank <= 6 ? 700 : 0;
  const prize = Math.round(basePrize * DIFFICULTY_PRIZE[options.difficulty] / 50) * 50;
  const fame = player.rank === 1 ? 100 : player.rank === 2 ? 60 : player.rank === 3 ? 40 : player.rank <= 6 ? 20 : 8;
  return {
    id: options.id,
    title: options.title,
    playedAt: record.completedAt,
    courseId: options.courseId,
    courseName: record.courseName,
    difficulty: options.difficulty,
    proName: options.proName,
    recordId: record.id,
    rank: player.rank,
    prize,
    fame,
    standings: field,
  };
}

export function applyChampionshipCareer(profile: ProProfile, result: ChampionshipResult) {
  profile.starts++;
  if (result.rank === 1) profile.wins++;
  if (result.rank <= 3) profile.podiums++;
  profile.careerEarnings += result.prize;
  profile.fame += result.fame;
}

export const TOURING_PROS: readonly TouringPro[] = [
  { name: 'Ace Hollister', title: 'The Powerhouse', shirt: '#b33f35', skin: '#e0a878', cap: '#f1d066', length: .92, accuracy: .62, imagination: .55 },
  { name: 'Molly Fairway', title: 'The Pin Seeker', shirt: '#3f7fd0', skin: '#f1c6a0', cap: '#efefef', length: .61, accuracy: .94, imagination: .66 },
  { name: 'Carmen Links', title: 'The Shot Maker', shirt: '#8e5bc0', skin: '#c98a5e', cap: '#f0d36b', length: .65, accuracy: .73, imagination: .95 },
  { name: 'Bunker Beaumont', title: 'The Escape Artist', shirt: '#2fa48a', skin: '#8d5a3a', cap: '#fffdf2', length: .72, accuracy: .81, imagination: .84 },
  { name: 'Sterling Green', title: 'The Complete Pro', shirt: '#e9b53c', skin: '#6b4226', cap: '#263b31', length: .88, accuracy: .88, imagination: .88 },
  { name: 'Penny Pinseeker', title: 'The Strategist', shirt: '#d867a8', skin: '#f6d7b8', cap: '#3f7fd0', length: .58, accuracy: .91, imagination: .9 },
] as const;

export function createProChallengeOffer(sequence: number, reputation: number, themedPros?: readonly TouringPro[]): ProChallengeOffer {
  const field = themedPros?.length ? themedPros : TOURING_PROS;
  const opponent = field[Math.abs(sequence) % field.length];
  const prestige = Math.max(0, Math.min(1, (reputation - 2.5) / 2.5));
  const wagerPerHole = Math.round((75 + prestige * 175) / 25) * 25;
  return { id: `pro-challenge-${sequence}`, opponent: { ...opponent }, wagerPerHole, remaining: 120 };
}

export function sanitizeProChallengeOffer(value: unknown): ProChallengeOffer | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<ProChallengeOffer>;
  const opponent = raw.opponent as Partial<TouringPro> | undefined;
  if (typeof raw.id !== 'string' || !opponent || typeof opponent.name !== 'string') return null;
  const fallback = TOURING_PROS[0];
  const color = (candidate: unknown, defaultColor: string) => typeof candidate === 'string' && /^#[0-9a-f]{6}$/i.test(candidate) ? candidate : defaultColor;
  const ability = (candidate: unknown, defaultAbility: number) => Number.isFinite(Number(candidate)) ? Math.max(.2, Math.min(1, Number(candidate))) : defaultAbility;
  return {
    id: raw.id.slice(0, 100),
    opponent: {
      name: opponent.name.trim().slice(0, 40) || fallback.name,
      title: typeof opponent.title === 'string' ? opponent.title.trim().slice(0, 50) : fallback.title,
      shirt: color(opponent.shirt, fallback.shirt),
      skin: color(opponent.skin, fallback.skin),
      cap: color(opponent.cap, fallback.cap),
      length: ability(opponent.length, fallback.length),
      accuracy: ability(opponent.accuracy, fallback.accuracy),
      imagination: ability(opponent.imagination, fallback.imagination),
    },
    wagerPerHole: Math.max(25, Math.min(1000, Math.trunc(Number(raw.wagerPerHole) || 25))),
    remaining: Math.max(1, Math.min(300, Number(raw.remaining) || 60)),
  };
}

export function resolveProChallenge(
  record: RoundRecord,
  offer: ProChallengeOffer,
  holes: Pick<Hole, 'id' | 'interest' | 'skillDemand'>[],
): ProChallengeResult {
  const byId = new Map(holes.map((hole) => [hole.id, hole]));
  const results = record.card.map((card) => {
    const hole = byId.get(card.holeId);
    const demand = hole?.skillDemand ?? { length: 0, accuracy: 0, imagination: 0 };
    const demandTotal = demand.length + demand.accuracy + demand.imagination;
    const weightedAbility = demandTotal > 0
      ? (offer.opponent.length * demand.length + offer.opponent.accuracy * demand.accuracy + offer.opponent.imagination * demand.imagination) / demandTotal
      : (offer.opponent.length + offer.opponent.accuracy + offer.opponent.imagination) / 3;
    const form = (hashUnit(`${offer.id}:${card.holeId}`) - .5) * 2.6;
    const relative = Math.max(-2, Math.min(4, Math.round(1.45 - weightedAbility * 2 + (hole?.interest ?? 0) * .75 + form)));
    const opponentStrokes = Math.max(1, card.par + relative);
    const outcome = card.strokes < opponentStrokes ? 'won' : card.strokes > opponentStrokes ? 'lost' : 'tied';
    return { hole: card.hole, par: card.par, playerStrokes: card.strokes, opponentStrokes, outcome } as const;
  });
  const holesWon = results.filter((hole) => hole.outcome === 'won').length;
  const holesLost = results.filter((hole) => hole.outcome === 'lost').length;
  const holesTied = results.length - holesWon - holesLost;
  const net = (holesWon - holesLost) * offer.wagerPerHole;
  return {
    id: offer.id,
    playedAt: record.completedAt,
    opponent: { ...offer.opponent },
    proName: record.playerName,
    courseName: record.courseName,
    recordId: record.id,
    wagerPerHole: offer.wagerPerHole,
    holesWon,
    holesLost,
    holesTied,
    net,
    outcome: net > 0 ? 'won' : net < 0 ? 'lost' : 'tied',
    holes: results,
  };
}
