import { useEffect, useRef } from 'react';
import { GOLFER_SPRITE_SIZE, golferSprite, type GolferFrame } from '../game/sprites';

interface CharacterPortraitProps {
  name: string;
  shirt: string;
  skin: string;
  cap: string;
  frame?: GolferFrame;
  className?: string;
}

/**
 * A crisp, reusable identity portrait built from the exact palette used by the
 * character's course sprite. The larger crop lets the named cast read as people
 * in management screens without introducing a second, disconnected art style.
 */
export default function CharacterPortrait({ name, shirt, skin, cap, frame = 'idle', className = '' }: CharacterPortraitProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    // Head-and-shoulders crop, not a stretched full-body thumbnail. The same
    // identity seed adds matching face/outfit details on the course and in UI.
    ctx.drawImage(
      golferSprite(shirt, skin, cap, frame, 'front', name),
      4,
      0,
      GOLFER_SPRITE_SIZE.width - 8,
      GOLFER_SPRITE_SIZE.height - 9,
      0,
      0,
      canvas.width,
      canvas.height,
    );
  }, [cap, frame, name, shirt, skin]);

  return (
    <span className={`characterPortrait ${className}`.trim()} title={name} aria-label={`${name} portrait`}>
      <canvas ref={ref} width={48} height={64} aria-hidden="true" />
      <i aria-hidden="true" />
    </span>
  );
}
