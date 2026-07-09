import { describe, expect, it } from 'vitest';
import { facilityActivityPose } from './facilityActivity';
import type { Building, FacilityActivity } from './types';

const airstrip: Building = { id: 10, kind: 'airstrip', x: 40, y: 14, w: 8, h: 3, open: true };
const marina: Building = { id: 11, kind: 'marina', x: 12, y: 20, w: 5, h: 3, open: true };

function activity(kind: FacilityActivity['kind'], age: number, duration = 10): FacilityActivity {
  return { id: 7, facilityId: kind === 'marina-boat' ? marina.id : airstrip.id, kind, age, duration, direction: 1 };
}

describe('facility activity poses', () => {
  it('brings an arriving aircraft down onto the runway', () => {
    const approach = facilityActivityPose(activity('plane-arrival', 2), airstrip);
    const rollout = facilityActivityPose(activity('plane-arrival', 7.5), airstrip);

    expect(approach.altitude).toBeGreaterThan(rollout.altitude);
    expect(rollout.y).toBeCloseTo(airstrip.y + airstrip.h * 0.54, 4);
  });

  it('climbs after a departure roll', () => {
    const runway = facilityActivityPose(activity('plane-departure', 4), airstrip);
    const airborne = facilityActivityPose(activity('plane-departure', 8.5), airstrip);

    expect(airborne.altitude).toBeGreaterThan(runway.altitude);
    expect(airborne.x).toBeGreaterThan(runway.x);
  });

  it('keeps marina traffic inside the facility basin', () => {
    for (const age of [0, 2.5, 5, 7.5, 10]) {
      const pose = facilityActivityPose(activity('marina-boat', age), marina);
      expect(pose.x).toBeGreaterThan(marina.x);
      expect(pose.x).toBeLessThan(marina.x + marina.w);
      expect(pose.y).toBeGreaterThan(marina.y);
      expect(pose.y).toBeLessThan(marina.y + marina.h);
    }
  });
});
