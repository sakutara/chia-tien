/*
 * Tiền xử lý ảnh trước khi OCR (02 §3, bước 1): đưa cạnh dài về khoảng 2800 px (phóng to ảnh nhỏ, thu ảnh quá lớn),
 * chuyển xám, kéo giãn tương phản. Tesseract cần chữ cao tối thiểu ~25 px; ảnh bill đã nén thường chỉ rộng ~600 px nên
 * không phóng to thì đọc sai gần hết.
 * Chỉ chạy trên trình duyệt (Canvas). Bản đã lưu của hoá đơn không bị đổi.
 */

export const OCR_TARGET_LONG_EDGE = 2800
/** Hệ số phóng to tối đa, để ảnh rất nhỏ không tốn bộ nhớ vô ích. */
export const OCR_MAX_UPSCALE = 3

/** Hệ số co giãn: phóng to ảnh nhỏ tới cạnh dài mục tiêu (tối đa 3×), thu ảnh lớn hơn mục tiêu. */
export function ocrScale(width: number, height: number): number {
  const longEdge = Math.max(width, height)
  return Math.min(OCR_MAX_UPSCALE, OCR_TARGET_LONG_EDGE / longEdge)
}

/**
 * Kéo giãn tương phản theo phân vị 2% và 98% của mức xám, để chữ in nhiệt mờ rõ hơn trên nền giấy.
 * Trả về mảng mới; ảnh đồng nhất (lo ≥ hi) thì giữ nguyên.
 */
export function stretchContrast(gray: Uint8ClampedArray): Uint8ClampedArray {
  const histogram = new Array<number>(256).fill(0)
  for (const v of gray) histogram[v]++

  const total = gray.length
  const lowCount = total * 0.02
  const highCount = total * 0.98
  let lo = 0
  let hi = 255
  let acc = 0
  for (let v = 0; v < 256; v++) {
    acc += histogram[v]
    if (acc >= lowCount) {
      lo = v
      break
    }
  }
  acc = 0
  for (let v = 0; v < 256; v++) {
    acc += histogram[v]
    if (acc >= highCount) {
      hi = v
      break
    }
  }

  const out = new Uint8ClampedArray(gray.length)
  if (hi <= lo) {
    out.set(gray)
    return out
  }
  const scale = 255 / (hi - lo)
  for (let i = 0; i < gray.length; i++) {
    out[i] = (gray[i] - lo) * scale
  }
  return out
}

/** Ảnh đã chuẩn bị cho Tesseract: PNG xám, tương phản đã kéo giãn. */
export async function prepareForOcr(source: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' })
  try {
    const scale = ocrScale(bitmap.width, bitmap.height)
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas không khả dụng.')
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0, width, height)

    const image = ctx.getImageData(0, 0, width, height)
    const data = image.data
    const gray = new Uint8ClampedArray(width * height)
    for (let p = 0, i = 0; p < data.length; p += 4, i++) {
      gray[i] = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]
    }
    const stretched = stretchContrast(gray)
    for (let p = 0, i = 0; p < data.length; p += 4, i++) {
      data[p] = data[p + 1] = data[p + 2] = stretched[i]
      data[p + 3] = 255
    }
    ctx.putImageData(image, 0, 0)

    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Không tạo được ảnh OCR.'))), 'image/png'),
    )
  } finally {
    bitmap.close()
  }
}
