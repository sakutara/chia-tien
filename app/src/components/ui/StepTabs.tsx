import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react'
import { useRef, type KeyboardEvent } from 'react'
import IconButton from './IconButton'

export interface Step<K extends string = string> {
  key: K
  /** Nhãn ngắn, hiện dưới icon. */
  label: string
  icon: LucideIcon
}

interface Props<K extends string> {
  steps: ReadonlyArray<Step<K>>
  active: K
  onChange: (key: K) => void
  /** Tên truy cập của thanh tab. */
  label: string
  idBase: string
}

/**
 * Thanh bước cố định ở đáy màn hình: nút trước, các tab bước, nút sau trên một hàng.
 * Mũi tên trái/phải trên bàn phím đổi bước. Trang chứa nó cần chừa `pb-20` để nội dung không bị che.
 */
export default function StepTabs<K extends string>({ steps, active, onChange, label, idBase }: Props<K>) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})

  function onKeyDown(e: KeyboardEvent) {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (step === 0) return
    e.preventDefault()
    const i = steps.findIndex((s) => s.key === active)
    const next = steps[(i + step + steps.length) % steps.length].key
    onChange(next)
    refs.current[next]?.focus()
  }

  const current = steps.findIndex((s) => s.key === active)

  return (
    <nav aria-label={label} className="fixed inset-x-0 bottom-0 z-20 border-t border-usd-paper-200 bg-usd-paper-50/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-1 px-2 py-1 sm:px-6">
        <IconButton icon={ChevronLeft} label="Bước trước" tone="outline" disabled={current <= 0} onClick={() => onChange(steps[current - 1].key)} />
        <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="grid min-w-0 flex-1 grid-flow-col auto-cols-fr gap-1 rounded-xl bg-usd-paper-200 p-1">
          {steps.map(({ key, label: text, icon: Icon }, index) => {
            const selected = key === active
            return (
              <button
                key={key}
                ref={(el) => {
                  refs.current[key] = el
                }}
                id={`${idBase}-tab-${key}`}
                role="tab"
                type="button"
                aria-selected={selected}
                aria-controls={`${idBase}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => onChange(key)}
                className={`flex min-h-10 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-0.5 text-[11px] font-semibold leading-tight sm:flex-row sm:gap-2 sm:text-sm ${
                  selected ? 'bg-usd-green-900 text-usd-paper-50 shadow' : 'text-usd-green-900 hover:bg-usd-paper-50'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="max-w-full truncate">
                  <span className="hidden opacity-70 sm:inline">{index + 1}. </span>{text}
                </span>
              </button>
            )
          })}
        </div>
        <IconButton icon={ChevronRight} label="Bước sau" tone="primary" disabled={current >= steps.length - 1} onClick={() => onChange(steps[current + 1].key)} />
      </div>
    </nav>
  )
}
