import { describe, expect, it } from 'vitest';
import {
  GOLFER_AMBIENT_NAME_ZOOM,
  STAFF_AMBIENT_NAME_ZOOM,
  shouldShowActorName,
} from './actorLabels';

describe('course actor name visibility', () => {
  it('restores ambient staff names at native scale and hides them in fitted overviews', () => {
    expect(shouldShowActorName({ actor: 'staff', zoom: STAFF_AMBIENT_NAME_ZOOM })).toBe(true);
    expect(shouldShowActorName({ actor: 'staff', zoom: STAFF_AMBIENT_NAME_ZOOM - 0.01 })).toBe(false);
    expect(shouldShowActorName({ actor: 'staff', zoom: 0.4, hovered: true })).toBe(true);
  });

  it('restores ambient golfer names at native scale without losing attention states', () => {
    expect(shouldShowActorName({ actor: 'golfer', zoom: GOLFER_AMBIENT_NAME_ZOOM })).toBe(true);
    expect(shouldShowActorName({ actor: 'golfer', zoom: GOLFER_AMBIENT_NAME_ZOOM - 0.01 })).toBe(false);
    expect(shouldShowActorName({ actor: 'golfer', zoom: 0.4, hovered: true })).toBe(true);
    expect(shouldShowActorName({ actor: 'golfer', zoom: 0.4, selected: true })).toBe(true);
    expect(shouldShowActorName({ actor: 'golfer', zoom: 0.4, special: true })).toBe(true);
  });

  it('does not turn invalid zoom state into ambient label clutter', () => {
    expect(shouldShowActorName({ actor: 'golfer', zoom: Number.NaN })).toBe(false);
    expect(shouldShowActorName({ actor: 'staff', zoom: Number.POSITIVE_INFINITY })).toBe(false);
  });
});

