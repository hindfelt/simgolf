import { describe, expect, it } from 'vitest';
import { staffRecruitmentCopy } from './panelA11y';

describe('staffRecruitmentCopy', () => {
  const base = { name: 'Club Pro', wage: 1.4, count: 0, cost: 84, cash: 100, skilledLocked: false };

  it('describes an available recruit', () => {
    expect(staffRecruitmentCopy(base)).toEqual({
      status: 'Available to recruit',
      hireLabel: 'Hire Club Pro for $84; available to recruit',
    });
  });

  it('reports the exact cash shortfall', () => {
    expect(staffRecruitmentCopy({ ...base, cash: 34 })).toEqual({
      status: 'Need $50 more to recruit',
      hireLabel: 'Hire Club Pro for $84; need $50 more',
    });
  });

  it('keeps roster context when another hire is unaffordable', () => {
    expect(staffRecruitmentCopy({ ...base, count: 2, cash: 34 }).status).toBe('2 employed · Need $50 more to recruit another');
  });

  it('explains the skilled-role gate before cash availability', () => {
    expect(staffRecruitmentCopy({ ...base, skilledLocked: true, cash: 0 })).toEqual({
      status: 'Skilled role · unlocks at 6 holes',
      hireLabel: 'Hire Club Pro for $84; unlocks at 6 holes',
    });
  });
});
