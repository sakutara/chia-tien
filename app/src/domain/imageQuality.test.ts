import { describe, expect, it } from 'vitest';
import { planCompression, SKIP_BELOW_BYTES } from './imageQuality';

const MB = 1_000_000;

describe('planCompression (BR-4.16, R-18)', () => {
  it('Cân bằng thu cạnh dài về 2000 px với chất lượng 0,8', () => {
    const plan = planCompression(4032, 3024, 5 * MB, 'BALANCED');
    expect(plan.targetLongEdge).toBe(2000);
    expect(plan.quality).toBe(0.8);
    expect(plan.willResize).toBe(true);
    expect(plan.ocrReadiness).toBe('OK');
  });

  it('Tiết kiệm nằm sát ngưỡng nên bị gắn nhãn RISKY', () => {
    const plan = planCompression(4032, 3024, 5 * MB, 'SAVER');
    expect(plan.targetLongEdge).toBe(1400);
    expect(plan.ocrReadiness).toBe('RISKY');
    expect(plan.warnings.length).toBeGreaterThan(0);
  });

  it('Giữ nguyên không đổi kích thước', () => {
    const plan = planCompression(4032, 3024, 5 * MB, 'ORIGINAL');
    expect(plan.targetLongEdge).toBe(4032);
    expect(plan.willResize).toBe(false);
    expect(plan.quality).toBe(0.92);
  });

  it('không phóng to ảnh nhỏ hơn mức đích', () => {
    const plan = planCompression(1500, 1000, 3 * MB, 'BALANCED');
    expect(plan.targetLongEdge).toBe(1500);
    expect(plan.willResize).toBe(false);
  });

  it('ảnh nhỏ hơn 1000 px bị cảnh báo OCR kém dù chọn mức nào', () => {
    const plan = planCompression(800, 600, 200_000, 'BALANCED');
    expect(plan.ocrReadiness).toBe('POOR');
    expect(plan.warnings[0]).toMatch(/OCR/);
  });

  it('ảnh vốn đã nhỏ và không cần đổi kích thước thì bỏ qua nén', () => {
    expect(planCompression(1200, 900, SKIP_BELOW_BYTES, 'BALANCED').skipCompression).toBe(true);
    expect(planCompression(1200, 900, SKIP_BELOW_BYTES + 1, 'BALANCED').skipCompression).toBe(false);
  });

  it('từ chối kích thước không hợp lệ', () => {
    expect(() => planCompression(0, 100, 1000, 'BALANCED')).toThrow(RangeError);
  });
});
