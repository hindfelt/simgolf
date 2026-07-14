import type { CourseSafeViewport } from './camera';
import { clamp } from './rng';

export const STAFF_AMBIENT_NAME_ZOOM = 0.8;
export const GOLFER_AMBIENT_NAME_ZOOM = 0.9;

export interface ActorNameVisibility {
  actor: 'golfer' | 'staff';
  zoom: number;
  hovered?: boolean;
  selected?: boolean;
  special?: boolean;
}

/**
 * SimGolf treats names as part of the course view at its native scale. Keep
 * that character layer at normal zoom, while culling ambient copy from a
 * fitted overview. Direct attention (hover/selection/special guests) always
 * wins so a player can still identify an actor at any zoom.
 */
export function shouldShowActorName({
  actor,
  zoom,
  hovered = false,
  selected = false,
  special = false,
}: ActorNameVisibility): boolean {
  if (hovered || (actor === 'golfer' && (selected || special))) return true;
  if (!Number.isFinite(zoom)) return false;
  return zoom >= (actor === 'staff' ? STAFF_AMBIENT_NAME_ZOOM : GOLFER_AMBIENT_NAME_ZOOM);
}

/** Shared production/fixture painter for the original white, inked name tag. */
export function drawActorNameLabel(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  zoom: number,
  safe: CourseSafeViewport,
  gold = false,
): void {
  const size = clamp(8 * zoom, 8, 11);
  ctx.save();
  ctx.font = `900 ${size}px "Trebuchet MS", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2;
  const maximumWidth = Math.max(8, Math.min(96, safe.width - 8));
  let copy = label;
  if (ctx.measureText(copy).width > maximumWidth) {
    while (copy.length > 1 && ctx.measureText(copy + '…').width > maximumWidth) copy = copy.slice(0, -1);
    copy += '…';
  }
  const measuredWidth = Math.min(maximumWidth, ctx.measureText(copy).width);
  const labelX = clamp(x, safe.left + measuredWidth / 2 + 3, safe.right - measuredWidth / 2 - 3);
  const labelY = clamp(y, safe.top + size + 2, safe.bottom - 2);
  ctx.strokeStyle = '#161b48';
  ctx.strokeText(copy, labelX, labelY, maximumWidth);
  ctx.fillStyle = gold ? '#fff06a' : '#fff';
  ctx.fillText(copy, labelX, labelY, maximumWidth);
  ctx.restore();
}

