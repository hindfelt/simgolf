import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { courseFingerprint } from '../../src/shared/courseFingerprint';
import { app } from '../src/index';
import { sha256, signTransaction, verifyTransaction } from '../src/security';
import { finalizeEndedCompetitions, seasonId } from '../src/progression';

const API = 'http://localhost:8787';
const SESSION_TOKEN = 'test-browser-session-token';
const CSRF_TOKEN = 'test-csrf-token';
const OPPONENT_SESSION_TOKEN = 'opponent-browser-session-token';
const OPPONENT_CSRF_TOKEN = 'opponent-csrf-token';

function courseSnapshot() {
  return {
    v: 2 as const,
    courseName: 'Test Links',
    theme: 'links',
    sandbox: false,
    cash: 20_000,
    fee: 20,
    rep: 2.5,
    rot: 0,
    served: 0,
    lost: 0,
    tiles: Array(64 * 48).fill(0) as number[],
    elevC: Array((64 + 1) * (48 + 1)).fill(0) as number[],
    owned: Array(16).fill(1) as number[],
    holes: [{ id: 1, tee: { x: 5, y: 5 }, cup: { x: 12, y: 5 }, par: 3 }],
    buildings: [],
    employees: [],
    golfers: [],
    regulars: [],
    tournamentHostedEver: false,
    goalsAchieved: {},
    comments: [],
    history: [],
  };
}

async function request(path: string, init?: RequestInit) {
  return app.request(`${API}${path}`, init, env);
}

async function seedSession() {
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO users (id, google_sub, email, display_name, avatar_url, created_at, updated_at, last_login_at)
      VALUES ('user-1', 'google-1', 'greenkeeper@example.com', 'Green Keeper', NULL, ?, ?, ?)
    `).bind(now, now, now),
    env.DB.prepare(`
      INSERT INTO sessions (id, user_id, token_hash, csrf_hash, created_at, expires_at, last_seen_at)
      VALUES ('session-1', 'user-1', ?, ?, ?, ?, ?)
    `).bind(await sha256(SESSION_TOKEN), await sha256(CSRF_TOKEN), now, now + 60_000, now),
  ]);
}

async function seedOpponentSession() {
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO users (id, google_sub, email, display_name, avatar_url, profile_slug, created_at, updated_at, last_login_at)
      VALUES ('user-2', 'google-2', 'club-pro@example.com', 'Club Pro', NULL, 'player-club-pro', ?, ?, ?)
    `).bind(now, now, now),
    env.DB.prepare(`
      INSERT INTO sessions (id, user_id, token_hash, csrf_hash, created_at, expires_at, last_seen_at)
      VALUES ('session-2', 'user-2', ?, ?, ?, ?, ?)
    `).bind(await sha256(OPPONENT_SESSION_TOKEN), await sha256(OPPONENT_CSRF_TOKEN), now, now + 60_000, now),
  ]);
}

function authHeaders(includeCsrf = true): Record<string, string> {
  return {
    cookie: `fm_session=${SESSION_TOKEN}; fm_csrf=${CSRF_TOKEN}`,
    origin: 'http://localhost:5173',
    ...(includeCsrf ? { 'x-csrf-token': CSRF_TOKEN } : {}),
  };
}

function opponentAuthHeaders(includeCsrf = true): Record<string, string> {
  return {
    cookie: `fm_session=${OPPONENT_SESSION_TOKEN}; fm_csrf=${OPPONENT_CSRF_TOKEN}`,
    origin: 'http://localhost:5173',
    ...(includeCsrf ? { 'x-csrf-token': OPPONENT_CSRF_TOKEN } : {}),
  };
}

