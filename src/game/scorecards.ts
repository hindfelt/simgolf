import type { PlayerRound, RoundRecord } from './types';
export { courseFingerprint } from '../shared/courseFingerprint';

export const ROUND_HISTORY_LIMIT = 200;

export interface RoundRecordContext {
  player: PlayerRound;
  playerName?: string;
  courseName: string;
  courseTheme: RoundRecord['courseTheme'];
  completedAt: number;
  payout: number;
}

/** Collapse the detailed in-progress card into the immutable summary used by history,
 * exports and future leaderboard submissions. */
export function buildRoundRecord({ player, playerName = 'Course Owner', courseName, courseTheme, completedAt, payout }: RoundRecordContext): RoundRecord {
  const card = player.card.map((hole) => ({
    ...hole,
    wind: { ...hole.wind },
    ...(hole.weather ? { weather: { ...hole.weather } } : {}),
    hazards: [...hole.hazards],
    shots: hole.shots.map((shot) => ({ ...shot, start: { ...shot.start }, end: { ...shot.end }, events: [...shot.events] })),
  }));
  const par = card.reduce((sum, hole) => sum + hole.par, 0);
  const strokes = card.reduce((sum, hole) => sum + hole.strokes, 0);
  const diffs = card.map((hole) => hole.relative);
  const allShots = card.flatMap((hole) => hole.shots);
  return {
    version: 1,
    id: player.id,
    playerName,
    source: player.source,
    ...(player.localEvent ? { localEvent: player.localEvent } : {}),
    ...(player.competitionId ? { competitionId: player.competitionId } : {}),
    ...(player.challengeId ? { challengeId: player.challengeId } : {}),
    startedAt: player.startedAt,
    completedAt,
    durationSeconds: Math.max(0, Math.round((completedAt - player.startedAt) / 1000)),
    courseName: courseName.trim().slice(0, 40) || 'Fairway Mogul',
    courseTheme,
    courseHash: player.courseHash,
    holesPlayed: card.length,
    par,
    strokes,
    scoreToPar: strokes - par,
    payout,
    eagles: diffs.filter((diff) => diff <= -2).length,
    birdies: diffs.filter((diff) => diff === -1).length,
    pars: diffs.filter((diff) => diff === 0).length,
    bogeys: diffs.filter((diff) => diff > 0).length,
    penalties: card.reduce((sum, hole) => sum + hole.penalties, 0),
    putts: card.reduce((sum, hole) => sum + hole.putts, 0),
    fairwaysHit: card.filter((hole) => hole.fairwayHit === true).length,
    fairwayOpportunities: card.filter((hole) => hole.fairwayHit !== null).length,
    greensInRegulation: card.filter((hole) => hole.greenInRegulation).length,
    longestShot: allShots.reduce((best, shot) => Math.max(best, shot.distance), 0),
    card,
  };
}

export function compareRoundScore(a: RoundRecord, b: RoundRecord): number {
  return a.scoreToPar - b.scoreToPar || a.strokes - b.strokes || a.durationSeconds - b.durationSeconds || a.completedAt - b.completedAt;
}

export function isCourseRecord(record: RoundRecord, history: RoundRecord[]): boolean {
  return !history.some((other) => other.id !== record.id && other.courseHash === record.courseHash && other.holesPlayed === record.holesPlayed && compareRoundScore(other, record) < 0);
}

export function isPersonalBest(record: RoundRecord, history: RoundRecord[]): boolean {
  return !history.some((other) => other.id !== record.id && other.holesPlayed === record.holesPlayed && compareRoundScore(other, record) < 0);
}

export function relativeScoreLabel(score: number): string {
  return score === 0 ? 'E' : score > 0 ? `+${score}` : String(score);
}

function validNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Defensive profile read. Invalid records are dropped instead of poisoning the course save. */
export function sanitizeRoundHistory(value: unknown): RoundRecord[] {
  if (!Array.isArray(value)) return [];
  const out: RoundRecord[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;
    const record = raw as Partial<RoundRecord>;
    if (
      record.version !== 1 ||
      typeof record.id !== 'string' ||
      typeof record.courseHash !== 'string' ||
      typeof record.courseName !== 'string' ||
      !validNumber(record.completedAt) ||
      !validNumber(record.par) ||
      !validNumber(record.strokes) ||
      !validNumber(record.scoreToPar) ||
      !Array.isArray(record.card)
    )
      continue;
    const themes = ['parklands', 'links', 'desert', 'tropical'];
    if (!themes.includes(record.courseTheme ?? '')) continue;
    if (record.card.some((hole) => !hole || !validNumber(hole.par) || !validNumber(hole.strokes) || !Array.isArray(hole.shots))) continue;
    out.push(record as RoundRecord);
  }
  out.sort((a, b) => a.completedAt - b.completedAt);
  return out.slice(-ROUND_HISTORY_LIMIT);
}

const csvCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;

export function roundToCsv(record: RoundRecord): string {
  const rows: (string | number)[][] = [
    ['Fairway Mogul scorecard'],
    ['Round ID', record.id],
    ['Player', record.playerName],
    ['Course', record.courseName],
    ['Course hash', record.courseHash],
    ['Completed', new Date(record.completedAt).toISOString()],
    ['Source', record.source],
    [],
    ['Hole', 'Par', 'Score', '+/-', 'Putts', 'Penalties', 'Fairway', 'GIR', 'Weather', 'Wind', 'Hazards'],
    ...record.card.map((hole) => [
      hole.hole,
      hole.par,
      hole.strokes,
      relativeScoreLabel(hole.relative),
      hole.putts,
      hole.penalties,
      hole.fairwayHit === null ? 'N/A' : hole.fairwayHit ? 'Hit' : 'Miss',
      hole.greenInRegulation ? 'Yes' : 'No',
      hole.weather?.condition ?? 'clear',
      Math.round(hole.wind.speed * 25) + ' mph',
      hole.hazards.join('; '),
    ]),
    [],
    ['Total', record.par, record.strokes, relativeScoreLabel(record.scoreToPar), record.putts, record.penalties],
  ];
  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}

export function roundHistoryToJson(history: RoundRecord[]): string {
  return JSON.stringify({ version: 1, exportedAt: Date.now(), rounds: history }, null, 2);
}
