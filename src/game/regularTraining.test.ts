import { describe, expect, it } from 'vitest';
import type { Building, Regular } from './types';
import {
  applyRegularTraining,
  createRegularTraining,
  regularTrainingRates,
  sanitizeRegularTraining,
} from './regularTraining';

const building = (patch: Partial<Building>): Building => ({
  id: 1,
  kind: 'proshop',
  x: 1,
  y: 1,
  w: 3,
  h: 2,
  open: true,
  ...patch,
});

const regular = (patch: Partial<Regular> = {}): Regular => ({
  name: 'Molly Fairway',
  shirt: '#3f7fd0',
  skin: '#f1c6a0',
  cap: '#efefef',
  length: 0.6,
  accuracy: 0.6,
  imagination: 0.6,
  visits: 2,
  streak: 1,
  lastVisit: 10,
  ...patch,
});

describe('regular golfer practice facilities', () => {
  it('maps operational facilities and service upgrades to their original skills', () => {
    const rates = regularTrainingRates([
      building({ id: 1, kind: 'drivingrange', level: 1 }),
      building({ id: 2, kind: 'proshop', level: 3, branch: 'service' }),
      building({ id: 3, kind: 'puttinggreen', level: 2, branch: 'service', upgrade: { targetLevel: 3, branch: 'service', remaining: 2, duration: 10 } }),
      building({ id: 4, kind: 'puttinggreen', open: false }),
    ]);

    expect(rates.length).toBe(18);
    expect(rates.accuracy).toBe(34);
    expect(rates.imagination).toBe(0);
    expect(rates.facilities).toEqual({ length: ['Driving Range'], accuracy: ['Pro Shop Lv.3'] });
  });

  it('caps stacked academies so duplicate facilities cannot power-level visitors', () => {
    const rates = regularTrainingRates(Array.from({ length: 4 }, (_, index) => building({ id: index + 1, kind: 'drivingrange' })));
    expect(rates.length).toBe(45);
  });

  it('persists partial practice, levels by one percentage point, and updates lifetime gains', () => {
    const golfer = regular({ training: createRegularTraining() });
    golfer.training!.progress.accuracy = 95;
    const rates = { length: 0, accuracy: 18, imagination: 0, facilities: { accuracy: ['Pro Shop'] } };

    const result = applyRegularTraining(golfer, rates);

    expect(golfer.accuracy).toBe(0.61);
    expect(golfer.training).toMatchObject({ holes: 1, progress: { accuracy: 13 }, gained: { accuracy: 1 } });
    expect(result.gains).toContainEqual({ skill: 'accuracy', earned: 18, levels: 1, progress: 13, value: 0.61 });
  });

  it('awards half practice for a picked-up hole and stops cleanly at mastery', () => {
    const golfer = regular({ accuracy: 0.995, training: createRegularTraining() });
    golfer.training!.progress.accuracy = 95;
    const rates = { length: 0, accuracy: 18, imagination: 0, facilities: { accuracy: ['Pro Shop'] } };

    applyRegularTraining(golfer, rates, 0.5);

    expect(golfer.accuracy).toBe(1);
    expect(golfer.training!.progress.accuracy).toBe(0);
    expect(golfer.training!.gained.accuracy).toBe(1);
    applyRegularTraining(golfer, rates);
    expect(golfer.accuracy).toBe(1);
    expect(golfer.training!.progress.accuracy).toBe(0);
  });

  it('migrates malformed and legacy training ledgers without changing identity', () => {
    expect(sanitizeRegularTraining(undefined)).toEqual(createRegularTraining());
    expect(sanitizeRegularTraining({ progress: { length: 999, accuracy: -4 }, gained: { length: 3.8 }, holes: '12' })).toEqual({
      progress: { length: 99, accuracy: 0, imagination: 0 },
      gained: { length: 3, accuracy: 0, imagination: 0 },
      holes: 12,
    });
  });
});