function scorecard(event: { id: string; source: 'exhibition' | 'daily' | 'weekly' | 'tournament' | 'challenge'; courseHash: string; roundId: string; score?: number }) {
  const score = event.score ?? 0;
  const completedAt = Date.now();
  return {
    version: 1,
    id: event.roundId,
    playerName: 'Test Player',
    source: event.source,
    ...(event.source === 'challenge' ? { challengeId: event.id } : event.source === 'exhibition' ? {} : { competitionId: event.id }),
    startedAt: completedAt - 100_000,
    completedAt,
    durationSeconds: 100,
    courseName: 'Test Links',
    courseTheme: 'links',
    courseHash: event.courseHash,
    holesPlayed: 1,
    par: 3,
    strokes: 3 + score,
    scoreToPar: score,
    payout: 0,
    eagles: 0,
    birdies: 0,
    pars: score === 0 ? 1 : 0,
    bogeys: score > 0 ? 1 : 0,
    penalties: 0,
    putts: 2,
    fairwaysHit: 0,
    fairwayOpportunities: 0,
    greensInRegulation: score === 0 ? 1 : 0,
    longestShot: 7,
    card: [{
      hole: 1,
      holeId: 1,
      par: 3,
      distance: 7,
      strokes: 3 + score,
      relative: score,
      penalties: 0,
      putts: 2,
      fairwayHit: null,
      greenInRegulation: score === 0,
      hazards: [],
      wind: { dx: 1, dy: 0, speed: 0.2 },
      weather: { condition: 'drizzle', intensity: 0.35, wetness: 0.5 },
      shots: [{ stroke: 1, club: 'iron', shape: 'hook', fromLie: 'tee', resultLie: 'green', power: 0.8, intendedDistance: 7, distance: 7, start: { x: 5, y: 5 }, end: { x: 12, y: 5 }, events: [], penalty: 0, holed: false }],
    }],
  };
}

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM competition_awards'),
    env.DB.prepare('DELETE FROM competition_finalizations'),
    env.DB.prepare('DELETE FROM round_submissions'),
    env.DB.prepare('DELETE FROM challenge_submissions'),
    env.DB.prepare('DELETE FROM challenges'),
    env.DB.prepare('DELETE FROM follows'),
    env.DB.prepare('DELETE FROM competitions'),
    env.DB.prepare('DELETE FROM published_courses'),
    env.DB.prepare('DELETE FROM cloud_saves'),
    env.DB.prepare('DELETE FROM sessions'),
    env.DB.prepare('DELETE FROM users'),
  ]);
});

