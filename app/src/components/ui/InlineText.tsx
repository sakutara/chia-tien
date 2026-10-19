import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { PeopleError } from '../../services/peopleErrors'

interface Props {
  value: string
  /** Lưu giá trị mới; ném `PeopleError` để hiện lỗi ngay dưới ô. */
  onCommit: (next: string) => void | Promise<unknown>
  /** Tên truy cập của nút bấm và của ô nhập. */
  label: string
  placeholder?: string
  readOnly?: boolean
  maxLength?: number
  type?: 'text' | 'date'
  multiline?: boolean
  /** Chữ hiển thị khi chưa có giá trị. */
  empty?: string
  /** Định dạng chữ khi không sửa (ví dụ ngày dd/mm/yyyy). */
  display?: (value: string) => string
  className?: string
  inputClassName?: string
  min?: string
  max?: string
}

/** Chữ bấm vào để sửa tại chỗ: Enter/rời ô để lưu, Esc để huỷ. Thay cho nút "Đổi tên" riêng. */
export default function InlineText({
  value,
  onCommit,
  label,
  placeholder,
  readOnly,
  maxLength,
  type = 'text',
  multiline,
  empty = '—',
  display,
  className = '',
  inputClassName = '',
  min,
  max,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null)
  const cancelled = useRef(false)

  useEffect(() => {
    if (editing) ref.current?.focus()
  }, [editing])

  if (readOnly) {
    return <span className={`break-words ${className}`}>{value ? (display ? display(value) : value) : empty}</span>
  }

  async function commit() {
    if (cancelled.current) {
      cancelled.current = false
      return
    }
    if (draft === value) {
      setEditing(false)
      setError(null)
      return
    }
    try {
      await onCommit(draft)
      setEditing(false)
      setError(null)
    } catch (err) {
      setError(err instanceof PeopleError ? err.message : 'Có lỗi không xác định.')
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Escape') {
      cancelled.current = true
      setEditing(false)
      setError(null)
    } else if (e.key === 'Enter' && !(multiline && e.shiftKey)) {
      e.preventDefault()
      void commit()
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        className={`editable break-words ${className}`}
        title={`${label} — bấm để sửa`}
        onClick={() => {
          setDraft(value)
          setEditing(true)
        }}
      >
        {value ? (display ? display(value) : value) : <span className="italic text-usd-green-700">{empty}</span>}
      </button>
    )
  }

  const common = {
    ref,
    value: draft,
    'aria-label': label,
    placeholder,
    maxLength,
    onBlur: () => void commit(),
    onKeyDown,
    className: `field ${inputClassName}`,
  }

  return (
    <span className="block min-w-0">
      {multiline ? (
        <textarea {...common} rows={2} onChange={(e) => setDraft(e.target.value)} />
      ) : (
        <input {...common} type={type} min={min} max={max} onChange={(e) => setDraft(e.target.value)} />
      )}
      {error && (
        <span role="alert" className="mt-0.5 block text-xs text-usd-red-600">
          {error}
        </span>
      )}
    </span>
  )
}
