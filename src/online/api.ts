import type { CourseTheme, RoundRecord } from '../game/types';

const configuredOrigin = (import.meta.env.VITE_API_ORIGIN as string | undefined)?.replace(/\/$/u, '') ?? '';
let activeCsrfToken: string | undefined;

export interface OnlineUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  profileSlug: string;
  bio: string;
  discoverable: boolean;
}

export interface CloudSaveMetadata {
  id: string;
  slot: string;
  name: string;
  revision: number;
  courseHash: string;
  sizeBytes: number;
  createdAt: number;
  updatedAt: number;
}

export interface PublishedCourse {
  id: string;
  slug: string;
  name: string;
  owner: { id: string; displayName: string };
  theme: CourseTheme;
  courseHash: string;
  version: number;
  holes: number;
  par: number;
  visibility: 'public' | 'unlisted';
  publishedAt: number;
}

export interface OnlineCompetition {
  id: string;
  kind: 'daily' | 'weekly' | 'tournament';
  title: string;
  startsAt: number;
  endsAt: number;
  rules: { verification: string; attempts?: number | string; qualificationCut?: number; prizes?: number[] };
  course: {
    id: string;
    slug: string;
    name: string;
    courseHash: string;
    theme: CourseTheme;
    holes: number;
    par: number;
    owner: string;
  };
}

export interface OnlinePlayer {
  id: string;
  profileSlug: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  followers: number;
  following: number;
  publishedCourses: number;
  isFollowing: boolean;
}

export interface ChallengeScore {
  submissionId: string;
  scoreToPar: number;
  strokes: number;
  penalties: number;
  durationSeconds: number;
  verificationStatus: string;
}

export interface OnlineChallenge {
  id: string;
  inviteCode: string;
  title: string;
  status: 'pending' | 'active' | 'completed' | 'declined' | 'cancelled' | 'expired';
  role: 'creator' | 'opponent';
  createdAt: number;
  acceptedAt: number | null;
  expiresAt: number;
  completedAt: number | null;
  canPlay: boolean;
  winnerUserId: string | null;
  tied: boolean;
  creator: Pick<OnlinePlayer, 'id' | 'displayName' | 'avatarUrl' | 'profileSlug'> & { score: ChallengeScore | null };
  opponent: Pick<OnlinePlayer, 'id' | 'displayName' | 'avatarUrl' | 'profileSlug'> & { score: ChallengeScore | null };
  course: Pick<PublishedCourse, 'id' | 'slug' | 'name' | 'courseHash' | 'theme' | 'holes' | 'par'>;
}

export interface ChallengeScorecard {
  userId: string;
  displayName: string;
  strokes: number;
  par: number;
  scoreToPar: number;
  penalties: number;
  holes: Array<{ hole: number; par: number; strokes: number; scoreToPar: number; putts: number; penalties: number }>;
}

export interface AccountSession {
  id: string;
  createdAt: number;
  lastSeenAt: number;
  expiresAt: number;
  current: boolean;
}

interface ApiErrorBody {
  error?: { code?: string; message?: string };
}

export class OnlineApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
  }
}

function apiUrl(path: string): string {
  return `${configuredOrigin}${path}`;
}

function cookie(name: string): string | undefined {
  const prefix = `${name}=`;
  return document.cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix))?.slice(prefix.length);
}

