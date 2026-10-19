import { CalendarDays, List, ShieldCheck } from 'lucide-react'
import { useRef, type KeyboardEvent } from 'react'
import type { MealViewMode } from '../../types'

interface Props {
  mode: MealViewMode
  onChange: (mode: MealViewMode) => void
}

const OPTIONS: ReadonlyArray<{ mode: MealViewMode; label: string; Icon: typeof List }> = [
  { mode: 'CALENDAR', label: 'Lịch', Icon: CalendarDays },
  { mode: 'LIST', label: 'Danh sách', Icon: List },
  { mode: 'STATUS', label: 'Theo loại', Icon: ShieldCheck },
]

/** Thanh chuyển 3 chế độ xem bữa (BR-3.7). Mũi tên trái/phải đổi chế độ. */
export default function MealViewSwitcher({ mode, onChange }: Props) {
  const refs = useRef<Record<MealViewMode, HTMLButtonElement | null>>({ CALENDAR: null, LIST: null, STATUS: null })

  function onKeyDown(e: KeyboardEvent) {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (step === 0) return
    e.preventDefault()
    const index = OPTIONS.findIndex((o) => o.mode === mode)
    const next = OPTIONS[(index + step + OPTIONS.length) % OPTIONS.length].mode
    onChange(next)
    refs.current[next]?.focus()
  }

  return (
    <div role="tablist" aria-label="Chế độ xem bữa" className="flex gap-0.5 rounded-xl bg-usd-paper-200 p-0.5" onKeyDown={onKeyDown}>
      {OPTIONS.map(({ mode: m, label, Icon }) => {
        const selected = m === mode
        return (
          <button
            key={m}
            ref={(el) => {
              refs.current[m] = el
            }}
            role="tab"
            type="button"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(m)}
            aria-label={label}
            title={label}
            className={`flex h-9 w-10 items-center justify-center rounded-lg ${
              selected ? 'bg-usd-green-900 text-usd-paper-50' : 'text-usd-green-900 hover:bg-usd-paper-50'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}
