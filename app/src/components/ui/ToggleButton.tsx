interface Props {
  checked: boolean
  onChange: (next: boolean) => void
  /** Nhãn của trạng thái bật. Nút hiện nhãn của trạng thái KẾ TIẾP: đang tắt thì hiện nhãn này (bấm để bật). */
  label: string
  /** Nhãn của trạng thái tắt; hiện khi đang bật (bấm để tắt). Không truyền thì dùng chung `label`. */
  uncheckedLabel?: string
  disabled?: boolean
  className?: string
}

/** Nút nhấn chuyển đổi hai trạng thái: hiện lựa chọn sẽ được áp dụng khi bấm (ngược với trạng thái hiện tại). */
export default function ToggleButton({ checked, onChange, label, uncheckedLabel, disabled, className = '' }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`inline-flex min-h-8 items-center justify-center rounded-lg border px-3 py-1 text-sm font-medium transition-colors disabled:opacity-50 ${
        checked ? 'border-usd-green-700 bg-usd-green-100 text-usd-green-900' : 'border-usd-paper-200 bg-white text-usd-green-900'
      } ${className}`}
    >
      {checked ? (uncheckedLabel ?? label) : label}
    </button>
  )
}
