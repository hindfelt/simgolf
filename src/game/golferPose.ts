import type { Golfer, PlayerRound } from './types';
import type { GolferFrame } from './sprites';

type CoursePoseState = Pick<Golfer, 'state' | 'phase' | 't' | 'lie'>;
type ManualPoseState = Pick<PlayerRound, 'state' | 'lie' | 'pendingShot'>;

/** Pure course-actor pose resolver, including a dedicated low putting finish. */
export function resolveGolferFrame(golfer: CoursePoseState): GolferFrame {
  if (golfer.state === 'toTee' || golfer.state === 'toBall' || golfer.state === 'leave') {
    return Math.sin(golfer.phase) > 0 ? 'walkA' : 'walkB';
  }
  if (golfer.state === 'prePutt') return 'putt';
  if (golfer.state === 'preshot') return golfer.t < 0.28 ? 'back' : 'address';
  if (golfer.state === 'watch' && golfer.t > 0) return golfer.lie === 'green' ? 'puttFollow' : 'follow';
  return 'idle';
}

/** Manual golfer pose: charged drags show a backswing and released putts stay low. */
export function resolveManualGolferFrame(player: ManualPoseState, chargedAim: boolean): GolferFrame {
  const shotLie = player.pendingShot?.fromLie ?? player.lie;
  if (player.state === 'wait') return shotLie === 'green' ? 'puttFollow' : 'follow';
  if (shotLie === 'green') return 'putt';
  return chargedAim ? 'back' : 'address';
}
