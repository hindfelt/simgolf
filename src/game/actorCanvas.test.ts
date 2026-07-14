import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  COURSE_STAFF_SPRITE_SIZE,
  GOLFER_SPRITE_SIZE,
  courseStaffSprite,
  golferSprite,
  type ActorSpriteView,
  type CourseStaffFrame,
  type CourseStaffKind,
  type GolferFrame,
} from './sprites';

interface PaintedRect { x: number; y: number; width: number; height: number; color: string }
interface FakeCanvas {
  width: number;
  height: number;
  rects: PaintedRect[];
  getContext: () => Record<string, unknown>;
}

const canvases: FakeCanvas[] = [];

function fakeCanvas(): FakeCanvas {
  const canvas = { width: 0, height: 0, rects: [] as PaintedRect[] } as FakeCanvas;
  const context: Record<string, unknown> = {
    fillStyle: '#000',
    globalCompositeOperation: 'source-over',
    fillRect: (x: number, y: number, width: number, height: number) =>
      canvas.rects.push({ x, y, width, height, color: String(context.fillStyle) }),
    drawImage: () => undefined,
  };
  canvas.getContext = () => context;
  canvases.push(canvas);
  return canvas;
}

function expectNativePixelsInBounds(canvas: FakeCanvas) {
  expect(canvas.rects.length).toBeGreaterThan(20);
  for (const rect of canvas.rects) {
    expect(Number.isInteger(rect.x)).toBe(true);
    expect(Number.isInteger(rect.y)).toBe(true);
    expect(Number.isInteger(rect.width)).toBe(true);
    expect(Number.isInteger(rect.height)).toBe(true);
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.y).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(canvas.width);
    expect(rect.y + rect.height).toBeLessThanOrEqual(canvas.height);
  }
}

function paintSignature(canvas: FakeCanvas): string {
  return canvas.rects
    .map(({ x, y, width, height, color }) => `${x},${y},${width},${height},${color}`)
    .sort()
    .join('|');
}

beforeEach(() => {
  canvases.length = 0;
  vi.stubGlobal('document', { createElement: () => fakeCanvas() });
});

afterEach(() => vi.unstubAllGlobals());

describe('native actor canvases', () => {
  it('plots every golfer pose and view directly inside a 32×44 canvas', () => {
    const frames: GolferFrame[] = ['idle', 'walkA', 'walkB', 'address', 'back', 'follow', 'putt', 'puttFollow'];
    const views: ActorSpriteView[] = ['front', 'rear', 'side'];
    const signatures = new Set<string>();
    for (const view of views) {
      for (const frame of frames) {
        const canvasIndex = canvases.length;
        const sprite = golferSprite('#4d8b55', '#d3a070', '#f0cf45', frame, view, `canvas-${view}-${frame}`);
        expect({ width: sprite.width, height: sprite.height }).toEqual(GOLFER_SPRITE_SIZE);
        expectNativePixelsInBounds(canvases[canvasIndex]);
        signatures.add(paintSignature(canvases[canvasIndex]));
      }
    }
    expect(signatures).toHaveLength(frames.length * views.length);
  });

  it('keeps every profession tool and animation frame inside its broader canvas', () => {
    const kinds: CourseStaffKind[] = ['clubpro', 'ranger', 'groundskeeper', 'sodavendor', 'celebrity', 'marshall', 'turftech', 'refreshment'];
    const frames: CourseStaffFrame[] = ['walkA', 'walkB', 'workA', 'workB'];
    const views: ActorSpriteView[] = ['front', 'rear', 'side'];
    for (const kind of kinds) {
      const signatures = new Set<string>();
      for (const view of views) {
        for (const frame of frames) {
          const canvasIndex = canvases.length;
          const sprite = courseStaffSprite(kind, frame, view);
          expect({ width: sprite.width, height: sprite.height }).toEqual(COURSE_STAFF_SPRITE_SIZE);
          expectNativePixelsInBounds(canvases[canvasIndex]);
          signatures.add(paintSignature(canvases[canvasIndex]));
        }
      }
      expect(signatures).toHaveLength(frames.length * views.length);
    }
  });
});
