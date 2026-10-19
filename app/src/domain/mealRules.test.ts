import { describe, expect, it } from 'vitest';
import type { Meal, MealSummary } from '../types';
import {
  cleanMealTitle,
  defaultMealTitle,
  groupByDate,
  paymentEntities,
  sortMeals,
  summarizeMeal,
  validateMealDraft,
} from './mealRules';

function meal(overrides: Partial<Meal> = {}): Meal {
  return {
    id: 'm1',
    title: 'Bữa',
    date: '2026-10-19',
    status: 'ACTIVE',
    participantIds: ['a', 'b', 'c', 'd'],
    hostMemberId: 'a',
    settlementMode: 'SELF_SETTLEMENT',
    paymentGroups: [],
    settlementStatuses: {},
    createdAt: '2026-10-19T10:00:00.000Z',
    updatedAt: '2026-10-19T10:00:00.000Z',
    ...overrides,
  };
}

describe('cleanMealTitle (R-1)', () => {
  it('trims, collapses whitespace, drops control characters and keeps casing', () => {
    expect(cleanMealTitle('  Đi   ăn \t lẩu\n ')).toBe('Đi ăn lẩu');
    expect(cleanMealTitle('TẤT niên nhóm ĐH')).toBe('TẤT niên nhóm ĐH');
    expect(cleanMealTitle('   ')).toBe('');
  });
});

describe('validateMealDraft (R-1…R-3)', () => {
  it('normalises a valid draft', () => {
    expect(validateMealDraft({ title: '  Lẩu   bò ', date: '2026-10-19', note: '  mang theo ô \r\n ' })).toEqual({
      title: 'Lẩu bò',
      date: '2026-10-19',
      note: 'mang theo ô',
    });
  });

  it('auto-names an empty title from the date (AC-3)', () => {
    expect(validateMealDraft({ title: '   ', date: '2026-03-05' }).title).toBe('Bữa 05/03/2026');
    expect(defaultMealTitle('2026-03-05')).toBe('Bữa 05/03/2026');
  });

  it('omits an empty note', () => {
    expect('note' in validateMealDraft({ title: 'x', date: '2026-10-19', note: '  ' })).toBe(false);
  });

  it('rejects bad dates with INVALID_DATE', () => {
    for (const date of ['2026-02-30', '', '19/10/2026', '1999-12-31', '2100-01-01']) {
      expect(() => validateMealDraft({ title: 'x', date })).toThrowError(expect.objectContaining({ code: 'INVALID_DATE' }));
    }
  });

  it('enforces length limits', () => {
    expect(() => validateMealDraft({ title: 'a'.repeat(101), date: '2026-10-19' })).toThrowError(
      expect.objectContaining({ code: 'INVALID_TITLE' }),
    );
    expect(validateMealDraft({ title: 'a'.repeat(100), date: '2026-10-19' }).title).toHaveLength(100);
    expect(() => validateMealDraft({ title: 'x', date: '2026-10-19', note: 'n'.repeat(501) })).toThrowError(
      expect.objectContaining({ code: 'INVALID_NOTE' }),
    );
  });
});

describe('sortMeals (R-8, AC-7)', () => {
  it('orders newest date first and breaks ties by newest createdAt', () => {
    const items = [
      { id: 'old', date: '2026-10-01', createdAt: '2026-10-01T08:00:00Z' },
      { id: 'same-early', date: '2026-10-19', createdAt: '2026-10-19T08:00:00Z' },
      { id: 'new', date: '2026-11-02', createdAt: '2026-10-02T08:00:00Z' },
      { id: 'same-late', date: '2026-10-19', createdAt: '2026-10-19T20:00:00Z' },
    ];
    expect(sortMeals(items).map((i) => i.id)).toEqual(['new', 'same-late', 'same-early', 'old']);
  });

  it('does not mutate its input', () => {
    const items = [
      { date: '2026-01-01', createdAt: 'a' },
      { date: '2026-02-01', createdAt: 'b' },
    ];
    const before = [...items];
    sortMeals(items);
    expect(items).toEqual(before);
  });
});

describe('groupByDate', () => {
  it('groups by date and keeps input order inside each day', () => {
    const make = (id: string, date: string): MealSummary => ({
      meal: meal({ id, date }),
      sessionCount: 0,
      participantCount: 1,
      totalAmount: 0,
      hasCost: false,
      paidCount: 0,
      entityCount: 1,
    });
    const grouped = groupByDate([make('b', '2026-10-19'), make('a', '2026-10-19'), make('c', '2026-10-01')]);
    expect(grouped.get('2026-10-19')!.map((s) => s.meal.id)).toEqual(['b', 'a']);
    expect(grouped.get('2026-10-01')!.map((s) => s.meal.id)).toEqual(['c']);
    expect(grouped.get('2026-10-02')).toBeUndefined();
  });
});

