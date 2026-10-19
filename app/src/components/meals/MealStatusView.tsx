import { useRef, useState, type KeyboardEvent } from 'react'
import type { MealStatus, MealSummary } from '../../types'
import MealCard from './MealCard'
import { EmptyState } from './MealListView'

interface Props {
  summaries: MealSummary[]
  onOpen: (mealId: string) => void
  onDelete: (mealId: string) => void
  onCreate: () => void
}

const TABS: ReadonlyArray<{ status: MealStatus; label: string; empty: string }> = [
  { status: 'ACTIVE', label: 'Đang hoạt động', empty: 'Chưa có bữa nào đang hoạt động.' },
  {
    status: 'ARCHIVED',
    label: 'Đã lưu trữ',
    empty: 'Chưa có bữa nào được lưu trữ. Bữa chỉ lưu trữ được khi mọi khoản thanh toán đã hoàn tất.',
  },
]

/** Chế độ xem Loại: hai tab Đang hoạt động / Đã lưu trữ kèm số đếm (BR-3.6, R-15). */
export default function MealStatusView({ summaries, onOpen, onDelete, onCreate }: Props) {
  const [active, setActive] = useState<MealStatus>('ACTIVE')
  const tabRefs = useRef<Record<MealStatus, HTMLButtonElement | null>>({ ACTIVE: null, ARCHIVED: null })

  if (summaries.length === 0) return <EmptyState onCreate={onCreate} />

  function onKeyDown(e: KeyboardEvent) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const next: MealStatus = active === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE'
    setActive(next)
    tabRefs.current[next]?.focus()
  }

  const current = TABS.find((t) => t.status === active) ?? TABS[0]
  const shown = summaries.filter((s) => s.meal.status === active)

  return (
    <div className="space-y-2">
      <div role="tablist" aria-label="Loại bữa" className="flex gap-2" onKeyDown={onKeyDown}>
        {TABS.map((tab) => {
          const count = summaries.filter((s) => s.meal.status === tab.status).length
          const selected = tab.status === active
          return (
            <button
              key={tab.status}
              ref={(el) => {
                tabRefs.current[tab.status] = el
              }}
              role="tab"
              type="button"
              id={`status-tab-${tab.status}`}
              aria-selected={selected}
              aria-controls="status-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.status)}
              className={`min-h-11 flex-1 rounded-lg border px-3 py-2 text-sm font-semibold ${
                selected
                  ? 'border-usd-green-700 bg-usd-green-700 text-usd-paper-50'
                  : 'border-usd-paper-200 bg-usd-paper-50 text-usd-green-900 hover:bg-usd-paper-200'
              }`}
            >
              {tab.label} ({count})
            </button>
          )
        })}
      </div>

      <div role="tabpanel" id="status-panel" aria-labelledby={`status-tab-${active}`}>
        {shown.length === 0 ? (
          <p className="rounded-lg border border-dashed border-usd-paper-200 p-4 text-sm text-usd-green-700">{current.empty}</p>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((s) => (
              <li key={s.meal.id}>
                <MealCard summary={s} onOpen={onOpen} onDelete={onDelete} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
