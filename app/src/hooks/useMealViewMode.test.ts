import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMealViewMode } from './useMealViewMode'

const KEY = 'usd-split.mealView'

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe('useMealViewMode', () => {
  it('mặc định là LIST khi chưa lưu gì', () => {
    const { result } = renderHook(() => useMealViewMode())
    expect(result.current[0]).toBe('LIST')
  })

  it('khôi phục chế độ đã chọn lần trước', () => {
    window.localStorage.setItem(KEY, 'STATUS')
    const { result } = renderHook(() => useMealViewMode())
    expect(result.current[0]).toBe('STATUS')
  })

  it('đổi chế độ thì cập nhật ngay và ghi nhớ cho lần sau', () => {
    const { result } = renderHook(() => useMealViewMode())
    act(() => result.current[1]('CALENDAR'))
    expect(result.current[0]).toBe('CALENDAR')
    expect(window.localStorage.getItem(KEY)).toBe('CALENDAR')
  })

  it('localStorage đọc lỗi (chế độ riêng tư) vẫn cho dùng, rơi về LIST', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const { result } = renderHook(() => useMealViewMode())
    expect(result.current[0]).toBe('LIST')
  })

  it('localStorage ghi lỗi vẫn đổi được chế độ trong phiên', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    const { result } = renderHook(() => useMealViewMode())
    act(() => result.current[1]('STATUS'))
    expect(result.current[0]).toBe('STATUS')
  })
})
