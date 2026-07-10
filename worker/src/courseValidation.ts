import { courseFingerprint, type FingerprintBuilding, type FingerprintHole } from '../../src/shared/courseFingerprint';
import { ApiError } from './http';

const MAP_TILE_COUNT = 64 * 48;
const MAP_CORNER_COUNT = (64 + 1) * (48 + 1);
const THEMES = new Set(['parklands', 'links', 'desert', 'tropical']);

export interface ValidCourseSnapshot {
  v: 2;
  theme: string;
  tiles: number[];
  elevC: number[];
  holes: FingerprintHole[];
  buildings: FingerprintBuilding[];
  [key: string]: unknown;
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validHole(value: unknown): value is FingerprintHole {
  if (!value || typeof value !== 'object') return false;
  const hole = value as Partial<FingerprintHole>;
  return !!hole.tee && !!hole.cup && finiteNumber(hole.tee.x) && finiteNumber(hole.tee.y) && finiteNumber(hole.cup.x) && finiteNumber(hole.cup.y) && Number.isInteger(hole.par);
}

function validBuilding(value: unknown): value is FingerprintBuilding {
  if (!value || typeof value !== 'object') return false;
  const building = value as Partial<FingerprintBuilding>;
  return typeof building.kind === 'string' && finiteNumber(building.x) && finiteNumber(building.y) && finiteNumber(building.w) && finiteNumber(building.h);
}

export function validateCourseSnapshot(value: Record<string, unknown>, expectedHash: string): ValidCourseSnapshot {
  const snapshot = value as Partial<ValidCourseSnapshot>;
  if (
    snapshot.v !== 2 ||
    typeof snapshot.theme !== 'string' ||
    !THEMES.has(snapshot.theme) ||
    !Array.isArray(snapshot.tiles) ||
    snapshot.tiles.length !== MAP_TILE_COUNT ||
    snapshot.tiles.some((tile) => !Number.isInteger(tile) || tile < 0 || tile > 255) ||
    !Array.isArray(snapshot.elevC) ||
    snapshot.elevC.length !== MAP_CORNER_COUNT ||
    snapshot.elevC.some((height) => !Number.isInteger(height) || height < 0 || height > 255) ||
    !Array.isArray(snapshot.holes) ||
    snapshot.holes.some((hole) => !validHole(hole)) ||
    !Array.isArray(snapshot.buildings) ||
    snapshot.buildings.some((building) => !validBuilding(building))
  ) {
    throw new ApiError(422, 'invalid_course_snapshot', 'The course snapshot is incomplete or incompatible.');
  }

  const valid = snapshot as ValidCourseSnapshot;
  if (courseFingerprint(valid) !== expectedHash) throw new ApiError(422, 'course_hash_mismatch', 'The course fingerprint does not match its snapshot.');
  return valid;
}

/** Published courses are layouts, not copies of the owner's finances, visitors,
 * staff, comments, or in-progress construction. This also keeps public payloads
 * stable and prevents an event round from importing somebody else's live sim. */
export function sanitizePublishedSnapshot(snapshot: ValidCourseSnapshot, name: string): Record<string, unknown> {
  return {
    v: 2,
    courseName: name,
    theme: snapshot.theme,
    sandbox: false,
    cash: 0,
    fee: 20,
    rep: 2.5,
    rot: 0,
    served: 0,
    lost: 0,
    tiles: snapshot.tiles,
    elevC: snapshot.elevC,
    owned: Array(16).fill(1),
    holes: snapshot.holes,
    buildings: snapshot.buildings.map((building) => {
      const clean = { ...building } as FingerprintBuilding & { upgrade?: unknown };
      delete clean.upgrade;
      return clean;
    }),
    employees: [],
    golfers: [],
    regulars: [],
    tournamentHostedEver: false,
    goalsAchieved: {},
    comments: [],
    history: [],
  };
}
