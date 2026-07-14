import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  COURSE_STAFF_SPRITE_SIZE,
  GOLFER_SPRITE_SIZE,
  courseStaffSprite,
  golferSprite,
  type CourseStaffFrame,
  type CourseStaffKind,
  type GolferFrame,
} from './sprites';

interface PaintedRect { x: number; y: number; width: number; height: number }
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
    fillRect: (x: number, y: number, width: number, height: number) => canvas.rects.push({ x, y, width, height }),
    drawImage: () => undefined,
  };
  canvas.getContext = () => context;
  canvases.push(canvas);
  return canvas;
}

function expectNativePixelsInBounds(canvas: FakeCanvas) {
  expect(canvas.rects.length).toBeGreaterThan(20);
  for (const rect of canvas.rects) {
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.y).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(canvas.width);
    expect(rect.y + rect.height).toBeLessThanOrEqual(canvas.height);
  }
}

beforeEach(() => {
  canvases.length = 0;
  vi.stubGlobal('document', { createElement: () => fakeCanvas() });
});

afterEach(() => vi.unstubAllGlobals());

describe('native actor canvases', () => {
  it('plots every golfer pose and view directly inside a 32×44 canvas', () => {
    const frames: GolferFrame[] = ['idle', 'walkA', 'walkB', 'address', 'back', 'follow', 'putt', 'puttFollow'];
    for (const view of ['front', 'rear'] as const) {
      for (const frame of frames) {
        const canvasIndex = canvases.length;
        const sprite = golferSprite('#4d8b55', '#d3a070', '#f0cf45', frame, view, `canvas-${view}-${frame}`);
        expect({ width: sprite.width, height: sprite.height }).toEqual(GOLFER_SPRITE_SIZE);
        expectNativePixelsInBounds(canvases[canvasIndex]);
      }
    }
  });

  it('keeps every profession tool and animation frame inside its broader canvas', () => {
    const kinds: CourseStaffKind[] = ['clubpro', 'ranger', 'groundskeeper', 'sodavendor', 'celebrity', 'marshall', 'turftech', 'refreshment'];
    const frames: CourseStaffFrame[] = ['walkA', 'walkB', 'workA', 'workB'];
    for (const kind of kinds) {
      for (const frame of frames) {
        const canvasIndex = canvases.length;
        const sprite = courseStaffSprite(kind, frame);
        expect({ width: sprite.width, height: sprite.height }).toEqual(COURSE_STAFF_SPRITE_SIZE);
        expectNativePixelsInBounds(canvases[canvasIndex]);
      }
    }
  });
});
