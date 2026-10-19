import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { compressImage, probeImage } from './imageCompress'

/** Canvas giả: ghi lại kích thước vẽ và trả về blob có dung lượng định sẵn. */
function fakeCanvas(outBytes: number) {
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({ fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn() }),
    toBlob: (cb: (b: Blob | null) => void, type: string) => cb(new Blob([new Uint8Array(outBytes)], { type })),
  }
  return canvas
}

function imageFile(size: number, name = 'bill.png', type = 'image/png'): File {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('compressImage', () => {
  let canvasOut: number

  beforeEach(() => {
    canvasOut = 500_000
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 4032, height: 3024, close: vi.fn() })),
    )
    const realCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) =>
      tag === 'canvas' ? fakeCanvas(canvasOut) : realCreate(tag)) as typeof document.createElement)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('nén về cạnh dài 2000 px và trả về JPEG nhỏ hơn', async () => {
    const result = await compressImage(imageFile(8_000_000), 'BALANCED')
    expect(result.compressed).toBe(true)
    expect(result.file.type).toBe('image/jpeg')
    expect(result.file.name).toBe('bill.jpg')
    expect(result.after).toBe(500_000)
    expect(result.plan.targetLongEdge).toBe(2000)
  })

  it('giữ file gốc khi bản nén không nhỏ hơn', async () => {
    canvasOut = 9_000_000
    const original = imageFile(8_000_000)
    const result = await compressImage(original, 'BALANCED')
    expect(result.compressed).toBe(false)
    expect(result.file).toBe(original)
  })

  it('bỏ qua nén với ảnh nhỏ và không cần đổi kích thước', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 1200, height: 900, close: vi.fn() })),
    )
    const original = imageFile(200_000)
    const result = await compressImage(original, 'BALANCED')
    expect(result.compressed).toBe(false)
    expect(result.file).toBe(original)
  })
})

describe('probeImage', () => {
  it('đọc kích thước và đóng bitmap', async () => {
    const close = vi.fn()
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 640, height: 480, close })))
    await expect(probeImage(new Blob(['x']))).resolves.toEqual({ width: 640, height: 480 })
    expect(close).toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
