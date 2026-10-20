import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { t } from '../../i18n'

interface Props {
  /** Tên truy cập của nút mở và của khung nổi. */
  label: string
  /** Nội dung nút mở (thường là chuỗi tên hoặc "SL × giá = tiền"). */
  trigger: ReactNode
  /** Bản chữ của `trigger`, gộp vào tên truy cập để trình đọc màn hình đọc được giá trị hiện tại. */
  summary?: string
  disabled?: boolean
  triggerClassName?: string
  /** Nội dung khung; dạng hàm nhận `close` để tự đóng sau khi lưu. */
  children: ReactNode | ((close: () => void) => ReactNode)
}

/**
 * Khung nổi mở khi bấm vào nội dung. Trên điện thoại hiện dạng tờ trượt ở đáy màn hình,
 * trên máy tính hiện ngay dưới nội dung. Đóng khi bấm ra ngoài hoặc nhấn Esc.
 */
export default function Popover({ label, trigger, summary, disabled, triggerClassName = '', children }: Props) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLSpanElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <span ref={root} className="relative inline-block max-w-full align-baseline">
      <button
        type="button"
        className={`editable break-words ${triggerClassName}`}
        aria-label={summary ? `${label}: ${summary}` : label}
        title={t('{label} — bấm để sửa', { label })}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        {trigger}
      </button>
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={label}
          className="absolute left-0 top-full z-30 mt-1 w-72 max-w-[calc(100vw-2rem)] space-y-2 rounded-xl border border-usd-paper-200 bg-usd-paper-50 p-3 text-sm shadow-lg max-sm:fixed max-sm:inset-x-3 max-sm:bottom-3 max-sm:top-auto max-sm:mt-0 max-sm:w-auto max-sm:max-w-none"
        >
          {typeof children === 'function' ? children(() => setOpen(false)) : children}
        </div>
      )}
    </span>
  )
}
