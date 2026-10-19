import { CalendarCheck, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { groupByDate } from '../../domain/mealRules'
import {
  MAX_YMD,
  MIN_YMD,
  WEEKDAY_LABELS,
  buildMonthGrid,
  formatDateVi,
  parseYmd,
  shiftMonth,
  todayLocal,
  toYmd,
} from '../../lib/dates'
import { formatMoney } from '../../lib/money'
import type { MealSummary } from '../../types'
import IconButton from '../ui/IconButton'
import MealCard from './MealCard'

interface Props {
  summaries: MealSummary[]
  onCreateForDate: (ymd: string) => void
  onOpen: (mealId: string) => void
  onDelete: (mealId: string) => void
}

const YEARS = Array.from({ length: 100 }, (_, i) => 2000 + i)
const MAX_BADGES = 2

function clampYmd(ymd: string): string {
  return ymd < MIN_YMD ? MIN_YMD : ymd > MAX_YMD ? MAX_YMD : ymd
}

function addDays(ymd: string, delta: number): string {
  const p = parseYmd(ymd)
  if (!p) return ymd
  const d = new Date(p.year, p.month - 1, p.day + delta)
  return clampYmd(toYmd(d.getFullYear(), d.getMonth() + 1, d.getDate()))
}

/** Chế độ xem Lịch (BR-3.4, R-12…R-14): lưới tháng, chọn ngày, khung bữa trong ngày. */
export default function MealCalendarView({ summaries, onCreateForDate, onOpen, onDelete }: Props) {
  const today = todayLocal()
  const initial = parseYmd(today)!
  const [year, setYear] = useState(initial.year)
  const [month, setMonth] = useState(initial.month)
  const [selected, setSelected] = useState(today)
  const focusAfterRender = useRef(false)

  const byDate = useMemo(() => groupByDate(summaries), [summaries])
  const grid = useMemo(() => buildMonthGrid(year, month, today), [year, month, today])

  // Giữ focus trên ô vừa chọn bằng bàn phím sau khi lưới dựng lại.
  useEffect(() => {
    if (!focusAfterRender.current) return
    focusAfterRender.current = false
    document.querySelector<HTMLElement>(`[data-ymd="${selected}"]`)?.focus()
  }, [selected, year, month])

  function show(ymd: string, viaKeyboard = false) {
    const p = parseYmd(ymd)
    if (!p) return
    focusAfterRender.current = viaKeyboard
    setSelected(ymd)
    setYear(p.year)
    setMonth(p.month)
  }

  function goMonth(delta: number) {
    const next = shiftMonth(year, month, delta)
    if (next.year < 2000 || next.year > 2099) return
    setYear(next.year)
    setMonth(next.month)
    // R-14: giữ ngày đang chọn nếu vẫn nằm trong lưới mới; nếu không thì chọn ngày 1 của tháng mới.
    const stillVisible = buildMonthGrid(next.year, next.month, today).some((d) => d.ymd === selected)
    if (!stillVisible) setSelected(toYmd(next.year, next.month, 1))
  }

  function onGridKeyDown(e: KeyboardEvent) {
    const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key]
    if (delta === undefined) return
    e.preventDefault()
    show(addDays(selected, delta), true)
  }

  const dayMeals = byDate.get(selected) ?? []
  const atMin = year === 2000 && month === 1
  const atMax = year === 2099 && month === 12

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <IconButton icon={ChevronLeft} label="Tháng trước" tone="outline" onClick={() => goMonth(-1)} disabled={atMin} />
        <label className="sr-only" htmlFor="cal-month">Tháng</label>
        <select
          id="cal-month"
          value={month}
          onChange={(e) => show(toYmd(year, Number(e.target.value), 1))}
          className="field min-h-10 w-auto px-2"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              Tháng {i + 1}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="cal-year">Năm</label>
        <select
          id="cal-year"
          value={year}
          onChange={(e) => show(toYmd(Number(e.target.value), month, 1))}
          className="field min-h-10 w-auto px-2"
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <IconButton icon={ChevronRight} label="Tháng sau" tone="outline" onClick={() => goMonth(1)} disabled={atMax} />
        <IconButton icon={CalendarCheck} label="Hôm nay" tone="outline" className="ml-auto" onClick={() => show(today)} />
      </div>

      <div role="grid" aria-label={`Lịch tháng ${month} năm ${year}`} onKeyDown={onGridKeyDown}>
        <div role="row" className="grid grid-cols-7 text-center text-xs font-semibold text-usd-green-700">
          {WEEKDAY_LABELS.map((w) => (
            <div key={w} role="columnheader" className="py-1">
              {w}
            </div>
          ))}
        </div>
        {Array.from({ length: grid.length / 7 }, (_, week) => (
          <div key={week} role="row" className="grid grid-cols-7">
            {grid.slice(week * 7, week * 7 + 7).map((d) => {
              const meals = byDate.get(d.ymd) ?? []
              const isSelected = d.ymd === selected
              return (
                <div key={d.ymd} role="gridcell" aria-selected={isSelected} className="min-w-0 border border-usd-paper-200">
                  <button
                    type="button"
                    data-ymd={d.ymd}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => show(d.ymd)}
                    aria-label={`${formatDateVi(d.ymd)}${meals.length ? `, ${meals.length} bữa` : ''}${d.isToday ? ', hôm nay' : ''}`}
                    className={`flex h-12 w-full min-w-0 flex-col items-stretch gap-0.5 p-1 text-left sm:h-20 ${
                      isSelected ? 'bg-usd-green-100' : d.inMonth ? 'bg-usd-paper-50 hover:bg-usd-paper-200' : 'bg-usd-paper-100 hover:bg-usd-paper-200'
                    } ${d.inMonth ? '' : 'opacity-50'}`}
                  >
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                        d.isToday ? 'bg-usd-green-900 text-usd-paper-50' : ''
                      }`}
                    >
                      {d.day}
                    </span>
                    {meals.length > 0 && (
                      <>
                        <span className="sm:hidden">
                          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-usd-green-700 px-1 text-[10px] font-semibold text-usd-paper-50">
                            {meals.length}
                          </span>
                        </span>
                        <span className="hidden min-w-0 flex-col gap-0.5 sm:flex">
                          {meals.slice(0, MAX_BADGES).map((s) => (
                            <span key={s.meal.id} className="truncate rounded bg-usd-green-700 px-1 text-[11px] text-usd-paper-50">
                              {s.meal.title}
                              {s.hasCost && <> · {formatMoney(s.totalAmount)}</>}
                            </span>
                          ))}
                          {meals.length > MAX_BADGES && (
                            <span className="text-[11px] text-usd-green-700">+{meals.length - MAX_BADGES} bữa nữa</span>
                          )}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        ))}
      </div>
      </div>

      <section aria-label={`Bữa ngày ${formatDateVi(selected)}`} className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Ngày {formatDateVi(selected)}</h2>
          <IconButton icon={Plus} label="Tạo bữa mới cho ngày này" tone="primary" onClick={() => onCreateForDate(selected)} />
        </div>
        {dayMeals.length === 0 ? (
          <p className="text-sm text-usd-green-700">Chưa có bữa nào vào ngày này.</p>
        ) : (
          <ul className="space-y-2">
            {dayMeals.map((s) => (
              <li key={s.meal.id}>
                <MealCard summary={s} onOpen={onOpen} onDelete={onDelete} hideDate />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
