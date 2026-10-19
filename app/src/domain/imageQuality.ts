/*
 * Kế hoạch nén ảnh hoá đơn trước khi lưu (BR-4.16, R-18). Hàm thuần: không đọc ảnh, không chạm Canvas.
 */

import type { CompressionPreset } from '../types';

export type { CompressionPreset };
export type OcrReadiness = 'OK' | 'RISKY' | 'POOR';

interface PresetSpec {
  label: string;
  /** Cạnh dài tối đa sau nén; 0 nghĩa là không đổi kích thước. */
  maxLongEdge: number;
  quality: number;
}

export const COMPRESSION_PRESETS: Record<CompressionPreset, PresetSpec> = {
  ORIGINAL: { label: 'Giữ nguyên', maxLongEdge: 0, quality: 0.92 },
  BALANCED: { label: 'Cân bằng', maxLongEdge: 2000, quality: 0.8 },
  SAVER: { label: 'Tiết kiệm', maxLongEdge: 1400, quality: 0.6 },
};

/** Mức khuyến nghị khi người dùng chưa chọn. */
export const RECOMMENDED_PRESET: CompressionPreset = 'BALANCED';

/** Ảnh nhỏ hơn ngưỡng này và không cần đổi kích thước thì không nén thêm. */
export const SKIP_BELOW_BYTES = 400_000;

/** Dưới ngưỡng này OCR thường đọc sai dù chọn mức nào. */
export const OCR_POOR_LONG_EDGE = 1000;
/** Dưới hoặc bằng ngưỡng này thì OCR có thể kém với bill nhỏ chữ. */
export const OCR_RISKY_LONG_EDGE = 1400;
export const OCR_RISKY_QUALITY = 0.6;

export interface CompressionPlan {
  preset: CompressionPreset;
  targetLongEdge: number;
  quality: number;
  willResize: boolean;
  skipCompression: boolean;
  ocrReadiness: OcrReadiness;
  warnings: string[];
}

export function planCompression(
  width: number,
  height: number,
  bytes: number,
  preset: CompressionPreset,
): CompressionPlan {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new RangeError('Kích thước ảnh không hợp lệ.');
  }
  const spec = COMPRESSION_PRESETS[preset];
  const longEdge = Math.max(width, height);
  // Không bao giờ phóng to: mức đích lớn hơn cạnh hiện tại thì giữ nguyên.
  const targetLongEdge = spec.maxLongEdge === 0 ? longEdge : Math.min(longEdge, spec.maxLongEdge);
  const willResize = targetLongEdge < longEdge;
  const skipCompression = !willResize && bytes <= SKIP_BELOW_BYTES;

  const warnings: string[] = [];
  let ocrReadiness: OcrReadiness = 'OK';
  if (targetLongEdge < OCR_POOR_LONG_EDGE) {
    ocrReadiness = 'POOR';
    warnings.push('Ảnh nhỏ, OCR có thể đọc sai. Hãy chụp lại ở độ phân giải cao hơn hoặc gần bill hơn.');
  } else if (targetLongEdge <= OCR_RISKY_LONG_EDGE || spec.quality <= OCR_RISKY_QUALITY) {
    ocrReadiness = 'RISKY';
    warnings.push('Mức này có thể làm OCR kém với bill nhỏ chữ. Nhập tay vẫn luôn được.');
  }

  return {
    preset,
    targetLongEdge,
    quality: spec.quality,
    willResize,
    skipCompression,
    ocrReadiness,
    warnings,
  };
}

/** Mức nén có hợp lệ để lưu không (dùng khi đọc lựa chọn đã nhớ từ bộ nhớ cục bộ). */
export function isCompressionPreset(value: unknown): value is CompressionPreset {
  return value === 'ORIGINAL' || value === 'BALANCED' || value === 'SAVER';
}
