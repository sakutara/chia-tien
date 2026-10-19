import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  title: string
  onClose: () => void
  /** `lg` cho form dài (hoá đơn) để tận dụng màn hình rộng. */
  size?: 'md' | 'lg'
  children: ReactNode
}

/**
 * Hộp thoại modal dùng `<dialog>` gốc (focus trap, Esc, lớp phủ do trình duyệt lo).
 * Phần tử có `data-autofocus` bên trong được focus khi mở; đóng thì trả focus về nút đã mở.
 * Môi trường chưa có `showModal` (jsdom) rơi về thuộc tính `open`.
 */
export default function Modal({ open, title, onClose, size = 'md', children }: Props) {
  if (!open) return null
  return (
    <ModalBody title={title} onClose={onClose} size={size}>
      {children}
    </ModalBody>
  )
}

function ModalBody({ title, onClose, size = 'md', children }: Omit<Props, 'open'>) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null

    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')
    dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()

    return () => {
      if (typeof dialog.close === 'function' && dialog.open) dialog.close()
      opener?.focus()
    }
  }, [])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className={`m-auto max-h-[92vh] w-[calc(100%-1rem)] ${size === 'lg' ? 'max-w-2xl' : 'max-w-lg'} overflow-y-auto rounded-xl border border-usd-paper-200 bg-usd-paper-50 p-0 text-usd-green-950 shadow-xl backdrop:bg-usd-green-950/50`}
    >
      <div className="space-y-3 p-4 sm:p-5">
        <header className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="-m-2 flex h-10 w-10 items-center justify-center rounded-full text-usd-green-700 hover:bg-usd-paper-200"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  )
}
