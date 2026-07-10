import type { FinanceCategory, FinanceEntry } from './types';

/** Five real-time minutes form one reportable resort year. */
export const FINANCIAL_YEAR_SECONDS = 300;
export const FINANCE_LEDGER_LIMIT = 600;

export const FINANCE_CATEGORY_INFO: Record<FinanceCategory, { label: string; kind: 'income' | 'expense' | 'capital' }> = {
  capital: { label: 'Capital & balance brought forward', kind: 'capital' },
  greenFees: { label: 'Green fees', kind: 'income' },
  memberships: { label: 'Membership dues', kind: 'income' },
  property: { label: 'Property income', kind: 'income' },
  tournament: { label: 'Tournaments & sponsors', kind: 'income' },
  proChallenge: { label: 'Pro challenges', kind: 'income' },
  roundBonuses: { label: 'Owner round bonuses', kind: 'income' },
  refunds: { label: 'Construction refunds', kind: 'income' },
  courseConstruction: { label: 'Hole construction', kind: 'expense' },
  facilities: { label: 'Facilities & upgrades', kind: 'expense' },
  landscaping: { label: 'Landscaping & terrain', kind: 'expense' },
  land: { label: 'Land purchases', kind: 'expense' },
  staff: { label: 'Recruitment', kind: 'expense' },
  wages: { label: 'Staff wages', kind: 'expense' },
  upkeep: { label: 'Facility upkeep', kind: 'expense' },
};

const FINANCE_CATEGORIES = new Set<FinanceCategory>(Object.keys(FINANCE_CATEGORY_INFO) as FinanceCategory[]);

export function financialYearAt(time: number): number {
  return Math.floor(Math.max(0, Number.isFinite(time) ? time : 0) / FINANCIAL_YEAR_SECONDS) + 1;
}

export function sanitizeFinanceLedger(value: unknown): FinanceEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((raw): raw is FinanceEntry => {
      if (!raw || typeof raw !== 'object') return false;
      const entry = raw as Partial<FinanceEntry>;
      return Number.isFinite(entry.id) && Number.isFinite(entry.time) && Number.isFinite(entry.year) &&
        Number.isFinite(entry.amount) && typeof entry.category === 'string' && FINANCE_CATEGORIES.has(entry.category as FinanceCategory) &&
        typeof entry.detail === 'string';
    })
    .map((entry) => ({
      ...entry,
      id: Math.max(1, Math.trunc(entry.id)),
      time: Math.max(0, entry.time),
      year: Math.max(1, Math.trunc(entry.year)),
      amount: Math.trunc(entry.amount),
      detail: entry.detail.slice(0, 80),
    }))
    .filter((entry) => entry.amount !== 0)
    .slice(-FINANCE_LEDGER_LIMIT);
}

export interface FinanceYearSummary {
  year: number;
  income: number;
  expenses: number;
  capital: number;
  profit: number;
  categories: Partial<Record<FinanceCategory, number>>;
}

export function summarizeFinance(entries: FinanceEntry[], throughYear?: number): FinanceYearSummary[] {
  const years = new Map<number, FinanceYearSummary>();
  const ensure = (year: number) => {
    let summary = years.get(year);
    if (!summary) {
      summary = { year, income: 0, expenses: 0, capital: 0, profit: 0, categories: {} };
      years.set(year, summary);
    }
    return summary;
  };
  if (throughYear) ensure(throughYear);
  for (const entry of entries) {
    const summary = ensure(entry.year);
    summary.categories[entry.category] = (summary.categories[entry.category] ?? 0) + entry.amount;
    const kind = FINANCE_CATEGORY_INFO[entry.category].kind;
    if (kind === 'capital') summary.capital += entry.amount;
    else if (entry.amount >= 0) summary.income += entry.amount;
    else summary.expenses += Math.abs(entry.amount);
  }
  for (const summary of years.values()) summary.profit = summary.income - summary.expenses;
  return [...years.values()].sort((a, b) => b.year - a.year);
}