function csrfToken(): string | undefined {
  return activeCsrfToken ?? cookie('__Host-fm_csrf') ?? cookie('fm_csrf');
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const method = (init.method ?? 'GET').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrf = csrfToken();
    if (csrf) headers.set('x-csrf-token', decodeURIComponent(csrf));
  }
  const response = await fetch(apiUrl(path), { ...init, headers, credentials: 'include' });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as ApiErrorBody;
    throw new OnlineApiError(response.status, body.error?.code ?? 'request_failed', body.error?.message ?? `Online request failed (${response.status}).`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function beginGoogleSignIn() {
  const returnTo = window.location.href.split('?')[0];
  window.location.assign(apiUrl(`/api/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`));
}

export async function getAccount(): Promise<OnlineUser | null> {
  const result = await apiRequest<{ user: OnlineUser | null; csrfToken?: string | null }>('/api/auth/me');
  activeCsrfToken = result.csrfToken ?? undefined;
  return result.user;
}

export async function signOut(): Promise<void> {
  await apiRequest('/api/auth/logout', { method: 'POST' });
  activeCsrfToken = undefined;
}

export async function listCloudSaves(): Promise<CloudSaveMetadata[]> {
  return (await apiRequest<{ saves: CloudSaveMetadata[] }>('/api/saves')).saves;
}

export async function uploadCloudSave(slot: string, input: { name: string; expectedRevision: number; courseHash: string; snapshot: Record<string, unknown> }): Promise<CloudSaveMetadata> {
  return (await apiRequest<{ save: CloudSaveMetadata }>(`/api/saves/${encodeURIComponent(slot)}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })).save;
}

export async function downloadCloudSave(slot: string): Promise<{ metadata: CloudSaveMetadata; snapshot: Record<string, unknown> }> {
  const result = await apiRequest<{ save: CloudSaveMetadata & { snapshot: Record<string, unknown> } }>(`/api/saves/${encodeURIComponent(slot)}`);
  const { snapshot, ...metadata } = result.save;
  return { metadata, snapshot };
}

export async function removeCloudSave(slot: string, revision: number): Promise<void> {
  await apiRequest(`/api/saves/${encodeURIComponent(slot)}`, { method: 'DELETE', headers: { 'if-match': `"${revision}"` } });
}

export async function publishCurrentCourse(input: {
  name: string;
  theme: CourseTheme;
  courseHash: string;
  holes: number;
  par: number;
  visibility: 'public' | 'unlisted';
  snapshot: Record<string, unknown>;
}): Promise<PublishedCourse> {
  return (await apiRequest<{ course: PublishedCourse }>('/api/courses', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })).course;
}

export async function listPublishedCourses(): Promise<PublishedCourse[]> {
  return (await apiRequest<{ courses: PublishedCourse[] }>('/api/courses?limit=50')).courses;
}

export async function listMyPublishedCourses(): Promise<PublishedCourse[]> {
  return (await apiRequest<{ courses: PublishedCourse[] }>('/api/me/courses')).courses;
}

export async function listCompetitions(archive = false): Promise<{ competitions: OnlineCompetition[]; serverTime: number }> {
  return apiRequest(`/api/competitions${archive ? '?status=archive' : ''}`);
}

export async function downloadPublishedCourse(slug: string): Promise<{ course: PublishedCourse & { snapshot: Record<string, unknown> } }> {
  return apiRequest(`/api/courses/${encodeURIComponent(slug)}`);
}

export async function downloadCompetitionCourse(competitionId: string): Promise<{ course: OnlineCompetition['course'] & { snapshot: Record<string, unknown> } }> {
  return apiRequest(`/api/competitions/${encodeURIComponent(competitionId)}/course`);
}

export async function submitCompetitionRound(record: RoundRecord): Promise<{ id?: string; verificationStatus: string }> {
  if (!record.competitionId) throw new OnlineApiError(422, 'competition_missing', 'This scorecard is not attached to a competition.');
  return (await apiRequest<{ submission: { id?: string; verificationStatus: string } }>(`/api/competitions/${encodeURIComponent(record.competitionId)}/submissions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ competitionId: record.competitionId, round: record }),
  })).submission;
}

export async function getLeaderboard(competitionId: string, friends = false) {
  return apiRequest<{
    leaderboard: Array<{
      rank: number;
      player: { displayName: string; avatarUrl: string | null };
      scoreToPar: number;
      strokes: number;
      verificationStatus: string;
    }>;
  }>(`/api/competitions/${encodeURIComponent(competitionId)}/${friends ? 'friends-leaderboard' : 'leaderboard'}`);
}

export interface SeasonStanding {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  points: number;
  events: number;
  wins: number;
  podiums: number;
  isFollowing: boolean;
}

export async function getSeasonStandings(friends = false): Promise<{
  season: { id: string; startsAt: number; endsAt: number };
  scope: 'global' | 'friends';
  standings: SeasonStanding[];
  me: SeasonStanding | null;
}> {
  return apiRequest(`/api/seasons/current${friends ? '?scope=friends' : ''}`);
}

