import { useEffect, useRef } from 'react'

interface Scroller {
  el: Element
  /** Lúc bắt đầu chạm, còn cuộn được sang trái / sang phải không. */
  canLeft: boolean
  canRight: boolean
}

/** Các vùng cuộn ngang bao quanh đích chạm (slide, hàng chip lọc) kèm khả năng cuộn còn lại. */
function horizontalScrollers(target: EventTarget | null): Scroller[] {
  const found: Scroller[] = []
  for (let el = target instanceof Element ? target : null; el; el = el.parentElement) {
    if (el.scrollWidth > el.clientWidth && /auto|scroll/.test(getComputedStyle(el).overflowX)) {
      found.push({ el, canLeft: el.scrollLeft > 1, canRight: el.scrollLeft + el.clientWidth < el.scrollWidth - 1 })
    }
  }
  return found
}

const MIN_DISTANCE = 60

/** Vuốt trong hộp thoại hoặc ô nhập liệu không được đổi bước phía sau. */
const IGNORED = 'dialog, [role="dialog"], input, textarea, select'

/**
 * Vuốt ngang bất kỳ đâu trên trang (kể cả khoảng trống) để đổi bước: vuốt sang trái → bước sau, sang phải → bước trước.
 * Bỏ qua cử chỉ chủ yếu là dọc (cuộn trang). Trong vùng cuộn ngang (slide, bộ lọc), vuốt trước hết dùng để cuộn;
 * chỉ khi đã ở mép (slide đầu/cuối) thì vuốt tiếp mới đổi bước.
 */
export function useSwipeSteps(onPrev: () => void, onNext: () => void) {
  const handlers = useRef({ onPrev, onNext })
  useEffect(() => {
    handlers.current = { onPrev, onNext }
  })

  useEffect(() => {
    let start: { x: number; y: number; scrollers: Scroller[] } | null = null

    function onTouchStart(e: TouchEvent) {
      const t = e.touches[0]
      const ignored = e.target instanceof Element && e.target.closest(IGNORED)
      start = e.touches.length === 1 && t && !ignored ? { x: t.clientX, y: t.clientY, scrollers: horizontalScrollers(e.target) } : null
    }

    function onTouchEnd(e: TouchEvent) {
      const s = start
      start = null
      const t = e.changedTouches[0]
      if (!s || !t) return
      const dx = t.clientX - s.x
      const dy = t.clientY - s.y
      if (Math.abs(dx) < MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.5) return
      // Vuốt sang trái kéo nội dung sang phải: cuộn được nếu còn chỗ bên phải.
      if (s.scrollers.some((sc) => (dx < 0 ? sc.canRight : sc.canLeft))) return
      if (dx < 0) handlers.current.onNext()
      else handlers.current.onPrev()
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [])
}