describe('paymentEntities (R-10)', () => {
  it('counts each group once plus participants outside any group', () => {
    const m = meal({
      paymentGroups: [{ id: 'g1', mealId: 'm1', name: 'C + D', memberIds: ['c', 'd'] }],
    });
    expect(paymentEntities(m)).toEqual(['g1', 'a', 'b']);
  });
});

describe('summarizeMeal (R-9…R-11)', () => {
  it('sums invoices for an active meal and counts paid transfers', () => {
    const m = meal({
      paymentGroups: [{ id: 'g1', mealId: 'm1', name: 'C + D', memberIds: ['c', 'd'] }],
    });
    const s = summarizeMeal({
      meal: m,
      sessionCount: 2,
      invoices: [{ totalAmount: 1_620_000 }, { totalAmount: 830_000 }],
      settlement: { transferCount: 3, paidTransferCount: 2 },
    });
    expect(s).toMatchObject({
      sessionCount: 2,
      participantCount: 4,
      totalAmount: 2_450_000,
      hasCost: true,
      entityCount: 3,
      paidCount: 2,
    });
  });

  it('reports "no cost" for an active meal without invoices', () => {
    const s = summarizeMeal({ meal: meal(), sessionCount: 0, invoices: [] });
    expect(s).toMatchObject({ totalAmount: 0, hasCost: false, paidCount: 0, entityCount: 0 });
  });

  it('takes totals and progress from archivedSummary for an archived meal', () => {
    const m = meal({
      status: 'ARCHIVED',
      archivedSummary: {
        totalMealAmount: 900_000,
        sessionsSummary: [],
        transfers: [
          { fromEntityName: 'B', toEntityName: 'A', amount: 10_000 },
          { fromEntityName: 'C', toEntityName: 'A', amount: 5_000 },
        ],
        entitiesSummary: [
          { entityId: 'a', entityName: 'A', isGroup: false, memberNames: ['A'], totalPaid: 0, totalOwed: 0, netBalance: 0, isPaid: true },
          { entityId: 'b', entityName: 'B', isGroup: false, memberNames: ['B'], totalPaid: 0, totalOwed: 0, netBalance: 0, isPaid: true },
        ],
      },
    });
    // invoices bị bỏ qua vì bữa lưu trữ không còn hoá đơn
    const s = summarizeMeal({ meal: m, sessionCount: 3, invoices: [{ totalAmount: 1 }] });
    expect(s).toMatchObject({ sessionCount: 3, totalAmount: 900_000, hasCost: true, paidCount: 2, entityCount: 2 });
  });

  it('falls back to "no cost" when an archived meal has no summary', () => {
    const s = summarizeMeal({ meal: meal({ status: 'ARCHIVED' }), sessionCount: 0, invoices: [] });
    expect(s).toMatchObject({ totalAmount: 0, hasCost: false, paidCount: 0 });
  });
});

describe('summarizeMeal — tiến độ thanh toán theo quyết toán (BR-6.9, Epic 6)', () => {
  const base = {
    id: 'm1',
    title: 'Lẩu',
    date: '2026-10-19',
    status: 'ACTIVE' as const,
    participantIds: ['a', 'b', 'c'],
    hostMemberId: 'a',
    settlementMode: 'SELF_SETTLEMENT' as const,
    paymentGroups: [],
    settlementStatuses: {},
    createdAt: '2026-10-19T00:00:00.000Z',
    updatedAt: '2026-10-19T00:00:00.000Z',
  } as Meal

  it('đếm tiến độ theo số khoản chuyển tiền, không theo số thực thể', () => {
    const summary = summarizeMeal({
      meal: { ...base, settlementStatuses: { b: { isPaid: true } } },
      sessionCount: 1,
      invoices: [{ totalAmount: 90_000 }],
      settlement: { transferCount: 2, paidTransferCount: 1 },
    })
    expect(summary.entityCount).toBe(2)
    expect(summary.paidCount).toBe(1)
  })

  it('không có quyết toán thì chưa có khoản chuyển nào để đếm', () => {
    const summary = summarizeMeal({ meal: base, sessionCount: 0, invoices: [] })
    expect(summary.entityCount).toBe(0)
    expect(summary.hasCost).toBe(false)
  })
})
