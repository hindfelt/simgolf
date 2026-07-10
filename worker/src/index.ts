import { Hono } from 'hono';
import { deleteAccount, listAccountSessions, revokeAccountSession } from './account';
import { deleteExpiredSessions, finishGoogleAuth, getCurrentUser, logout, requireAuth, requireCsrf, startGoogleAuth } from './auth';
import { ensureCurrentCompetitions, getCompetitionCourse, getFriendsLeaderboard, getLeaderboard, listCompetitions, submitCompetitionRound } from './competitions';
import { acceptChallenge, cancelChallenge, createChallenge, declineChallenge, expireChallenges, getChallenge, getChallengeCourse, getChallengeScorecards, listChallenges, submitChallengeRound } from './challenges';
import { archiveCourse, getCourse, listCourses, listMyCourses, publishCourse } from './courses';
import { jsonError } from './http';
import { followPlayer, getPlayer, listPlayers, unfollowPlayer, updateProfile } from './profiles';
import { importProfileRounds, listProfileRounds } from './profileRounds';
import { finalizeEndedCompetitions, getSeasonStandings } from './progression';
import { deleteCloudSave, getCloudSave, listCloudSaves, putCloudSave } from './saves';
import type { AppEnvironment } from './types';

const app = new Hono<AppEnvironment>();

app.use('*', async (c, next) => {
  const requestId = c.req.header('cf-ray') ?? crypto.randomUUID();
  c.set('requestId', requestId);
  const origin = c.req.header('origin');
  if (c.req.method === 'OPTIONS') {
    if (origin && origin !== c.env.APP_ORIGIN) return c.json({ error: { code: 'origin_rejected', message: 'Request origin is not allowed.', requestId } }, 403);
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': c.env.APP_ORIGIN,
        'access-control-allow-credentials': 'true',
        'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'access-control-allow-headers': 'content-type,x-csrf-token,if-match',
        'access-control-max-age': '86400',
        vary: 'Origin',
      },
    });
  }

  const startedAt = Date.now();
  await next();
  c.header('x-request-id', requestId);
  c.header('x-content-type-options', 'nosniff');
  c.header('referrer-policy', 'no-referrer');
  c.header('cache-control', 'no-store');
  if (origin === c.env.APP_ORIGIN) {
    c.header('access-control-allow-origin', origin);
    c.header('access-control-allow-credentials', 'true');
    c.header('vary', 'Origin');
  }
  console.log(JSON.stringify({ level: 'info', event: 'api_request', requestId, method: c.req.method, path: new URL(c.req.url).pathname, status: c.res.status, durationMs: Date.now() - startedAt }));
});

app.get('/api/health', (c) => c.json({ ok: true, service: 'fairway-mogul-api', environment: c.env.ENVIRONMENT, time: Date.now() }));

app.get('/api/auth/google/start', startGoogleAuth);
app.get('/api/auth/google/callback', finishGoogleAuth);
app.get('/api/auth/me', getCurrentUser);
app.post('/api/auth/logout', requireAuth, requireCsrf, logout);
app.get('/api/account/sessions', requireAuth, listAccountSessions);
app.delete('/api/account/sessions/:id', requireAuth, requireCsrf, revokeAccountSession);
app.delete('/api/account', requireAuth, requireCsrf, deleteAccount);

app.get('/api/saves', requireAuth, listCloudSaves);
app.get('/api/saves/:slot', requireAuth, getCloudSave);
app.put('/api/saves/:slot', requireAuth, requireCsrf, putCloudSave);
app.delete('/api/saves/:slot', requireAuth, requireCsrf, deleteCloudSave);

app.get('/api/players', requireAuth, listPlayers);
app.get('/api/players/:slug', requireAuth, getPlayer);
app.put('/api/profile', requireAuth, requireCsrf, updateProfile);
app.get('/api/profile/rounds', requireAuth, listProfileRounds);
app.post('/api/profile/rounds/import', requireAuth, requireCsrf, importProfileRounds);
app.post('/api/players/:id/follow', requireAuth, requireCsrf, followPlayer);
app.delete('/api/players/:id/follow', requireAuth, requireCsrf, unfollowPlayer);

app.get('/api/courses', listCourses);
app.get('/api/me/courses', requireAuth, listMyCourses);
app.get('/api/courses/:slug', getCourse);
app.post('/api/courses', requireAuth, requireCsrf, publishCourse);
app.delete('/api/courses/:slug', requireAuth, requireCsrf, archiveCourse);

app.get('/api/competitions', listCompetitions);
app.get('/api/competitions/:id/course', getCompetitionCourse);
app.get('/api/competitions/:id/leaderboard', getLeaderboard);
app.get('/api/competitions/:id/friends-leaderboard', requireAuth, getFriendsLeaderboard);
app.post('/api/competitions/:id/submissions', requireAuth, requireCsrf, submitCompetitionRound);
app.get('/api/seasons/:id', requireAuth, getSeasonStandings);

app.get('/api/challenges', requireAuth, listChallenges);
app.post('/api/challenges', requireAuth, requireCsrf, createChallenge);
app.get('/api/challenges/:id', requireAuth, getChallenge);
app.get('/api/challenges/:id/scorecards', requireAuth, getChallengeScorecards);
app.post('/api/challenges/:id/accept', requireAuth, requireCsrf, acceptChallenge);
app.post('/api/challenges/:id/decline', requireAuth, requireCsrf, declineChallenge);
app.post('/api/challenges/:id/cancel', requireAuth, requireCsrf, cancelChallenge);
app.get('/api/challenges/:id/course', requireAuth, getChallengeCourse);
app.post('/api/challenges/:id/submissions', requireAuth, requireCsrf, submitChallengeRound);

app.notFound((c) => c.json({ error: { code: 'not_found', message: 'API route not found.', requestId: c.get('requestId') } }, 404));
app.onError(jsonError);

const handler: ExportedHandler<Env> = {
  fetch: (request, env, context) => app.fetch(request, env, context),
  scheduled: (event, env, context) => {
    context.waitUntil((async () => {
      const startedAt = Date.now();
      await ensureCurrentCompetitions(env.DB, event.scheduledTime);
      const progression = await finalizeEndedCompetitions(env.DB, event.scheduledTime);
      const cleanup = await deleteExpiredSessions(env.DB, event.scheduledTime);
      const expired = await expireChallenges(env.DB, event.scheduledTime);
      console.log(JSON.stringify({ level: 'info', event: 'scheduled_maintenance', scheduledTime: event.scheduledTime, competitionsFinalized: progression.finalized, awardsCreated: progression.awards, sessionsDeleted: cleanup.meta.changes, challengesExpired: expired.meta.changes, durationMs: Date.now() - startedAt }));
    })());
  },
};

export { app };
export default handler;
