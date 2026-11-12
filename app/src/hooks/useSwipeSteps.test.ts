import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSwipeSteps } from './useSwipeSteps'

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

/** Gửi một cử chỉ vuốt từ (x1, y1) đến (x2, y2) lên phần tử đích, như trình duyệt cảm ứng. */
function swipe(target: Element, from: [number, number], to: [number, number], touches = 1) {
  const start = new Event('touchstart', { bubbles: true, cancelable: true })
  const startTouches = Array.from({ length: touches }, () => ({ clientX: from[0], clientY: from[1] }))
  Object.defineProperty(start, 'touches', { value: startTouches })
  target.dispatchEvent(start)

  const end = new Event('touchend', { bubbles: true, cancelable: true })
  Object.defineProperty(end, 'changedTouches', { value: [{ clientX: to[0], clientY: to[1] }] })
  target.dispatchEvent(end)
}

/** Vùng cuộn ngang giả lập (jsdom không tính layout): rộng 1000, hiển thị 300. */
function scroller(scrollLeft: number) {
  const el = document.createElement('div')
  el.style.overflowX = 'auto'
  Object.defineProperties(el, {
    scrollWidth: { value: 1000 },
    clientWidth: { value: 300 },
    scrollLeft: { value: scrollLeft, writable: true },
  })
  document.body.appendChild(el)
  return el
}

describe('useSwipeSteps', () => {
  it('vuốt sang trái chuyển bước sau, vuốt sang phải chuyển bước trước', () => {
    const onPrev = vi.fn()
    const onNext = vi.fn()
    renderHook(() => useSwipeSteps(onPrev, onNext))
    const page = document.body.appendChild(document.createElement('main'))

    swipe(page, [300, 200], [150, 205])
    expect(onNext).toHaveBeenCalledTimes(1)
    expect(onPrev).not.toHaveBeenCalled()

    swipe(page, [100, 200], [260, 198])
    expect(onPrev).toHaveBeenCalledTimes(1)
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('cử chỉ quá ngắn hoặc chủ yếu là vuốt dọc (cuộn trang) không đổi bước', () => {
    const onPrev = vi.fn()
    const onNext = vi.fn()
    renderHook(() => useSwipeSteps(onPrev, onNext))
    const page = document.body.appendChild(document.createElement('main'))

    swipe(page, [200, 200], [150, 205]) // dx = -50, dưới ngưỡng 60
    swipe(page, [200, 100], [120, 260]) // dx = -80 nhưng dy = 160 lớn hơn nhiều
    expect(onNext).not.toHaveBeenCalled()
    expect(onPrev).not.toHaveBeenCalled()
  })

  it('vuốt bắt đầu trong ô nhập hoặc hộp thoại không đổi bước', () => {
    const onPrev = vi.fn()
    const onNext = vi.fn()
    renderHook(() => useSwipeSteps(onPrev, onNext))
    const input = document.body.appendChild(document.createElement('input'))
    const dialog = document.body.appendChild(document.createElement('div'))
    dialog.setAttribute('role', 'dialog')
    const inside = dialog.appendChild(document.createElement('span'))

    swipe(input, [300, 200], [100, 200])
    swipe(inside, [300, 200], [100, 200])
    expect(onNext).not.toHaveBeenCalled()
  })

  it('cử chỉ nhiều ngón (ví dụ pinch) không đổi bước', () => {
    const onPrev = vi.fn()
    const onNext = vi.fn()
    renderHook(() => useSwipeSteps(onPrev, onNext))
    const page = document.body.appendChild(document.createElement('main'))
    swipe(page, [300, 200], [100, 200], 2)
    expect(onNext).not.toHaveBeenCalled()
  })

  it('trong slide còn cuộn được sang phải thì vuốt trái chỉ cuộn, chưa đổi bước; tới mép mới đổi', () => {
    const onPrev = vi.fn()
    const onNext = vi.fn()
    renderHook(() => useSwipeSteps(onPrev, onNext))

    const notAtEnd = scroller(0)
    swipe(notAtEnd, [300, 200], [100, 200])
    expect(onNext).not.toHaveBeenCalled()

    const atEnd = scroller(700) // scrollLeft + clientWidth = scrollWidth: đã ở mép phải
    swipe(atEnd, [300, 200], [100, 200])
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('dùng callback mới nhất sau khi render lại', () => {
    const first = vi.fn()
    const second = vi.fn()
    const onPrev = vi.fn()
    const { rerender } = renderHook(({ onNext }) => useSwipeSteps(onPrev, onNext), { initialProps: { onNext: first } })
    rerender({ onNext: second })
    const page = document.body.appendChild(document.createElement('main'))
    swipe(page, [300, 200], [100, 200])
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })
})
