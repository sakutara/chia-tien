import { describe, expect, it } from 'vitest';
import { formatMoney } from './money';
import {
  buildMonthGrid,
  formatDateVi,
  isValidYmd,
  isYmdInRange,
  parseYmd,
  shiftMonth,
  todayLocal,
} from './dates';

describe('isValidYmd / isYmdInRange (R-2)', () => {
  it('accepts real dates, including 29 Feb of a leap year', () => {
    expect(isValidYmd('2026-10-19')).toBe(true);
    expect(isValidYmd('2028-02-29')).toBe(true);
  });

  it('rejects dates that do not exist or are malformed', () => {
    expect(isValidYmd('2026-02-30')).toBe(false);
    expect(isValidYmd('2027-02-29')).toBe(false);
    expect(isValidYmd('2026-13-01')).toBe(false);
    expect(isValidYmd('2026-00-10')).toBe(false);
    expect(isValidYmd('2026-1-5')).toBe(false);
    expect(isValidYmd('')).toBe(false);
    expect(isValidYmd('hôm nay')).toBe(false);
  });

  it('limits the range to 2000-01-01..2099-12-31', () => {
    expect(isYmdInRange('2000-01-01')).toBe(true);
    expect(isYmdInRange('2099-12-31')).toBe(true);
    expect(isYmdInRange('1999-12-31')).toBe(false);
    expect(isYmdInRange('2100-01-01')).toBe(false);
  });
});

describe('todayLocal (AC-14)', () => {
  it('uses local calendar fields, not UTC', () => {
    // 00:30 giờ địa phương ngày 19/10: toISOString() có thể ra ngày 18 ở múi giờ dương.
    expect(todayLocal(new Date(2026, 9, 19, 0, 30))).toBe('2026-10-19');
    expect(todayLocal(new Date(2026, 9, 19, 23, 59))).toBe('2026-10-19');
    expect(todayLocal(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
  });
});

describe('formatDateVi / parseYmd', () => {
  it('formats dd/mm/yyyy', () => {
    expect(formatDateVi('2026-10-09')).toBe('09/10/2026');
    expect(formatDateVi('not-a-date')).toBe('not-a-date');
  });

  it('parses components', () => {
    expect(parseYmd('2026-10-19')).toEqual({ year: 2026, month: 10, day: 19 });
    expect(parseYmd('2026-02-31')).toBeUndefined();
  });
});

describe('buildMonthGrid (R-12)', () => {
  it('starts weeks on Monday and pads with neighbouring months', () => {
    // 1/10/2026 là Thứ 5 → lưới bắt đầu Thứ 2 ngày 28/9; 31 ngày + 3 ô đệm = 34 → 5 hàng.
    const grid = buildMonthGrid(2026, 10, '2026-10-19');
    expect(grid).toHaveLength(35);
    expect(grid[0]).toMatchObject({ ymd: '2026-09-28', inMonth: false });
    expect(grid[3]).toMatchObject({ ymd: '2026-10-01', inMonth: true });
    expect(grid[34]).toMatchObject({ ymd: '2026-11-01', inMonth: false });
    expect(grid.filter((d) => d.inMonth)).toHaveLength(31);
    expect(grid.filter((d) => d.isToday).map((d) => d.ymd)).toEqual(['2026-10-19']);
  });

  it('uses 4 rows when February starts on Monday and is not a leap year', () => {
    // 1/2/2027 là Thứ 2, tháng 28 ngày → đúng 4 hàng.
    const grid = buildMonthGrid(2027, 2);
    expect(grid).toHaveLength(28);
    expect(grid[0].ymd).toBe('2027-02-01');
  });

  it('uses 6 rows when a long month starts late in the week', () => {
    // 1/8/2026 là Thứ 7: 5 ô đệm + 31 = 36 → 6 hàng.
    const grid = buildMonthGrid(2026, 8);
    expect(grid).toHaveLength(42);
    expect(grid[5].ymd).toBe('2026-08-01');
  });

  it('includes 29 Feb in a leap year', () => {
    const grid = buildMonthGrid(2028, 2);
    expect(grid.some((d) => d.ymd === '2028-02-29' && d.inMonth)).toBe(true);
  });

  it('marks nothing as today when today is outside the grid', () => {
    expect(buildMonthGrid(2026, 10, '2030-01-01').some((d) => d.isToday)).toBe(false);
  });
});

describe('shiftMonth', () => {
  it('moves across year boundaries', () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth(2026, 10, 0)).toEqual({ year: 2026, month: 10 });
    expect(shiftMonth(2026, 3, -15)).toEqual({ year: 2024, month: 12 });
  });
});

describe('formatMoney', () => {
  it('groups thousands with dots and appends the dong sign', () => {
    expect(formatMoney(1620000)).toBe('1.620.000 ₫');
    expect(formatMoney(0)).toBe('0 ₫');
    expect(formatMoney(1234.6)).toBe('1.235 ₫');
  });
});