export async function listPlayers(query = '', following = false): Promise<OnlinePlayer[]> {
  const params = new URLSearchParams();
  if (query.trim()) params.set('query', query.trim());
  if (following) params.set('following', '1');
  return (await apiRequest<{ players: OnlinePlayer[] }>(`/api/players?${params}`)).players;
}

export async function followPlayer(playerId: string): Promise<void> {
  await apiRequest(`/api/players/${encodeURIComponent(playerId)}/follow`, { method: 'POST' });
}

export async function unfollowPlayer(playerId: string): Promise<void> {
  await apiRequest(`/api/players/${encodeURIComponent(playerId)}/follow`, { method: 'DELETE' });
}

export async function updateOnlineProfile(input: { displayName: string; bio: string; discoverable: boolean }): Promise<OnlineUser> {
  return (await apiRequest<{ user: OnlineUser }>('/api/profile', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })).user;
}

export async function listChallenges(): Promise<OnlineChallenge[]> {
  return (await apiRequest<{ challenges: OnlineChallenge[] }>('/api/challenges')).challenges;
}

export async function createChallenge(opponentId: string, courseSlug: string, title?: string): Promise<OnlineChallenge> {
  return (await apiRequest<{ challenge: OnlineChallenge }>('/api/challenges', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ opponentId, courseSlug, ...(title?.trim() ? { title: title.trim() } : {}) }),
  })).challenge;
}

export async function acceptChallenge(challengeId: string): Promise<OnlineChallenge> {
  return (await apiRequest<{ challenge: OnlineChallenge }>(`/api/challenges/${encodeURIComponent(challengeId)}/accept`, { method: 'POST' })).challenge;
}

export async function declineChallenge(challengeId: string): Promise<void> {
  await apiRequest(`/api/challenges/${encodeURIComponent(challengeId)}/decline`, { method: 'POST' });
}

export async function cancelChallenge(challengeId: string): Promise<void> {
  await apiRequest(`/api/challenges/${encodeURIComponent(challengeId)}/cancel`, { method: 'POST' });
}

export async function downloadChallengeCourse(challengeId: string): Promise<{ course: OnlineChallenge['course'] & { snapshot: Record<string, unknown> } }> {
  return apiRequest(`/api/challenges/${encodeURIComponent(challengeId)}/course`);
}

export async function submitChallengeRound(record: RoundRecord): Promise<{ id?: string; verificationStatus: string }> {
  if (!record.challengeId) throw new OnlineApiError(422, 'challenge_missing', 'This scorecard is not attached to a challenge.');
  return (await apiRequest<{ submission: { id?: string; verificationStatus: string } }>(`/api/challenges/${encodeURIComponent(record.challengeId)}/submissions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ challengeId: record.challengeId, round: record }),
  })).submission;
}

export async function getChallengeScorecards(challengeId: string): Promise<ChallengeScorecard[]> {
  return (await apiRequest<{ scorecards: ChallengeScorecard[] }>(`/api/challenges/${encodeURIComponent(challengeId)}/scorecards`)).scorecards;
}

export async function listAccountSessions(): Promise<AccountSession[]> {
  return (await apiRequest<{ sessions: AccountSession[] }>('/api/account/sessions')).sessions;
}

export async function revokeAccountSession(sessionId: string): Promise<{ currentSessionRevoked: boolean }> {
  return apiRequest(`/api/account/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
}

export async function deleteOnlineAccount(): Promise<void> {
  await apiRequest('/api/account', {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ confirmation: 'DELETE' }),
  });
  activeCsrfToken = undefined;
}

export async function syncProfileRounds(localRounds: RoundRecord[]): Promise<{ rounds: RoundRecord[]; imported: number }> {
  let imported = 0;
  for (let index = 0; index < localRounds.length; index += 5) {
    const batch = localRounds.slice(index, index + 5);
    if (!batch.length) continue;
    const result = await apiRequest<{ imported: number }>('/api/profile/rounds/import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ rounds: batch }),
    });
    imported += result.imported;
  }

  const rounds: RoundRecord[] = [];
  let offset: number | null = 0;
  while (offset !== null && rounds.length < 200) {
    const page: { rounds: RoundRecord[]; nextOffset: number | null } = await apiRequest(`/api/profile/rounds?offset=${offset}`);
    rounds.push(...page.rounds);
    offset = page.nextOffset;
  }
  return { rounds, imported };
}
