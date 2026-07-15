import { useEffect, useRef, type CSSProperties } from 'react';
import type { CharacterVisualOverrides, PortraitExpression } from '../game/characterVisuals';
import { GOLFER_PORTRAIT_SIZE, golferPortraitSprite } from '../game/portraits';

interface CharacterPortraitProps extends CharacterVisualOverrides {
  name: string;
  identity?: string;
  shirt: string;
  skin: string;
  cap: string;
  expression?: PortraitExpression;
  variant?: 'card' | 'profile' | 'simfoto';
  className?: string;
}

type CharacterPortraitStyle = CSSProperties & {
  '--character-shirt': string;
  '--character-cap': string;
  '--character-trim': string;
  '--character-accent': string;
};

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
  appearance,
  signature,
  hairTone,
  hairHighlight,
  trim,
  pants,
  accent,
  bag,
}: CharacterPortraitProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(golferPortraitSprite(identity, shirt, skin, cap, expression, {
      appearance,
      signature,
      hairTone,
      hairHighlight,
      trim,
      pants,
      accent,
      bag,
    }), 0, 0);
  }, [accent, appearance, bag, cap, expression, hairHighlight, hairTone, identity, pants, shirt, signature, skin, trim]);

  const portraitStyle: CharacterPortraitStyle = {
    '--character-shirt': shirt,
    '--character-cap': cap,
    '--character-trim': trim ?? cap,
    '--character-accent': accent ?? cap,
  };

  return (
    <span
      className={`characterPortrait portrait-${variant} expression-${expression} ${className}`.trim()}
      data-character-id={identity}
      data-character-signature={signature}
      data-expression={expression}
      style={portraitStyle}
      title={name}
      role="img"
      aria-label={`${name} portrait, ${expression}`}
    >
      <canvas ref={ref} width={GOLFER_PORTRAIT_SIZE.width} height={GOLFER_PORTRAIT_SIZE.height} aria-hidden="true" />
      <i aria-hidden="true" />
    </span>
  );
}
