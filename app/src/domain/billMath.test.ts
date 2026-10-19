import { describe, expect, it } from 'vitest';
import { PeopleError } from '../services/peopleErrors';
import {
  allocateInvoiceItems,
  allocateProportional,
  computeAdjustment,
  computeBill,
} from './billMath';

const none = { mode: 'NONE' as const, value: 0 };
const pct = (value: number) => ({ mode: 'PERCENTAGE' as const, value });
const fixed = (value: number) => ({ mode: 'FIXED_AMOUNT' as const, value });

/** Bộ sinh số giả ngẫu nhiên có seed để test lặp lại được. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

describe('allocateProportional (R-8)', () => {
  it('chia phần dư 1đ cho mục có phần thập phân lớn nhất, tổng luôn đúng', () => {
    expect(allocateProportional([1, 1, 1], 10)).toEqual([4, 3, 3]);
    expect(allocateProportional([2, 1], 5)).toEqual([3, 2]);
  });

  it('trả về 0 cho mọi mục khi số tiền bằng 0', () => {
    expect(allocateProportional([0, 0], 0)).toEqual([0, 0]);
  });

  it('từ chối khi không có trọng số nhưng vẫn còn tiền để phân bổ', () => {
    expect(() => allocateProportional([0, 0], 5)).toThrow(PeopleError);
  });

  it('không bao giờ mất đồng nào trên nhiều bộ số ngẫu nhiên', () => {
    const rand = seeded(42);
    for (let i = 0; i < 500; i++) {
      const n = 1 + Math.floor(rand() * 8);
      const weights: number[] = Array.from({ length: n }, () => Math.floor(rand() * 1_000_000));
      if (weights.reduce((sum, w) => sum + w, 0) === 0) weights[0] = 1;
      const amount = Math.floor(rand() * 50_000_000);
      const parts = allocateProportional(weights, amount);
      expect(parts.reduce((s, v) => s + v, 0)).toBe(amount);
      parts.forEach((p) => expect(p).toBeGreaterThanOrEqual(0));
    }
  });

  it('vẫn chính xác với số lớn (tích vượt 2^53)', () => {
    const amount = 9_999_999_999;
    const weights = [9_999_999_999, 1, 7_777_777_777];
    const parts = allocateProportional(weights, amount);
    expect(parts.reduce((s, v) => s + v, 0)).toBe(amount);
  });
});

describe('computeAdjustment (BR-4.9, BR-4.15)', () => {
  it('tính phần trăm làm tròn nửa lên', () => {
    expect(computeAdjustment(pct(8), 1_000_000)).toBe(80_000);
    expect(computeAdjustment(pct(10), 105)).toBe(11); // 10.5 → 11
    expect(computeAdjustment(pct(10), 104)).toBe(10); // 10.4 → 10
  });

  it('số tiền cố định giữ nguyên và không phụ thuộc cơ sở', () => {
    expect(computeAdjustment(fixed(36_000), 999)).toBe(36_000);
    expect(computeAdjustment(none, 999)).toBe(0);
  });

  it('từ chối tỷ lệ ngoài 0–100 hoặc số tiền âm', () => {
    expect(() => computeAdjustment(pct(150), 100)).toThrow(PeopleError);
    expect(() => computeAdjustment(fixed(-1), 100)).toThrow(PeopleError);
  });
});

describe('computeBill — thứ tự giảm giá → phí phục vụ → VAT (R-8)', () => {
  it('tính đúng ví dụ: giảm 10%, phí phục vụ 5% trên tiền sau giảm, VAT 8% trên cả hai', () => {
    const bill = computeBill({ subtotal: 400_000, discount: pct(10), service: pct(5), vat: pct(8) });
    expect(bill.discountAmount).toBe(40_000);
    expect(bill.netSubtotal).toBe(360_000);
    expect(bill.serviceAmount).toBe(18_000);
    expect(bill.vatAmount).toBe(30_240); // 8% × (360 000 + 18 000)
    expect(bill.totalAmount).toBe(408_240);
  });

  it('không có khoản nào thì tổng bằng tiền hàng', () => {
    const bill = computeBill({ subtotal: 123_000, discount: none, service: none, vat: none });
    expect(bill.totalAmount).toBe(123_000);
  });

  it('từ chối giảm giá lớn hơn tiền hàng', () => {
    expect(() => computeBill({ subtotal: 100_000, discount: fixed(200_000), service: none, vat: none })).toThrow(
      PeopleError,
    );
  });
});

describe('allocateInvoiceItems — tổng các món khớp hoá đơn (AC-13)', () => {
  it('Σ món = tổng hoá đơn và từng khoản phân bổ khớp đúng', () => {
    const bill = computeBill({ subtotal: 400_000, discount: pct(10), service: pct(5), vat: pct(8) });
    const alloc = allocateInvoiceItems([150_000, 250_000], bill);
    const sum = (xs: number[]) => xs.reduce((s, v) => s + v, 0);
    expect(sum(alloc.discount)).toBe(bill.discountAmount);
    expect(sum(alloc.service)).toBe(bill.serviceAmount);
    expect(sum(alloc.vat)).toBe(bill.vatAmount);
    expect(sum(alloc.final)).toBe(bill.totalAmount);
    alloc.final.forEach((f) => expect(f).toBeGreaterThanOrEqual(0));
  });

  it('không lệch đồng nào trên nhiều bộ món và tỷ lệ ngẫu nhiên', () => {
    const rand = seeded(7);
    for (let i = 0; i < 300; i++) {
      const n = 1 + Math.floor(rand() * 6);
      const raw = Array.from({ length: n }, () => 1 + Math.floor(rand() * 900_000));
      const subtotal = raw.reduce((s, v) => s + v, 0);
      const bill = computeBill({
        subtotal,
        discount: pct(Math.floor(rand() * 40)),
        service: pct(Math.floor(rand() * 11)),
        vat: pct([0, 5, 8, 10][Math.floor(rand() * 4)]),
      });
      const alloc = allocateInvoiceItems(raw, bill);
      expect(alloc.final.reduce((s, v) => s + v, 0)).toBe(bill.totalAmount);
    }
  });
});
