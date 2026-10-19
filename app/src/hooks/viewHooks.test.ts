import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_VIEW_MODE, readViewMode } from './useMealViewMode'
import { mealPath, parseRoute } from './useHashRoute'

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe('parseRoute (R-17)', () => {
  it('maps empty and root hashes to the meal list', () => {
    expect(parseRoute('')).toEqual({ name: 'home' })
    expect(parseRoute('#')).toEqual({ name: 'home' })
    expect(parseRoute('#/')).toEqual({ name: 'home' })
  })

  it('parses a meal id', () => {
    const id = '0b9c6f4e-1a2b-4c3d-8e9f-001122334455'
    expect(parseRoute(`#/meal/${id}`)).toEqual({ name: 'meal', id })
    expect(parseRoute(mealPath(id))).toEqual({ name: 'home' }) // mealPath không có dấu '#'
  })

  it('falls back to the list for unknown or hostile values', () => {
    expect(parseRoute('#/meal/')).toEqual({ name: 'home' })
    expect(parseRoute('#/meal/<script>')).toEqual({ name: 'home' })
    expect(parseRoute('#/meal/abc')).toEqual({ name: 'home' })
    expect(parseRoute('#/meal/abc', '')).toEqual({ name: 'home' })
  })
})

describe('readViewMode (R-16)', () => {
  it('defaults to LIST', () => {
    expect(readViewMode()).toBe(DEFAULT_VIEW_MODE)
    expect(DEFAULT_VIEW_MODE).toBe('LIST')
  })

  it('returns a stored valid mode and ignores junk', () => {
    window.localStorage.setItem('usd-split.mealView', 'CALENDAR')
    expect(readViewMode()).toBe('CALENDAR')
    window.localStorage.setItem('usd-split.mealView', 'weird')
    expect(readViewMode()).toBe('LIST')
  })

  it('survives localStorage throwing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(readViewMode()).toBe('LIST')
  })
})

describe('parseRoute — chế độ Snapshot (Epic 8, R-6)', () => {
  it('nhận ?snapshot= và khôi phục dấu + bị đổi thành khoảng trắng', () => {
    expect(parseRoute('', '?snapshot=abc+def')).toEqual({ name: 'snapshot', encoded: 'abc+def' })
    expect(parseRoute('', '?snapshot=abc%2Bdef')).toEqual({ name: 'snapshot', encoded: 'abc+def' })
  })

  it('nhận #/snapshot/<chuỗi> và giữ link rỗng để viewer báo lỗi', () => {
    expect(parseRoute('#/snapshot/XYZ-1$+')).toEqual({ name: 'snapshot', encoded: 'XYZ-1$+' })
    expect(parseRoute('', '?snapshot=')).toEqual({ name: 'snapshot', encoded: '' })
  })

  it('snapshot ưu tiên trên route bữa', () => {
    expect(parseRoute('#/meal/123e4567-e89b-12d3-a456-426614174000', '?snapshot=q').name).toBe('snapshot')
  })
})
