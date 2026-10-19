import { describe, expect, it } from 'vitest';
import { parseMoney } from './money';

describe('parseMoney (R-1)', () => {
  it.each([
    ['120000', 120_000],
    ['45.000', 45_000],
    ['45,000', 45_000],
    ['1.620.000', 1_620_000],
    ['45k', 45_000],
    ['45K', 45_000],
    ['1,5k', 1_500],
    ['1.5k', 1_500],
    ['45.000 ₫', 45_000],
    ['  45 000 ', 45_000],
    ['0', 0],
  ])('đọc %s thành %d', (input, expected) => {
    expect(parseMoney(input)).toBe(expected);
  });

  it.each(['', '  ', 'abc', '-5', '4.5.0', '12a', '10000000000', '1e5'])('từ chối %j', (input) => {
    expect(parseMoney(input)).toBeNull();
  });
});
