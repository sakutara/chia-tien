import { Check, Minus, Plus } from 'lucide-react'
import { MAX_ITEM_SHARES } from '../../domain/invoiceRules'
import type { ItemShare, Member } from '../../types'
import IconButton from './IconButton'
import Popover from './Popover'
import { t } from '../../i18n'

interface BaseProps {
  /** Tên truy cập, ví dụ "Người tham gia kèo Kèo 1". */
  label: string
  options: Member[]
  readOnly?: boolean
  /** Chữ hiển thị khi chưa chọn ai. */
  empty?: string
}

interface MultiProps extends BaseProps {
  mode: 'multi'
  value: string[]
  onChange: (ids: string[]) => void
  /** Số người tối thiểu phải giữ lại (ví dụ chia đều cần ít nhất 1). */
  min?: number
}

interface SharesProps extends BaseProps {
  mode: 'shares'
  value: ItemShare[]
  onChange: (shares: ItemShare[]) => void
}

interface SingleProps extends BaseProps {
  mode: 'single'
  value: string
  onChange: (id: string) => void
}

type Props = MultiProps | SharesProps | SingleProps

/** "An, Bình" hoặc "An ×2, Bình" khi có số phần. */
function namesText(options: Member[], props: Pick<Props, 'mode' | 'value'>): string {
  const byId = new Map(options.map((m) => [m.id, m.name]))
  if (props.mode === 'single') return byId.get(props.value as string) ?? ''
  if (props.mode === 'shares') {
    return (props.value as ItemShare[])
      .filter((s) => byId.has(s.memberId))
      .map((s) => (s.shares > 1 ? `${byId.get(s.memberId)} ×${s.shares}` : byId.get(s.memberId)))
      .join(', ')
  }
  return options
    .filter((m) => (props.value as string[]).includes(m.id))
    .map((m) => m.name)
    .join(', ')
}

/**
 * Danh sách người luôn hiện dạng chuỗi "An, Bình"; bấm vào để thêm bớt (chọn nhiều, chọn một
 * hoặc chọn kèm số phần). Mỗi lần bấm lưu ngay, không cần nút xác nhận.
 */
export default function PeoplePicker(props: Props) {
  const { label, options, readOnly, empty = t('Chọn') } = props
  const text = namesText(options, props)
  const shown = text || empty

  if (readOnly) return <span className="break-words">{text || '—'}</span>

  return (
    <Popover
      label={label}
      summary={text || t('chưa chọn')}
      trigger={text ? text : <span className="italic text-usd-green-700">{shown}</span>}
    >
      {props.mode === 'multi' && <MultiList {...props} />}
      {props.mode === 'shares' && <SharesList {...props} />}
      {props.mode === 'single' && <SingleList {...props} />}
    </Popover>
  )
}

const ROW = 'flex min-h-10 items-center gap-2 rounded-lg px-2 py-1 hover:bg-usd-paper-200'

function MultiList({ label, options, value, onChange, min = 0 }: MultiProps) {
  const toggle = (id: string) => {
    const on = value.includes(id)
    if (on && value.length <= min) return
    onChange(on ? value.filter((x) => x !== id) : options.filter((m) => m.id === id || value.includes(m.id)).map((m) => m.id))
  }
  return (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs text-usd-green-700">
          {value.length}/{options.length}
        </span>
        <IconButton icon={Check} label={t('Chọn tất cả: {label}', { label })} onClick={() => onChange(options.map((m) => m.id))} disabled={value.length === options.length} />
      </div>
      <ul className="max-h-60 space-y-0.5 overflow-auto">
        {options.map((m) => {
          const on = value.includes(m.id)
          return (
            <li key={m.id}>
              <label className={ROW}>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-usd-green-800"
                  checked={on}
                  disabled={on && value.length <= min}
                  onChange={() => toggle(m.id)}
                />
                <span>{m.name}</span>
              </label>
            </li>
          )
        })}
      </ul>
    </>
  )
}

function SharesList({ label, options, value, onChange }: SharesProps) {
  const sharesOf = (id: string) => value.find((s) => s.memberId === id)?.shares ?? 0
  const set = (id: string, shares: number) => {
    if (shares > MAX_ITEM_SHARES) return
    const rest = value.filter((s) => s.memberId !== id)
    onChange(shares < 1 ? rest : [...rest, { memberId: id, shares }])
  }
  const allOn = options.length > 0 && options.every((m) => sharesOf(m.id) === 1)
  return (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs text-usd-green-700">
          {value.length}/{options.length}
        </span>
        <IconButton
          icon={Check}
          label={t('Chọn tất cả: {label}', { label })}
          onClick={() => onChange(options.map((m) => ({ memberId: m.id, shares: 1 })))}
          disabled={allOn}
        />
      </div>
      <ul className="max-h-60 space-y-0.5 overflow-auto">
        {options.map((m) => {
          const n = sharesOf(m.id)
          return (
            <li key={m.id} className={`${ROW} justify-between`}>
              <label className="flex min-w-0 flex-1 items-center gap-2">
                <input type="checkbox" className="h-4 w-4 accent-usd-green-800" checked={n > 0} onChange={() => set(m.id, n > 0 ? 0 : 1)} />
                <span className="truncate">{m.name}</span>
              </label>
              {n > 0 && (
                <span className="flex items-center gap-0.5">
                  <IconButton icon={Minus} label={n > 1 ? t('Giảm số phần của {name}', { name: m.name }) : t('Bỏ {name}', { name: m.name })} onClick={() => set(m.id, n - 1)} />
                  <span className="min-w-5 text-center font-semibold" aria-live="polite">
                    {n}
                  </span>
                  <IconButton icon={Plus} label={t('Tăng số phần của {name}', { name: m.name })} onClick={() => set(m.id, n + 1)} disabled={n >= MAX_ITEM_SHARES} />
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}

function SingleList({ label, options, value, onChange }: SingleProps) {
  return (
    <ul role="radiogroup" aria-label={label} className="max-h-60 space-y-0.5 overflow-auto">
      {options.map((m) => (
        <li key={m.id}>
          <label className={ROW}>
            <input type="radio" name={label} className="h-4 w-4 accent-usd-green-800" checked={m.id === value} onChange={() => onChange(m.id)} />
            <span>{m.name}</span>
          </label>
        </li>
      ))}
    </ul>
  )
}
