const formatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

/** `1620000` → `1.620.000 ₫`. Tiền VNĐ không có phần lẻ nên làm tròn đến đồng. */
export function formatMoney(amount: number): string {
  return `${formatter.format(Math.round(amount))} ₫`;
}

const MAX_MONEY = 9_999_999_999;

/**
 * Đọc số tiền người dùng gõ (R-1): `45000`, `45.000`, `45,000`, `45k`, `1,5k`, `45.000 ₫`.
 * Trả về số nguyên đồng không âm, hoặc `null` nếu không hợp lệ.
 */
export function parseMoney(input: string): number | null {
  const compact = input
    .replace(/₫|đ|vnđ|vnd/gi, '')
    .replace(/\s+/g, '')
    .trim();
  if (compact === '') return null;

  // Dạng có đơn vị nghìn: 45k, 1,5k, 1.5k.
  const kMatch = /^(\d+)(?:[.,](\d{1,3}))?k$/i.exec(compact);
  if (kMatch) {
    const whole = Number(kMatch[1]);
    const fraction = kMatch[2] ? Number(`0.${kMatch[2]}`) : 0;
    const value = Math.round((whole + fraction) * 1000);
    return value <= MAX_MONEY ? value : null;
  }

  // Dạng nhóm nghìn: 45.000, 1,620,000.
  if (/^\d{1,3}(?:[.,]\d{3})+$/.test(compact)) {
    const value = Number(compact.replace(/[.,]/g, ''));
    return value <= MAX_MONEY ? value : null;
  }

  // Dạng số thuần: 120000.
  if (/^\d+$/.test(compact)) {
    const value = Number(compact);
    return value <= MAX_MONEY ? value : null;
  }
  return null;
}
