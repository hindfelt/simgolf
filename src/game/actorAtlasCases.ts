import { actorSpriteScale } from './actorGeometry';
import type { ActorSpriteView, CourseStaffFrame, CourseStaffKind, GolferBuild, GolferFrame } from './sprites';

export type ActorAtlasScaleId = 'native' | 'fitted';
export type ActorAtlasMirrorId = 'right' | 'left';
export type GolferAtlasView = ActorSpriteView;

export interface ActorAtlasScale {
  id: ActorAtlasScaleId;
  /** World zoom passed through the same capped scale used by the course renderer. */
  zoom: number;
  scale: number;
}

export interface ActorAtlasMirror {
  id: ActorAtlasMirrorId;
  face: 1 | -1;
}

export interface GolferBuildFixture {
  build: GolferBuild;
  identity: string;
  shirt: string;
  skin: string;
  cap: string;
}

export interface GolferActorAtlasCase {
  actor: 'golfer';
  key: string;
  scaleId: ActorAtlasScaleId;
  zoom: number;
  build: GolferBuild;
  identity: string;
  shirt: string;
  skin: string;
  cap: string;
  frame: GolferFrame;
  view: GolferAtlasView;
  mirror: ActorAtlasMirrorId;
  face: 1 | -1;
}

export interface StaffActorAtlasCase {
  actor: 'staff';
  key: string;
  scaleId: ActorAtlasScaleId;
  zoom: number;
  kind: CourseStaffKind;
  frame: CourseStaffFrame;
  view: ActorSpriteView;
  mirror: ActorAtlasMirrorId;
  face: 1 | -1;
}

export type ActorAtlasCase = GolferActorAtlasCase | StaffActorAtlasCase;

export const ACTOR_ATLAS_SCALES: readonly ActorAtlasScale[] = [
  { id: 'native', zoom: 1, scale: actorSpriteScale(1) },
  { id: 'fitted', zoom: 0.4, scale: actorSpriteScale(0.4) },
] as const;

export const ACTOR_ATLAS_MIRRORS: readonly ActorAtlasMirror[] = [
  { id: 'right', face: 1 },
  { id: 'left', face: -1 },
] as const;

/** Stable named golfers that resolve to each of the three production silhouettes. */
export const GOLFER_BUILD_FIXTURES: readonly GolferBuildFixture[] = [
  { build: 'compact', identity: 'Big Earl', shirt: '#d0453a', skin: '#c98a5e', cap: '#e9b53c' },
  { build: 'classic', identity: 'Doris', shirt: '#3f7fd0', skin: '#e0a878', cap: '#efefef' },
  { build: 'broad', identity: 'Bogey Bill', shirt: '#8e5bc0', skin: '#8d5a3a', cap: '#f0cf45' },
] as const;

export const GOLFER_ATLAS_FRAMES: readonly GolferFrame[] = [
  'idle', 'walkA', 'walkB', 'address', 'back', 'follow', 'putt', 'puttFollow',
] as const;

export const GOLFER_ATLAS_VIEWS: readonly GolferAtlasView[] = ['front', 'rear', 'side'] as const;

export const STAFF_ATLAS_KINDS: readonly CourseStaffKind[] = [
  'clubpro', 'ranger', 'groundskeeper', 'sodavendor', 'celebrity', 'marshall', 'turftech', 'refreshment',
] as const;

export const STAFF_ATLAS_FRAMES: readonly CourseStaffFrame[] = ['walkA', 'walkB', 'workA', 'workB'] as const;
export const STAFF_ATLAS_VIEWS: readonly ActorSpriteView[] = ['front', 'rear', 'side'] as const;

export const ACTOR_ATLAS_COLUMNS = 24;
export const ACTOR_ATLAS_CELL = { width: 48, height: 56 } as const;

const golferCases = (): GolferActorAtlasCase[] => ACTOR_ATLAS_SCALES.flatMap((scale) =>
  GOLFER_BUILD_FIXTURES.flatMap((fixture) =>
    GOLFER_ATLAS_FRAMES.flatMap((frame) =>
      GOLFER_ATLAS_VIEWS.flatMap((view) =>
        ACTOR_ATLAS_MIRRORS.map((mirror) => ({
          actor: 'golfer' as const,
          key: `golfer:${scale.id}:${fixture.build}:${frame}:${view}:${mirror.id}`,
          scaleId: scale.id,
          zoom: scale.zoom,
          build: fixture.build,
          identity: fixture.identity,
          shirt: fixture.shirt,
          skin: fixture.skin,
          cap: fixture.cap,
          frame,
          view,
          mirror: mirror.id,
          face: mirror.face,
        })),
      ),
    ),
  ),
);

const staffCases = (): StaffActorAtlasCase[] => ACTOR_ATLAS_SCALES.flatMap((scale) =>
  STAFF_ATLAS_KINDS.flatMap((kind) =>
    STAFF_ATLAS_FRAMES.flatMap((frame) =>
      STAFF_ATLAS_VIEWS.flatMap((view) =>
        ACTOR_ATLAS_MIRRORS.map((mirror) => ({
          actor: 'staff' as const,
          key: `staff:${scale.id}:${kind}:${frame}:${view}:${mirror.id}`,
          scaleId: scale.id,
          zoom: scale.zoom,
          kind,
          frame,
          view,
          mirror: mirror.id,
          face: mirror.face,
        })),
      ),
    ),
  ),
);

/**
 * Fixed order is part of the visual fixture: golfer cases first, followed by
 * staff, with native scale before fitted gameplay scale inside each section.
 */
export const ACTOR_ATLAS_CASES: readonly ActorAtlasCase[] = [
  ...golferCases(),
  ...staffCases(),
] as const;

export const ACTOR_ATLAS_ROWS = Math.ceil(ACTOR_ATLAS_CASES.length / ACTOR_ATLAS_COLUMNS);
export const ACTOR_ATLAS_SIZE = {
  width: ACTOR_ATLAS_COLUMNS * ACTOR_ATLAS_CELL.width,
  height: ACTOR_ATLAS_ROWS * ACTOR_ATLAS_CELL.height,
} as const;
