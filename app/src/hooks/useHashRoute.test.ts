import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { exitSnapshot, mealPath, parseRoute, useHashRoute } from './useHashRoute'

const MEAL_ID = '0b9c6f4e-1a2b-4c3d-8e9f-001122334455'

afterEach(() => {
  vi.restoreAllMocks()
  window.history.replaceState(null, '', '/')
})

describe('parseRoute - tham số ?s= và ?snapshot=', () => {
  it('nhận ?s= (dạng ngắn hiện hành) và giữ dấu + sau khi URLSearchParams đổi thành khoảng trắng', () => {
    expect(parseRoute('', '?s=~abc+def')).toEqual({ name: 'snapshot', encoded: '~abc+def' })
  })

  it('vẫn nhận ?snapshot= của link cũ, cả khi dấu + bị mã hoá thành %2B', () => {
    expect(parseRoute('', '?snapshot=old+link')).toEqual({ name: 'snapshot', encoded: 'old+link' })
    expect(parseRoute('', '?snapshot=old%2Blink')).toEqual({ name: 'snapshot', encoded: 'old+link' })
  })

  it('?s= rỗng vẫn là chế độ snapshot để viewer báo link bị cắt', () => {
    expect(parseRoute('', '?s=')).toEqual({ name: 'snapshot', encoded: '' })
  })

  it('tham số không liên quan không kích hoạt snapshot', () => {
    expect(parseRoute('', '?l=en')).toEqual({ name: 'home' })
    expect(parseRoute(mealPath(MEAL_ID), '?l=en')).toEqual({ name: 'home' })
  })

  it('?s= ưu tiên hơn cả #/snapshot/ lẫn route bữa', () => {
    expect(parseRoute('#/snapshot/fromHash', '?s=fromSearch')).toEqual({ name: 'snapshot', encoded: 'fromSearch' })
    expect(parseRoute(`#/meal/${MEAL_ID}`, '?s=q').name).toBe('snapshot')
  })
})

describe('parseRoute - #/snapshot/<chuỗi>', () => {
  it('nhận chuỗi mã hoá có ký tự URL-safe', () => {
    expect(parseRoute('#/snapshot/~AbC_-09')).toEqual({ name: 'snapshot', encoded: '~AbC_-09' })
  })

  it('hash snapshot rỗng vẫn thành route snapshot với chuỗi rỗng', () => {
    expect(parseRoute('#/snapshot/')).toEqual({ name: 'snapshot', encoded: '' })
  })

  it('hash snapshot có thêm dấu / thừa không được coi là snapshot', () => {
    expect(parseRoute('#/snapshot/a/b')).toEqual({ name: 'home' })
  })
})

describe('useHashRoute', () => {
  it('đọc route hiện tại và cập nhật khi hash đổi', async () => {
    window.location.hash = '#/'
    const { result } = renderHook(() => useHashRoute())
    expect(result.current.route).toEqual({ name: 'home' })

    act(() => result.current.navigate(mealPath(MEAL_ID)))
    await waitFor(() => expect(result.current.route).toEqual({ name: 'meal', id: MEAL_ID }))
    expect(window.location.hash).toBe(`#${mealPath(MEAL_ID)}`)
  })

  it('vào thẳng link ?s= thì route là snapshot', () => {
    window.history.replaceState(null, '', '/?s=~xyz')
    const { result } = renderHook(() => useHashRoute())
    expect(result.current.route).toEqual({ name: 'snapshot', encoded: '~xyz' })
  })
})

describe('exitSnapshot', () => {
  it('xoá ?s= khỏi địa chỉ, về trang chủ và phát hashchange để hook đọc lại', async () => {
    window.history.replaceState(null, '', '/?s=~xyz')
    const { result } = renderHook(() => useHashRoute())
    expect(result.current.route.name).toBe('snapshot')

    act(() => exitSnapshot())
    expect(window.location.search).toBe('')
    expect(window.location.hash).toBe('#/')
    await waitFor(() => expect(result.current.route).toEqual({ name: 'home' }))
  })

  it('bỏ cả tham số ?snapshot= cũ', () => {
    window.history.replaceState(null, '', '/?snapshot=old')
    const listener = vi.fn()
    window.addEventListener('hashchange', listener)
    exitSnapshot()
    window.removeEventListener('hashchange', listener)
    expect(window.location.search).toBe('')
    expect(listener).toHaveBeenCalled()
  })
})