describe('Fairway Mogul Worker API', () => {
  it('reports health and a signed-out account without leaking configuration', async () => {
    const health = await request('/api/health');
    expect(health.status).toBe(200);
    expect(await health.json()).toMatchObject({ ok: true, service: 'fairway-mogul-api' });
    expect(health.headers.get('x-content-type-options')).toBe('nosniff');

    const me = await request('/api/auth/me');
    expect(await me.json()).toEqual({ user: null });
  });

  it('signs and rejects tampered short-lived OAuth transactions', async () => {
    const transaction = { state: 'state', nonce: 'nonce', verifier: 'verifier', returnTo: 'http://localhost:5173/', expiresAt: Date.now() + 5_000 };
    const signed = await signTransaction(transaction, env.SESSION_SECRET);
    expect(await verifyTransaction(signed, env.SESSION_SECRET)).toEqual(transaction);
    expect(await verifyTransaction(`${signed}x`, env.SESSION_SECRET)).toBeNull();
    expect(await verifyTransaction(signed, env.SESSION_SECRET, transaction.expiresAt + 1)).toBeNull();
  });

  it('requires authentication and CSRF protection for cloud mutations', async () => {
    const anonymous = await request('/api/saves');
    expect(anonymous.status).toBe(401);

    await seedSession();
    const snapshot = courseSnapshot();
    const courseHash = courseFingerprint(snapshot);
    const missingCsrf = await request('/api/saves/main', {
      method: 'PUT',
      headers: { ...authHeaders(false), 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Main', expectedRevision: 0, courseHash, snapshot }),
    });
    expect(missingCsrf.status).toBe(403);
  });

  it('lists account sessions and anonymizes personal data on confirmed deletion', async () => {
    await seedSession();
    const sessions = await request('/api/account/sessions', { headers: authHeaders(false) });
    expect(await sessions.json()).toMatchObject({ sessions: [{ id: 'session-1', current: true }] });

    const snapshot = courseSnapshot();
    const profileRound = { ...scorecard({ id: '', source: 'exhibition', courseHash: courseFingerprint(snapshot), roundId: 'profile-round-1' }), source: 'tournament' as const, localEvent: 'proChallenge' as const };
    const imported = await request('/api/profile/rounds/import', {
      method: 'POST',
      headers: { ...authHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ rounds: [profileRound] }),
    });
    expect(await imported.json()).toEqual({ imported: 1 });
    const archive = await request('/api/profile/rounds?offset=0', { headers: authHeaders(false) });
    expect(await archive.json()).toMatchObject({ rounds: [{ id: 'profile-round-1', source: 'tournament', localEvent: 'proChallenge' }] });

    const rejected = await request('/api/account', {
      method: 'DELETE',
      headers: { ...authHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ confirmation: 'NO' }),
    });
    expect(rejected.status).toBe(422);

    const deleted = await request('/api/account', {
      method: 'DELETE',
      headers: { ...authHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ confirmation: 'DELETE' }),
    });
    expect(deleted.status).toBe(200);
    const user = await env.DB.prepare('SELECT email, display_name, avatar_url, discoverable, deleted_at FROM users WHERE id = ?')
      .bind('user-1').first<{ email: string; display_name: string; avatar_url: string | null; discoverable: number; deleted_at: number | null }>();
    expect(user).toMatchObject({ display_name: 'Deleted Player', avatar_url: null, discoverable: 0 });
    expect(user?.email).toContain('@invalid.local');
    expect(user?.deleted_at).toBeTypeOf('number');
    expect((await env.DB.prepare('SELECT COUNT(*) AS total FROM sessions WHERE user_id = ?').bind('user-1').first<{ total: number }>())?.total).toBe(0);
    expect((await env.DB.prepare('SELECT COUNT(*) AS total FROM profile_rounds WHERE user_id = ?').bind('user-1').first<{ total: number }>())?.total).toBe(0);
  });

  it('stores versioned cloud saves and detects stale writers', async () => {
    await seedSession();
    const snapshot = courseSnapshot();
    const courseHash = courseFingerprint(snapshot);
    const body = JSON.stringify({ name: 'Main course', expectedRevision: 0, courseHash, snapshot });
    const created = await request('/api/saves/main', {
      method: 'PUT',
      headers: { ...authHeaders(), 'content-type': 'application/json' },
      body,
    });
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({ save: { slot: 'main', revision: 1, courseHash } });

    const stale = await request('/api/saves/main', {
      method: 'PUT',
      headers: { ...authHeaders(), 'content-type': 'application/json' },
      body,
    });
    expect(stale.status).toBe(409);
    expect(await stale.json()).toMatchObject({ error: { code: 'save_conflict', details: { currentRevision: 1 } } });

    const loaded = await request('/api/saves/main', { headers: authHeaders(false) });
    expect(await loaded.json()).toMatchObject({ save: { snapshot: { courseName: 'Test Links' } } });
  });

  it('publishes validated courses and creates playable daily and weekly leaderboards', async () => {
    await seedSession();
    const snapshot = courseSnapshot();
    const courseHash = courseFingerprint(snapshot);
    const publish = await request('/api/courses', {
      method: 'POST',
      headers: { ...authHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Test Links', theme: 'links', courseHash, holes: 1, par: 3, visibility: 'public', snapshot }),
    });
    expect(publish.status).toBe(201);
    const published = await publish.json<{ course: { slug: string } }>();

    const course = await request(`/api/courses/${published.course.slug}`);
    expect(await course.json()).toMatchObject({ course: { courseHash, snapshot: { theme: 'links' } } });

    const competitionsResponse = await request('/api/competitions');
    const competitions = await competitionsResponse.json<{ competitions: Array<{ id: string; kind: string; course: { courseHash: string } }> }>();
    expect(competitions.competitions.map((item) => item.kind).sort()).toEqual(['daily', 'tournament', 'weekly']);
    const daily = competitions.competitions.find((item) => item.kind === 'daily');
    const tournament = competitions.competitions.find((item) => item.kind === 'tournament');
    expect(daily?.course.courseHash).toBe(courseHash);
    expect(tournament?.course.courseHash).toBe(courseHash);

    const round = scorecard({ id: daily!.id, source: 'daily', courseHash, roundId: 'round-test-0001' });
    const submission = await request(`/api/competitions/${daily!.id}/submissions`, {
      method: 'POST',
      headers: { ...authHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ competitionId: daily!.id, round }),
    });
    expect(submission.status).toBe(201);
    expect(await submission.json()).toMatchObject({ submission: { verificationStatus: 'provisional' } });

    const leaderboard = await request(`/api/competitions/${daily!.id}/leaderboard`);
    expect(await leaderboard.json()).toMatchObject({ leaderboard: [{ rank: 1, player: { displayName: 'Green Keeper' }, scoreToPar: 0 }] });
    const friendsBoard = await request(`/api/competitions/${daily!.id}/friends-leaderboard`, { headers: authHeaders(false) });
    expect(await friendsBoard.json()).toMatchObject({ scope: 'friends', leaderboard: [{ rank: 1, player: { displayName: 'Green Keeper' } }] });

    const tournamentRound = scorecard({ id: tournament!.id, source: 'tournament', courseHash, roundId: 'tournament-round-1' });
    const tournamentEntry = await request(`/api/competitions/${tournament!.id}/submissions`, {
      method: 'POST',
      headers: { ...authHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ competitionId: tournament!.id, round: tournamentRound }),
    });
    expect(tournamentEntry.status).toBe(201);
    const secondTournamentRound = scorecard({ id: tournament!.id, source: 'tournament', courseHash, roundId: 'tournament-round-2' });
    const secondTournamentEntry = await request(`/api/competitions/${tournament!.id}/submissions`, {
      method: 'POST',
      headers: { ...authHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ competitionId: tournament!.id, round: secondTournamentRound }),
    });
    expect(secondTournamentEntry.status).toBe(409);

    const endedAt = Date.now() - 1;
    await env.DB.batch([
      env.DB.prepare('UPDATE competitions SET ends_at = ? WHERE id = ?').bind(endedAt, daily!.id),
      env.DB.prepare('UPDATE competitions SET ends_at = ? WHERE id = ?').bind(endedAt, tournament!.id),
    ]);
    expect(await finalizeEndedCompetitions(env.DB, Date.now())).toEqual({ finalized: 2, awards: 2 });
    expect(await finalizeEndedCompetitions(env.DB, Date.now())).toEqual({ finalized: 0, awards: 0 });
    const standings = await request(`/api/seasons/${seasonId(endedAt)}`, { headers: authHeaders(false) });
    expect(await standings.json()).toMatchObject({ standings: [{ rank: 1, userId: 'user-1', points: 550, events: 2, wins: 2 }], me: { rank: 1, points: 550 } });
  });

  it('supports player discovery, follows, and a complete one-card head-to-head challenge', async () => {
    await seedSession();
    await seedOpponentSession();
    const snapshot = courseSnapshot();
    const courseHash = courseFingerprint(snapshot);
    const publish = await request('/api/courses', {
      method: 'POST',
      headers: { ...authHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Challenge Links', theme: 'links', courseHash, holes: 1, par: 3, visibility: 'public', snapshot }),
    });
    const published = await publish.json<{ course: { slug: string } }>();

    const players = await request('/api/players', { headers: authHeaders(false) });
    expect(await players.json()).toMatchObject({ players: [{ id: 'user-2', displayName: 'Club Pro', isFollowing: false }] });

    const followed = await request('/api/players/user-2/follow', { method: 'POST', headers: authHeaders() });
    expect(await followed.json()).toEqual({ following: true });
    const following = await request('/api/players?following=1', { headers: authHeaders(false) });
    expect(await following.json()).toMatchObject({ players: [{ id: 'user-2', isFollowing: true }] });

    const createdResponse = await request('/api/challenges', {
      method: 'POST',
      headers: { ...authHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ opponentId: 'user-2', courseSlug: published.course.slug, title: 'Friday Match' }),
    });
    expect(createdResponse.status).toBe(201);
    const created = await createdResponse.json<{ challenge: { id: string; status: string } }>();
    expect(created.challenge.status).toBe('pending');

    const accepted = await request(`/api/challenges/${created.challenge.id}/accept`, { method: 'POST', headers: opponentAuthHeaders() });
    expect(await accepted.json()).toMatchObject({ challenge: { status: 'active', role: 'opponent', canPlay: true } });

    const course = await request(`/api/challenges/${created.challenge.id}/course`, { headers: authHeaders(false) });
    expect(await course.json()).toMatchObject({ course: { courseHash, snapshot: { golfers: [], employees: [] } } });

    const creatorRound = scorecard({ id: created.challenge.id, source: 'challenge', courseHash, roundId: 'challenge-round-creator', score: 0 });
    const creatorSubmission = await request(`/api/challenges/${created.challenge.id}/submissions`, {
      method: 'POST',
      headers: { ...authHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ challengeId: created.challenge.id, round: creatorRound }),
    });
    expect(creatorSubmission.status).toBe(201);
    expect(await creatorSubmission.json()).toMatchObject({ challenge: { status: 'active', creator: { score: { scoreToPar: 0 } } } });

    const opponentRound = scorecard({ id: created.challenge.id, source: 'challenge', courseHash, roundId: 'challenge-round-opponent', score: 1 });
    const opponentSubmission = await request(`/api/challenges/${created.challenge.id}/submissions`, {
      method: 'POST',
      headers: { ...opponentAuthHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ challengeId: created.challenge.id, round: opponentRound }),
    });
    expect(await opponentSubmission.json()).toMatchObject({
      challenge: { status: 'completed', winnerUserId: 'user-1', opponent: { score: { scoreToPar: 1 } } },
    });

    const cards = await request(`/api/challenges/${created.challenge.id}/scorecards`, { headers: authHeaders(false) });
    expect(await cards.json()).toMatchObject({
      scorecards: [
        { userId: 'user-1', strokes: 3, holes: [{ hole: 1, par: 3, strokes: 3 }] },
        { userId: 'user-2', strokes: 4, holes: [{ hole: 1, par: 3, strokes: 4 }] },
      ],
    });

    const replay = await request(`/api/challenges/${created.challenge.id}/submissions`, {
      method: 'POST',
      headers: { ...authHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ challengeId: created.challenge.id, round: creatorRound }),
    });
    expect(replay.status).toBe(409);
  });
});
