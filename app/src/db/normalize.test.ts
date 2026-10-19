import { describe, expect, it } from 'vitest';
import { cleanName, formatMemberName, hasDiacritics, normalizeName } from './normalize';

describe('cleanName', () => {
  it('trims and collapses whitespace', () => {
    expect(cleanName('  phương    anh ')).toBe('phương anh');
  });

  it('removes control characters', () => {
    expect(cleanName('An\u0000\u0007 B')).toBe('An B');
  });
});

describe('formatMemberName (R-1)', () => {
  it.each([
    ['bình', 'Bình'],
    ['BÌNH', 'Bình'],
    ['văn an', 'Văn An'],
    ['phương  anh', 'Phương Anh'],
    ['anh-tuấn', 'Anh-Tuấn'],
    ['đạt', 'Đạt'],
    ['ĐẠT', 'Đạt'],
    ['  an  ', 'An'],
  ])('%s -> %s', (input, expected) => {
    expect(formatMemberName(input)).toBe(expected);
  });

  it('returns empty string for blank input', () => {
    expect(formatMemberName('   ')).toBe('');
  });
});

describe('normalizeName', () => {
  it('strips diacritics and maps đ to d', () => {
    expect(normalizeName('Đạt Ân')).toBe('dat an');
  });
});

describe('hasDiacritics', () => {
  it('detects Vietnamese marks and đ', () => {
    expect(hasDiacritics('Bình')).toBe(true);
    expect(hasDiacritics('Đạt')).toBe(true);
    expect(hasDiacritics('Binh')).toBe(false);
  });
});
