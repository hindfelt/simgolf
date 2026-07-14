export interface ShotWindPlan {
  windPush: number;
  windDx: number;
  windDy: number;
  dirX: number;
  dirY: number;
  perpX: number;
  perpY: number;
}

export interface ShotWindEffect {
  along: number;
  cross: number;
  displacement: number;
}

/**
 * Resolves the world wind vector into the player's aiming frame. Positive
 * `along` is a tailwind; positive `cross` moves the ball to the player's right.
 */
export function shotWindEffect(plan: ShotWindPlan): ShotWindEffect {
  const along = plan.windPush * (plan.windDx * plan.dirX + plan.windDy * plan.dirY);
  const cross = plan.windPush * (plan.windDx * plan.perpX + plan.windDy * plan.perpY);
  return { along, cross, displacement: Math.hypot(along, cross) };
}

export function shotWindLabel(effect: ShotWindEffect | null, yardsPerTile = 18): string {
  if (!effect || effect.displacement < 0.04) return 'Calm line · no meaningful drift';
  const parts: string[] = [];
  if (Math.abs(effect.along) >= 0.04) {
    const distance = Math.max(1, Math.round(Math.abs(effect.along) * yardsPerTile));
    parts.push(`${effect.along >= 0 ? 'Tailwind adds' : 'Headwind costs'} ${distance} yd`);
  }
  if (Math.abs(effect.cross) >= 0.04) {
    const distance = Math.max(1, Math.round(Math.abs(effect.cross) * yardsPerTile));
    parts.push(`${distance} yd ${effect.cross >= 0 ? 'right' : 'left'}`);
  }
  return parts.join(' · ') || 'Light wind · less than 1 yd drift';
}

export function playerBallNeedsCameraFollow(
  point: { x: number; y: number },
  viewport: { width: number; height: number },
): boolean {
  if (viewport.width <= 0 || viewport.height <= 0) return false;
  return point.x < viewport.width * 0.18
    || point.x > viewport.width * 0.82
    || point.y < viewport.height * 0.16
    || point.y > viewport.height * 0.64;
}

/** Projects a world wind vector into the rotated isometric screen basis. */
export function worldWindScreenVector(dx: number, dy: number, rotation: number): { x: number; y: number } {
  let rx = dx;
  let ry = dy;
  switch (rotation & 3) {
    case 1: rx = dy; ry = -dx; break;
    case 2: rx = -dx; ry = -dy; break;
    case 3: rx = -dy; ry = dx; break;
  }
  const screenX = ((rx - ry) * TW) / 2;
  const screenY = ((rx + ry) * TH) / 2;
  const magnitude = Math.hypot(screenX, screenY) || 1;
  return { x: screenX / magnitude, y: screenY / magnitude };
}
import { TH, TW } from './constants';
