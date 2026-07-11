import { useEffect, useRef } from 'react';
import { golferSprite, type GolferFrame } from '../game/sprites';

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
    ctx.drawImage(golferSprite(shirt, skin, cap, frame), 0, 0, canvas.width, canvas.height);
  }, [cap, frame, shirt, skin]);

  return (
    <span className={`characterPortrait ${className}`.trim()} title={name} aria-label={`${name} portrait`}>
      <canvas ref={ref} width={48} height={64} aria-hidden="true" />
      <i aria-hidden="true" />
    </span>
  );
}
