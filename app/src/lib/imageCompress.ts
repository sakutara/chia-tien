import { planCompression, type CompressionPlan } from '../domain/imageQuality'
import type { CompressionPreset } from '../types'

/*
 * Nén ảnh hoá đơn bằng Canvas (BR-4.16, R-18). Chỉ chạy trên trình duyệt.
 * Không bao giờ làm ảnh to hơn hoặc lớn hơn bản gốc: khi không lợi thì trả về file gốc.
 */

export interface CompressResult {
  /** File để lưu: bản nén, hoặc chính file gốc nếu không nén được. */
  file: File
  before: number
  after: number
  /** Có thực sự dùng bản nén không. */
  compressed: boolean
  plan: CompressionPlan
}

export interface ImageDimensions {
  width: number
  height: number
}

/** Cạnh dài tối đa khi giải mã: ảnh camera hàng chục megapixel nếu giải mã nguyên kích thước sẽ làm trình duyệt hết bộ nhớ và tự tải lại trang. */
const DECODE_MAX_LONG_EDGE = 4096

/** Đọc kích thước từ phần đầu file (JPEG/PNG/WebP) mà không giải mã ảnh. Không đọc được thì trả null. */
export async function readHeaderSize(file: Blob): Promise<ImageDimensions | null> {
  try {
    const buf = new DataView(await file.slice(0, 256 * 1024).arrayBuffer())
    const len = buf.byteLength
    if (len > 24 && buf.getUint32(0) === 0x89504e47) {
      return { width: buf.getUint32(16), height: buf.getUint32(20) }
    }
    if (len > 30 && buf.getUint32(0) === 0x52494646 && buf.getUint32(8) === 0x57454250) {
      const kind = buf.getUint32(12)
      if (kind === 0x56503820) return { width: buf.getUint16(26, true) & 0x3fff, height: buf.getUint16(28, true) & 0x3fff }
      if (kind === 0x5650384c) {
        const bits = buf.getUint32(21, true)
        return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
      }
      if (kind === 0x56503858) {
        const w = 1 + (buf.getUint8(24) | (buf.getUint8(25) << 8) | (buf.getUint8(26) << 16))
        const h = 1 + (buf.getUint8(27) | (buf.getUint8(28) << 8) | (buf.getUint8(29) << 16))
        return { width: w, height: h }
      }
    }
    if (len > 4 && buf.getUint16(0) === 0xffd8) {
      let i = 2
      while (i + 9 < len) {
        if (buf.getUint8(i) !== 0xff) {
          i++
          continue
        }
        const marker = buf.getUint8(i + 1)
        if (marker === 0xff) {
          i++
          continue
        }
        if ((marker >= 0xc0 && marker <= 0xcf) && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return { width: buf.getUint16(i + 7), height: buf.getUint16(i + 5) }
        }
        i += 2 + buf.getUint16(i + 2)
      }
    }
  } catch {
    // Không đọc được phần đầu: để bước giải mã xử lý.
  }
  return null
}

/** Giải mã ảnh, thu nhỏ ngay khi giải mã nếu ảnh quá lớn. */
export async function decodeBounded(file: Blob): Promise<ImageBitmap> {
  const size = await readHeaderSize(file)
  const longEdge = size ? Math.max(size.width, size.height) : 0
  if (size && longEdge > DECODE_MAX_LONG_EDGE) {
    const scale = DECODE_MAX_LONG_EDGE / longEdge
    return createImageBitmap(file, {
      imageOrientation: 'from-image',
      resizeWidth: Math.round(size.width * scale),
      resizeHeight: Math.round(size.height * scale),
      resizeQuality: 'high',
    })
  }
  return createImageBitmap(file, { imageOrientation: 'from-image' })
}

/** Đọc kích thước ảnh (đã xoay đúng theo EXIF) mà không giữ bitmap. */
export async function probeImage(file: Blob): Promise<ImageDimensions> {
  const header = await readHeaderSize(file)
  if (header && header.width > 0 && header.height > 0) return header
  const bitmap = await decodeBounded(file)
  try {
    return { width: bitmap.width, height: bitmap.height }
  } finally {
    bitmap.close()
  }
}

function encodeJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality))
}

/** Dung lượng mục tiêu của ảnh hoá đơn đã lưu (~1 MB). */
export const TARGET_IMAGE_BYTES = 1_000_000
/** Cạnh dài nhỏ nhất khi phải thu nhỏ thêm để đạt dung lượng mục tiêu: dưới mức này chữ nhỏ trên bill khó đọc. */
const MIN_LONG_EDGE_FOR_TARGET = 1400
const JPEG_QUALITY_STEPS = [0.85, 0.75, 0.65, 0.55]

/**
 * Mã hoá canvas thành JPEG không vượt `maxBytes`: hạ chất lượng dần, vẫn quá thì thu nhỏ canvas (giữ cạnh dài ≥ 1400 px).
 * Hết cách thì trả bản nhỏ nhất đã thử. Canvas truyền vào có thể bị đổi kích thước.
 */
export async function encodeJpegWithin(canvas: HTMLCanvasElement, maxBytes: number = TARGET_IMAGE_BYTES): Promise<Blob | null> {
  let smallest: Blob | null = null
  for (;;) {
    for (const quality of JPEG_QUALITY_STEPS) {
      const blob = await encodeJpeg(canvas, quality)
      if (!blob) return smallest
      if (blob.size <= maxBytes) return blob
      if (!smallest || blob.size < smallest.size) smallest = blob
    }
    const longEdge = Math.max(canvas.width, canvas.height)
    const nextEdge = Math.round(longEdge * 0.8)
    if (nextEdge < MIN_LONG_EDGE_FOR_TARGET) return smallest
    const copy = document.createElement('canvas')
    copy.width = Math.round(canvas.width * 0.8)
    copy.height = Math.round(canvas.height * 0.8)
    const ctx = copy.getContext('2d')
    if (!ctx) return smallest
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(canvas, 0, 0, copy.width, copy.height)
    canvas.width = copy.width
    canvas.height = copy.height
    canvas.getContext('2d')?.drawImage(copy, 0, 0)
  }
}

export async function compressImage(file: File, preset: CompressionPreset): Promise<CompressResult> {
  const bitmap = await decodeBounded(file)
  try {
    const plan = planCompression(bitmap.width, bitmap.height, file.size, preset)
    const keep = (): CompressResult => ({ file, before: file.size, after: file.size, compressed: false, plan })
    if (plan.skipCompression) return keep()

    const longEdge = Math.max(bitmap.width, bitmap.height)
    const scale = plan.targetLongEdge / longEdge
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return keep()

    // Nền trắng để ảnh PNG trong suốt không thành đen khi sang JPEG.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    let blob = await encodeJpeg(canvas, plan.quality)
    if (blob && blob.size > TARGET_IMAGE_BYTES) blob = (await encodeJpegWithin(canvas)) ?? blob
    if (!blob || blob.size >= file.size) return keep()

    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    const compressed = new File([blob], name, { type: 'image/jpeg' })
    return { file: compressed, before: file.size, after: blob.size, compressed: true, plan }
  } finally {
    bitmap.close()
  }
}
