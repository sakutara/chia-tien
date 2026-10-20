import { PeopleError } from '../services/peopleErrors';
import type { AdjustmentMode } from '../types';
import { t } from '../i18n';

/*
 * Tính tiền hoá đơn bằng số nguyên đồng (BR-4.9, BR-4.15, R-1, R-8).
 * Thứ tự cố định: tiền hàng S → giảm giá D → phí phục vụ C (trên N = S − D) → VAT V (trên N + C).
 * Mọi phép chia dùng BigInt để tích `khoản × trọng số` không mất độ chính xác khi số lớn.
 */

export interface Adjustment {
  mode: AdjustmentMode;
  value: number;
}

export interface BillInput {
  subtotal: number;
  discount: Adjustment;
  service: Adjustment;
  vat: Adjustment;
}

export interface BillTotals {
  discountAmount: number;
  serviceAmount: number;
  vatAmount: number;
  /** Tiền hàng sau giảm giá, trước phí phục vụ và VAT. */
  netSubtotal: number;
  totalAmount: number;
}

const MAX_PERCENT = 100;

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new PeopleError('INVALID_AMOUNT', t('{label} phải là số nguyên không âm.', { label }), { value });
  }
}

/**
 * Chia `amount` theo trọng số nguyên, phần dư được cộng 1đ cho các mục có phần thập phân lớn nhất
 * (hoà thì mục đứng trước). Kết quả luôn có tổng đúng bằng `amount`.
 */
export function allocateProportional(weights: number[], amount: number): number[] {
  assertNonNegativeInteger(amount, t('Số tiền cần phân bổ'));
  weights.forEach((w) => assertNonNegativeInteger(w, t('Trọng số phân bổ')));

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight === 0) {
    if (amount === 0) return weights.map(() => 0);
    throw new PeopleError('INVALID_AMOUNT', t('Không có mục nào để phân bổ số tiền này.'), { amount });
  }

  const bigAmount = BigInt(amount);
  const bigTotal = BigInt(totalWeight);
  const parts = weights.map((w) => {
    const product = bigAmount * BigInt(w);
    return { base: product / bigTotal, frac: product % bigTotal };
  });

  const result = parts.map((p) => Number(p.base));
  let remainder = amount - result.reduce((sum, v) => sum + v, 0);

  const order = parts
    .map((p, index) => ({ index, frac: p.frac }))
    .sort((a, b) => (a.frac === b.frac ? a.index - b.index : a.frac > b.frac ? -1 : 1));

  for (const { index } of order) {
    if (remainder === 0) break;
    result[index] += 1;
    remainder -= 1;
  }
  return result;
}

/** Số tiền của một khoản điều chỉnh trên `base` (làm tròn đến đồng, nửa lên). */
export function computeAdjustment(adjustment: Adjustment, base: number): number {
  assertNonNegativeInteger(base, t('Cơ sở tính'));
  const { mode, value } = adjustment;

  if (mode === 'NONE') return 0;
  if (mode === 'FIXED_AMOUNT') {
    assertNonNegativeInteger(value, t('Số tiền'));
    return value;
  }
  if (!Number.isInteger(value) || value < 0 || value > MAX_PERCENT) {
    throw new PeopleError('INVALID_VAT', t('Tỷ lệ phần trăm phải từ 0 đến 100.'), { value });
  }
  // round(base × value / 100) với nửa lên, dùng BigInt để không tràn số.
  const numerator = BigInt(base) * BigInt(value) * 2n + 100n;
  return Number(numerator / 200n);
}

/** Tính toàn bộ các khoản của hoá đơn theo thứ tự giảm giá → phí phục vụ → VAT (R-8). */
export function computeBill(input: BillInput): BillTotals {
  const { subtotal, discount, service, vat } = input;
  assertNonNegativeInteger(subtotal, t('Tiền hàng'));

  const discountAmount = computeAdjustment(discount, subtotal);
  if (discountAmount > subtotal) {
    throw new PeopleError('INVALID_DISCOUNT', t('Giảm giá không được lớn hơn tiền hàng.'), { discountAmount });
  }
  const netSubtotal = subtotal - discountAmount;
  const serviceAmount = computeAdjustment(service, netSubtotal);
  const vatAmount = computeAdjustment(vat, netSubtotal + serviceAmount);

  return {
    discountAmount,
    serviceAmount,
    vatAmount,
    netSubtotal,
    totalAmount: netSubtotal + serviceAmount + vatAmount,
  };
}

export interface ItemAllocation {
  discount: number[];
  service: number[];
  vat: number[];
  final: number[];
}

/**
 * Phân bổ các khoản của hoá đơn vào từng món, tuần tự để tổng mỗi khoản khớp đúng (R-8):
 * giảm giá theo tiền hàng món; phí phục vụ theo tiền sau giảm; VAT theo tiền sau giảm + phí phục vụ.
 */
export function allocateInvoiceItems(rawAmounts: number[], bill: BillTotals): ItemAllocation {
  const discount = allocateProportional(rawAmounts, bill.discountAmount);
  const afterDiscount = rawAmounts.map((r, i) => r - discount[i]);
  const service = allocateProportional(afterDiscount, bill.serviceAmount);
  const beforeVat = afterDiscount.map((n, i) => n + service[i]);
  const vat = allocateProportional(beforeVat, bill.vatAmount);
  const final = beforeVat.map((b, i) => b + vat[i]);
  return { discount, service, vat, final };
}
