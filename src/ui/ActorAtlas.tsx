import { useEffect, useRef } from 'react';
import {
  ACTOR_ATLAS_CASES,
  ACTOR_ATLAS_CELL,
  ACTOR_ATLAS_COLUMNS,
  ACTOR_ATLAS_SIZE,
  type ActorAtlasCase,
} from '../game/actorAtlasCases';
import { COURSE_STAFF_METRICS, GOLFER_METRICS, actorDrawPlan, actorSpriteScale } from '../game/actorGeometry';
import { courseStaffSprite, golferSprite } from '../game/sprites';

const PAGE_BACKGROUND = '#17232b';
const CELL_BACKGROUNDS = {
  golfer: { native: '#d9c98f', fitted: '#b7c88b' },
  staff: { native: '#a9c7ca', fitted: '#9fb4cc' },
} as const;

function paintCellBackground(ctx: CanvasRenderingContext2D, item: ActorAtlasCase, x: number, y: number) {
  ctx.fillStyle = CELL_BACKGROUNDS[item.actor][item.scaleId];
  ctx.fillRect(x, y, ACTOR_ATLAS_CELL.width, ACTOR_ATLAS_CELL.height);
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  ctx.fillRect(x + 1, y + 1, ACTOR_ATLAS_CELL.width - 2, 1);
  ctx.fillStyle = 'rgba(18,29,34,.28)';
  ctx.fillRect(x, y + ACTOR_ATLAS_CELL.height - 2, ACTOR_ATLAS_CELL.width, 2);
  ctx.fillRect(x + ACTOR_ATLAS_CELL.width - 1, y, 1, ACTOR_ATLAS_CELL.height);
}

function drawAtlasActor(ctx: CanvasRenderingContext2D, item: ActorAtlasCase, column: number, row: number) {
  const cellX = column * ACTOR_ATLAS_CELL.width;
  const cellY = row * ACTOR_ATLAS_CELL.height;
  paintCellBackground(ctx, item, cellX, cellY);

  const scale = actorSpriteScale(item.zoom);
  const centerX = cellX + ACTOR_ATLAS_CELL.width / 2;
  const footY = cellY + ACTOR_ATLAS_CELL.height - 5;
  const sprite = item.actor === 'golfer'
    ? golferSprite(item.shirt, item.skin, item.cap, item.frame, item.view, item.identity)
    : courseStaffSprite(item.kind, item.frame, item.view);
  const metrics = item.actor === 'golfer' ? GOLFER_METRICS : COURSE_STAFF_METRICS;
  const plan = actorDrawPlan({ x: centerX, y: footY }, metrics, scale, item.view, item.face, 1);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(plan.anchor.x, plan.anchor.y);
  ctx.scale(plan.mirrorX ? -1 : 1, 1);
  ctx.drawImage(sprite, plan.destination.x, plan.destination.y, plan.destination.width, plan.destination.height);
  ctx.restore();
}

export default function ActorAtlas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    canvas.dataset.atlasReady = 'false';
    document.documentElement.dataset.actorAtlasReady = 'false';
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = PAGE_BACKGROUND;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ACTOR_ATLAS_CASES.forEach((item, index) => {
      drawAtlasActor(ctx, item, index % ACTOR_ATLAS_COLUMNS, Math.floor(index / ACTOR_ATLAS_COLUMNS));
    });
    canvas.dataset.atlasReady = 'true';
    document.documentElement.dataset.actorAtlasReady = 'true';

    return () => {
      delete document.documentElement.dataset.actorAtlasReady;
    };
  }, []);

  return (
    <main
      aria-label="Deterministic actor atlas"
      style={{ minHeight: '100vh', overflow: 'auto', background: PAGE_BACKGROUND, padding: 0 }}
    >
      <canvas
        ref={canvasRef}
        width={ACTOR_ATLAS_SIZE.width}
        height={ACTOR_ATLAS_SIZE.height}
        data-actor-atlas="true"
        data-atlas-ready="false"
        data-case-count={ACTOR_ATLAS_CASES.length}
        aria-label={`${ACTOR_ATLAS_CASES.length} deterministic golfer and staff render cases`}
        style={{ display: 'block', width: ACTOR_ATLAS_SIZE.width, height: ACTOR_ATLAS_SIZE.height }}
      />
    </main>
  );
}
