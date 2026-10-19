interface Props {
  checked: boolean
  onChange: (next: boolean) => void
  /** Nhãn hiển thị cạnh công tắc, đồng thời là tên truy cập. */
  label: string
  disabled?: boolean
  className?: string
}

/** Công tắc bật/tắt (role="switch") thay cho cặp nút chọn một trong hai. */
export default function Switch({ checked, onChange, label, disabled, className = '' }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-2 rounded-lg py-1 text-sm disabled:opacity-50 ${className}`}
    >
      <span
        aria-hidden="true"
        className={`relative inline-block h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-usd-green-700' : 'bg-usd-paper-200'}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? 'left-[1.125rem]' : 'left-0.5'}`}
        />
      </span>
      <span>{label}</span>
    </button>
  )
}
