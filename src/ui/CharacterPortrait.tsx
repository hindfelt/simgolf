import { useEffect, useRef } from 'react';
import { GOLFER_PORTRAIT_SIZE, golferPortraitSprite, type PortraitExpression } from '../game/portraits';

interface CharacterPortraitProps {
  name: string;
  identity?: string;
  shirt: string;
  skin: string;
  cap: string;
  expression?: PortraitExpression;
  variant?: 'card' | 'profile' | 'simfoto';
  className?: string;
}

/**
 * Original-style SimFoto art: a dedicated three-quarter bust authored at UI
 * scale, sharing identity and palette with the tiny course actor without ever
 * stretching or cropping that world sprite.
 */
export default function CharacterPortrait({
  name,
  identity = name,
  shirt,
  skin,
  cap,
  expression = 'neutral',
  variant = 'card',
  className = '',
}: CharacterPortraitProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(golferPortraitSprite(identity, shirt, skin, cap, expression), 0, 0);
  }, [cap, expression, identity, shirt, skin]);

  return (
    <span
      className={`characterPortrait portrait-${variant} expression-${expression} ${className}`.trim()}
      data-expression={expression}
      title={name}
      role="img"
      aria-label={`${name} portrait, ${expression}`}
    >
      <canvas ref={ref} width={GOLFER_PORTRAIT_SIZE.width} height={GOLFER_PORTRAIT_SIZE.height} aria-hidden="true" />
      <i aria-hidden="true" />
    </span>
  );
}
