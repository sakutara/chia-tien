import type { LucideIcon } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: LucideIcon
  /** Tên truy cập và tooltip; nút chỉ có icon nên bắt buộc. */
  label: string
  tone?: 'default' | 'primary' | 'danger' | 'outline'
}

const TONE = {
  default: '',
  primary: 'icon-btn-solid',
  danger: 'icon-btn-danger',
  outline: 'icon-btn-outline',
} as const

/** Nút chỉ có icon. Tên nằm ở `aria-label` + `title`, không chiếm chỗ trên màn hình nhỏ. */
export default function IconButton({ icon: Icon, label, tone = 'default', className = '', type = 'button', ...rest }: Props) {
  return (
    <button type={type} aria-label={label} title={label} className={`icon-btn ${TONE[tone]} ${className}`} {...rest}>
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  )
}
