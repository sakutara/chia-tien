import { describe, expect, it } from 'vitest';
import { PeopleError } from '../services/peopleErrors';
import {
  defaultSessionName,
  isDefaultSessionName,
  validateSessionName,
  vendorSessionName,
} from './sessionRules';

describe('validateSessionName (R-2)', () => {
  it('gộp khoảng trắng và cắt đầu/cuối', () => {
    expect(validateSessionName('  Lẩu   bò \n gỗ ')).toBe('Lẩu bò gỗ');
  });

  it('rỗng trả về chuỗi rỗng để dùng tên mặc định', () => {
    expect(validateSessionName('   ')).toBe('');
  });

  it('từ chối tên quá 80 ký tự thay vì cắt âm thầm', () => {
    expect(() => validateSessionName('a'.repeat(81))).toThrow(PeopleError);
  });
});

describe('tên mặc định và tên theo quán (BR-4.10)', () => {
  it('đặt tên mặc định theo thứ tự từ 1', () => {
    expect(defaultSessionName(0)).toBe('Kèo 1');
    expect(defaultSessionName(4)).toBe('Kèo 5');
  });

  it('nhận diện đúng tên còn là tên mặc định', () => {
    expect(isDefaultSessionName('Kèo 12')).toBe(true);
    expect(isDefaultSessionName('Kèo lẩu')).toBe(false);
    expect(isDefaultSessionName('Kèo 1 lẩu')).toBe(false);
  });

  it('gợi ý "Kèo <tên quán>" và cắt gọn khi quán quá dài', () => {
    expect(vendorSessionName('  NHÀ HÀNG   A ')).toBe('Kèo NHÀ HÀNG A');
    expect(vendorSessionName('x'.repeat(200))).toHaveLength(80);
  });
});
