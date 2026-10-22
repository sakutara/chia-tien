import { decodeBounded, encodeJpegWithin, TARGET_IMAGE_BYTES } from './imageCompress'
import { RECEIPT_SCAN_CONTRAST, scanDocument, type GrayImage } from './documentScan'
import { t } from '../i18n'

/*
 * Chụp/tải ảnh hoá đơn → ảnh kiểu máy quét (cắt theo 4 góc, nắn thẳng, trắng đen, chữ dày) để OCR đọc rõ hơn.
 * Phần số học ở lib/documentScan; tệp này chỉ làm cầu nối với Canvas nên chỉ chạy trên trình duyệt.
 */

function toGray(bitmap: ImageBitmap): GrayImage {
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error(t('Canvas không khả dụng.'))
  // Nền trắng để ảnh PNG trong suốt không thành đen.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0)
  const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  const data = new Uint8ClampedArray(canvas.width * canvas.height)
  for (let p = 0, i = 0; p < rgba.length; p += 4, i++) data[i] = 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2]
  return { data, width: canvas.width, height: canvas.height }
}

/** PNG nếu bản PNG đủ nhẹ (≤ `limit` byte), không thì JPEG hạ dần. */
export function pickScanEncoding(pngBytes: number | null, limit: number = TARGET_IMAGE_BYTES): 'png' | 'jpeg' {
  return pngBytes !== null && pngBytes <= limit ? 'png' : 'jpeg'
}

export interface ScannedImage {
  file: File
  /** Đã cắt theo 4 góc tờ hoá đơn (false: không thấy tờ giấy rõ, chỉ nhị phân hoá cả ảnh). */
  cropped: boolean
}

/**
 * Biến ảnh chụp hoá đơn thành ảnh quét PNG đen trắng. Trả `null` khi kết quả đáng ngờ (ví dụ ảnh quá tối),
 * lúc đó người gọi giữ ảnh gốc.
 */
export async function scanReceiptImage(file: File): Promise<ScannedImage | null> {
  const bitmap = await decodeBounded(file)
  let gray: GrayImage
  try {
    gray = toGray(bitmap)
  } finally {
    bitmap.close()
  }
  // Nhị phân thích nghi contrast 0,25, không làm dày chữ trừ khi nét đứt (02 §3 bước 1).
  const result = scanDocument(gray, { contrast: RECEIPT_SCAN_CONTRAST })
  if (!result) return null

  const { image } = result
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error(t('Canvas không khả dụng.'))
  const out = ctx.createImageData(image.width, image.height)
  for (let i = 0, p = 0; i < image.data.length; i++, p += 4) {
    out.data[p] = out.data[p + 1] = out.data[p + 2] = image.data[i]
    out.data[p + 3] = 255
  }
  ctx.putImageData(out, 0, 0)
  const base = file.name.replace(/\.[^.]+$/, '') + '-scan'
  // PNG giữ nét chữ đen trắng không mất chi tiết (thường 200–500 KB); quá ~1 MB (ảnh xám của tài liệu sạch) thì JPEG hạ dần (BR-4.16).
  const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (png && pickScanEncoding(png.size) === 'png') return { file: new File([png], `${base}.png`, { type: 'image/png' }), cropped: result.cropped }
  const jpeg = await encodeJpegWithin(canvas)
  if (jpeg) return { file: new File([jpeg], `${base}.jpg`, { type: 'image/jpeg' }), cropped: result.cropped }
  return png ? { file: new File([png], `${base}.png`, { type: 'image/png' }), cropped: result.cropped } : null
}
