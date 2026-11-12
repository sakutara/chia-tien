import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateId } from './id'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('generateId', () => {
  it('tạo UUID v4 hợp lệ và mỗi lần một giá trị khác nhau', () => {
    const ids = Array.from({ length: 50 }, () => generateId())
    for (const id of ids) expect(id).toMatch(UUID_V4)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('dùng được khi không có crypto.randomUUID (mở app qua http LAN)', () => {
    const real = globalThis.crypto
    vi.stubGlobal('crypto', {
      getRandomValues: (arr: Uint8Array<ArrayBuffer>) => real.getRandomValues(arr),
    })
    const id = generateId()
    expect(id).toMatch(UUID_V4)
    expect(id).toHaveLength(36)
  })

  it('nhánh thay thế đặt đúng bit phiên bản và biến thể khi getRandomValues trả toàn 0xff', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (arr: Uint8Array<ArrayBuffer>) => arr.fill(0xff),
    })
    expect(generateId()).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff')
  })
})
