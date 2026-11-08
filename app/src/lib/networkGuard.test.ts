import { afterEach, describe, expect, it, vi } from 'vitest'
import { detectConnectionKind, shouldConfirmModelDownload } from './networkGuard'

/** Thay `navigator` của trình duyệt bằng một đối tượng có (hoặc không có) `connection`. */
function stubNavigator(connection?: Record<string, unknown>) {
  vi.stubGlobal('navigator', connection ? { connection } : {})
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('detectConnectionKind', () => {
  it('Android/Chrome báo wifi hoặc ethernet thì là wifi', () => {
    stubNavigator({ type: 'wifi', saveData: false })
    expect(detectConnectionKind()).toBe('wifi')
    stubNavigator({ type: 'ethernet' })
    expect(detectConnectionKind()).toBe('wifi')
  })

  it('cellular hoặc wimax là cellular', () => {
    stubNavigator({ type: 'cellular' })
    expect(detectConnectionKind()).toBe('cellular')
    stubNavigator({ type: 'wimax' })
    expect(detectConnectionKind()).toBe('cellular')
  })

  it('bật tiết kiệm dữ liệu thì coi như cellular dù đang ở Wi-Fi', () => {
    stubNavigator({ type: 'wifi', saveData: true })
    expect(detectConnectionKind()).toBe('cellular')
  })

  it('không có navigator.connection (iOS Safari) hoặc type không rõ thì là unknown', () => {
    stubNavigator()
    expect(detectConnectionKind()).toBe('unknown')
    stubNavigator({ type: 'other' })
    expect(detectConnectionKind()).toBe('unknown')
  })

  it('đọc được API tiền tố của Firefox/WebKit cũ khi không có navigator.connection', () => {
    vi.stubGlobal('navigator', { mozConnection: { type: 'wifi' } })
    expect(detectConnectionKind()).toBe('wifi')
  })
})

describe('shouldConfirmModelDownload', () => {
  it('model đã có trong cache thì không hỏi, dù mạng là gì', () => {
    stubNavigator({ type: 'cellular' })
    expect(shouldConfirmModelDownload(true)).toBe(false)
  })

  it('đang dùng Wi-Fi thì tải luôn, không hỏi', () => {
    stubNavigator({ type: 'wifi' })
    expect(shouldConfirmModelDownload(false)).toBe(false)
  })

  it('mạng di động thì hỏi', () => {
    stubNavigator({ type: 'cellular' })
    expect(shouldConfirmModelDownload(false)).toBe(true)
  })

  it('không xác định được mạng (iOS) thì hỏi', () => {
    stubNavigator()
    expect(shouldConfirmModelDownload(false)).toBe(true)
  })
})
