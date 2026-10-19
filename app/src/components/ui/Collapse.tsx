import { ChevronDown } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'

interface Props {
  title: ReactNode
  /** Tên truy cập của nút đóng/mở; mặc định lấy từ `title` khi là chuỗi. */
  label?: string
  defaultOpen?: boolean
  children: ReactNode
  className?: string
}

/** Khối thu gọn, mặc định đóng. Nút tiêu đề mở/đóng nội dung. */
export default function Collapse({ title, label, defaultOpen = false, children, className = '' }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  return (
    <section className={`rounded-lg border border-usd-paper-200 ${className}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-10 w-full items-center justify-between gap-2 px-3 text-left text-sm font-semibold"
      >
        <span className="min-w-0">{title}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div id={id} className="border-t border-usd-paper-200 p-3">
          {children}
        </div>
      )}
    </section>
  )
}
