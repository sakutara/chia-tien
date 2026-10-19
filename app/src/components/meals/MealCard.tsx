import { ArrowRight, Layers, Lock, Trash2, Users } from 'lucide-react'
import { formatDateVi } from '../../lib/dates'
import { formatMoney } from '../../lib/money'
import type { MealSummary } from '../../types'
import IconButton from '../ui/IconButton'

interface Props {
  summary: MealSummary
  onOpen: (mealId: string) => void
  onDelete: (mealId: string) => void
  /** Ẩn dòng ngày khi thẻ đã nằm dưới tiêu đề ngày (khung bữa trong ngày của lịch). */
  hideDate?: boolean
}

/** Thẻ bữa dùng chung cho Danh sách, Loại và khung ngày của Lịch (BR-3.5, BR-3.8). */
export default function MealCard({ summary, onOpen, onDelete, hideDate }: Props) {
  const { meal, sessionCount, participantCount, totalAmount, hasCost, paidCount, entityCount } = summary
  const archived = meal.status === 'ARCHIVED'

  return (
    <article className="rounded-xl border border-usd-paper-200 bg-usd-paper-50 px-3 py-2 shadow-sm">
      <div className="flex items-start gap-1">
        <div className="min-w-0 flex-1">
          {!hideDate && <p className="money !text-left text-xs text-usd-green-700">{formatDateVi(meal.date)}</p>}
          <h3>
            <button type="button" className="flex w-full items-center gap-1.5 rounded-lg py-0.5 text-left" onClick={() => onOpen(meal.id)} aria-label={`Mở chi tiết: ${meal.title}`}>
              <span className="break-words font-semibold">{meal.title}</span>
              {archived && <Lock className="h-3.5 w-3.5 shrink-0 text-usd-gold-600" aria-label="Đã lưu trữ" />}
            </button>
          </h3>
        </div>
        <IconButton icon={ArrowRight} label={`Mở: ${meal.title}`} onClick={() => onOpen(meal.id)} />
        <IconButton icon={Trash2} label={`Xoá bữa: ${meal.title}`} tone="danger" onClick={() => onDelete(meal.id)} />
      </div>

      <dl className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs">
        <div className="flex items-center gap-1">
          <Layers className="h-3.5 w-3.5 text-usd-green-700" aria-hidden="true" />
          <dt className="sr-only">Số kèo</dt>
          <dd>{sessionCount}</dd>
        </div>
        <div className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5 text-usd-green-700" aria-hidden="true" />
          <dt className="sr-only">Số người</dt>
          <dd>{participantCount}</dd>
        </div>
        <div>
          <dt className="sr-only">Tổng chi phí</dt>
          <dd className={hasCost ? 'money font-semibold' : 'text-usd-green-700'}>{hasCost ? formatMoney(totalAmount) : 'Chưa có chi phí'}</dd>
        </div>
        {hasCost && (
          <div>
            <dt className="sr-only">Tiến độ thanh toán</dt>
            <dd className="text-usd-green-700">
              {paidCount}/{entityCount} đã trả
            </dd>
          </div>
        )}
      </dl>
    </article>
  )
}
