import { describe, expect, it } from 'vitest';
import { FINANCE_LEDGER_LIMIT, financialYearAt, sanitizeFinanceLedger, summarizeFinance } from './finance';
import type { FinanceEntry } from './types';

describe('financial reporting', () => {
  it('rolls the resort into a new report year every five minutes', () => {
    expect(financialYearAt(0)).toBe(1);
    expect(financialYearAt(299.99)).toBe(1);
    expect(financialYearAt(300)).toBe(2);
    expect(financialYearAt(905)).toBe(4);
  });

  it('separates capital, income, and expenses in year-sorted statements', () => {
    const entries: FinanceEntry[] = [
      { id: 1, time: 0, year: 1, amount: 20_000, category: 'capital', detail: 'Founder capital' },
      { id: 2, time: 20, year: 1, amount: 900, category: 'greenFees', detail: 'Green fees' },
      { id: 3, time: 30, year: 1, amount: -250, category: 'wages', detail: 'Staff payroll' },
      { id: 4, time: 310, year: 2, amount: 600, category: 'memberships', detail: 'Annual membership' },
      { id: 5, time: 320, year: 2, amount: -100, category: 'upkeep', detail: 'Facility maintenance' },
    ];

    const years = summarizeFinance(entries, 2);

    expect(years.map((year) => year.year)).toEqual([2, 1]);
    expect(years[0]).toMatchObject({ income: 600, expenses: 100, capital: 0, profit: 500 });
    expect(years[1]).toMatchObject({ income: 900, expenses: 250, capital: 20_000, profit: 650 });
  });

  it('sanitizes imported ledgers and enforces the storage limit', () => {
    const entries = Array.from({ length: FINANCE_LEDGER_LIMIT + 5 }, (_, index) => ({
      id: index + 1,
      time: index,
      year: 1,
      amount: index + 1,
      category: 'greenFees',
      detail: 'Hole fees',
    }));
    entries.push({ id: 9999, time: 0, year: 1, amount: 0, category: 'greenFees', detail: 'Zero' });

    const sanitized = sanitizeFinanceLedger(entries);

    expect(sanitized).toHaveLength(FINANCE_LEDGER_LIMIT);
    expect(sanitized[0].id).toBe(6);
    expect(sanitized.at(-1)?.amount).toBe(FINANCE_LEDGER_LIMIT + 5);
  });
});
