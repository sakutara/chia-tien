import type { AdjustmentMode } from '../../types'
import type { AdjustmentState } from './formState'
import { T, t } from '../../i18n'

interface Props {
  /** Tên khoản, ví dụ "Giảm giá", "Phí phục vụ", "VAT". */
  label: string
  /** Tiền tố id để liên kết nhãn với ô nhập. */
  idBase: string
  value: AdjustmentState
  onChange: (next: AdjustmentState) => void
}

const SELECT = 'field min-h-10 px-2'
const INPUT = 'field min-h-10'

const MODE_LABEL: Record<AdjustmentMode, string> = {
  NONE: T('Không'),
  PERCENTAGE: T('Theo %'),
  FIXED_AMOUNT: T('Số tiền'),
}

/** Một khoản điều chỉnh của hoá đơn: chọn cách tính (không / % / số tiền) và nhập giá trị (BR-4.15, BR-4.9). */
export default function InvoiceAdjustments({ label, idBase, value, onChange }: Props) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-end gap-1.5">
      <div>
        <label htmlFor={`${idBase}-mode`} className="mb-0.5 block text-xs font-medium text-usd-green-700">
          {label}
        </label>
        <select
          id={`${idBase}-mode`}
          value={value.mode}
          onChange={(e) => onChange({ mode: e.target.value as AdjustmentMode, value: '' })}
          className={`${SELECT} w-full`}
        >
          {(Object.keys(MODE_LABEL) as AdjustmentMode[]).map((mode) => (
            <option key={mode} value={mode}>
              {t(MODE_LABEL[mode])}
            </option>
          ))}
        </select>
      </div>
      <div>
        {value.mode !== 'NONE' && (
          <>
            <label htmlFor={`${idBase}-value`} className="sr-only">
              {label} — {value.mode === 'PERCENTAGE' ? t('phần trăm') : t('số tiền')}
            </label>
            <input
              id={`${idBase}-value`}
              inputMode="numeric"
              value={value.value}
              placeholder={value.mode === 'PERCENTAGE' ? t('VD: 8') : t('VD: 45.000')}
              onChange={(e) => onChange({ ...value, value: e.target.value })}
              className={INPUT}
            />
          </>
        )}
      </div>
    </div>
  )
}
