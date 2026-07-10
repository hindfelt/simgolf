import { z } from 'zod';

const courseHash = z.string().regex(/^fm1-[a-f0-9]{8}$/u, 'Unsupported course fingerprint.');
const theme = z.enum(['parklands', 'links', 'desert', 'tropical']);
const snapshot = z.record(z.string(), z.unknown());

export const saveSchema = z.object({
  name: z.string().trim().min(1).max(50),
  expectedRevision: z.number().int().min(0),
  courseHash,
  snapshot,
}).strict();

export const publishCourseSchema = z.object({
  name: z.string().trim().min(1).max(50),
  theme,
  courseHash,
  holes: z.number().int().min(1).max(18),
  par: z.number().int().min(1).max(120),
  visibility: z.enum(['public', 'unlisted']).default('public'),
  snapshot,
}).strict();

const shotSchema = z.object({
  stroke: z.number().int().min(1).max(50),
  club: z.enum(['driver', 'iron', 'wedge', 'putter']),
  shape: z.enum(['straight', 'fade', 'draw', 'backspin', 'punch', 'putt']),
  fromLie: z.string().max(30),
  resultLie: z.string().max(30),
  power: z.number().finite().min(0).max(2),
  intendedDistance: z.number().finite().min(0).max(1000),
  distance: z.number().finite().min(0).max(1000),
  start: z.object({ x: z.number().finite(), y: z.number().finite() }),
  end: z.object({ x: z.number().finite(), y: z.number().finite() }),
  events: z.array(z.string().max(80)).max(20),
  penalty: z.number().int().min(0).max(10),
  holed: z.boolean(),
}).strict();

const holeSchema = z.object({
  hole: z.number().int().min(1).max(18),
  holeId: z.number().int(),
  par: z.number().int().min(1).max(8),
  distance: z.number().finite().min(0).max(2000),
  strokes: z.number().int().min(1).max(50),
  relative: z.number().int().min(-7).max(49),
  penalties: z.number().int().min(0).max(30),
  putts: z.number().int().min(0).max(30),
  fairwayHit: z.boolean().nullable(),
  greenInRegulation: z.boolean(),
  hazards: z.array(z.string().max(40)).max(30),
  wind: z.object({ dx: z.number().finite().min(-1).max(1), dy: z.number().finite().min(-1).max(1), speed: z.number().finite().min(0).max(1) }),
  shots: z.array(shotSchema).min(1).max(50),
}).strict();

export const roundRecordSchema = z.object({
  version: z.literal(1),
  id: z.string().min(8).max(100),
  playerName: z.string().min(1).max(80),
  source: z.enum(['exhibition', 'daily', 'weekly', 'tournament', 'challenge']),
  localEvent: z.enum(['championship', 'proChallenge']).optional(),
  competitionId: z.string().min(1).max(80).optional(),
  challengeId: z.string().min(1).max(80).optional(),
  startedAt: z.number().int().positive(),
  completedAt: z.number().int().positive(),
  durationSeconds: z.number().int().min(1).max(86_400),
  courseName: z.string().min(1).max(50),
  courseTheme: theme,
  courseHash,
  holesPlayed: z.number().int().min(1).max(18),
  par: z.number().int().min(1).max(120),
  strokes: z.number().int().min(1).max(400),
  scoreToPar: z.number().int().min(-100).max(399),
  payout: z.number().finite().min(0),
  eagles: z.number().int().min(0).max(18),
  birdies: z.number().int().min(0).max(18),
  pars: z.number().int().min(0).max(18),
  bogeys: z.number().int().min(0).max(18),
  penalties: z.number().int().min(0).max(200),
  putts: z.number().int().min(0).max(200),
  fairwaysHit: z.number().int().min(0).max(18),
  fairwayOpportunities: z.number().int().min(0).max(18),
  greensInRegulation: z.number().int().min(0).max(18),
  longestShot: z.number().finite().min(0).max(1000),
  card: z.array(holeSchema).min(1).max(18),
}).strict();

export const submitRoundSchema = z.object({
  competitionId: z.string().min(1).max(80),
  round: roundRecordSchema,
}).strict();

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(2).max(40),
  bio: z.string().trim().max(180),
  discoverable: z.boolean(),
}).strict();

export const createChallengeSchema = z.object({
  opponentId: z.string().min(1).max(80),
  courseSlug: z.string().min(1).max(80),
  title: z.string().trim().min(1).max(80).optional(),
}).strict();

export const submitChallengeRoundSchema = z.object({
  challengeId: z.string().min(1).max(80),
  round: roundRecordSchema,
}).strict();

export const deleteAccountSchema = z.object({
  confirmation: z.literal('DELETE'),
}).strict();

export const importProfileRoundsSchema = z.object({
  rounds: z.array(roundRecordSchema).min(1).max(5),
}).strict();

export type SaveInput = z.infer<typeof saveSchema>;
export type PublishCourseInput = z.infer<typeof publishCourseSchema>;
export type SubmittedRound = z.infer<typeof roundRecordSchema>;
