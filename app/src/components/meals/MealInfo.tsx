import { CalendarDays, Lock, NotebookPen } from 'lucide-react'
import { MAX_YMD, MIN_YMD, formatDateVi } from '../../lib/dates'
import { formatMoney } from '../../lib/money'
import { updateMealInfo } from '../../services/mealService'
import type { MealPeopleView } from '../../hooks/useMealPeople'
import type { MealSummary } from '../../types'
import HostSelector from '../people/HostSelector'
import InlineText from '../ui/InlineText'
import { t } from '../../i18n'

interface Props {
  view: MealPeopleView
  summary: MealSummary | undefined
}

/** Bước 1 — thông tin bữa sửa ngay tại chỗ: tên, ngày, chủ trì (dropdown), ghi chú (BR-3.2). */
export default function MealInfo({ view, summary }: Props) {
  const { meal, participants } = view
  const archived = meal.status === 'ARCHIVED'
  const save = (patch: Partial<{ title: string; date: string; note: string }>) =>
    updateMealInfo(meal.id, { title: meal.title, date: meal.date, note: meal.note ?? '', ...patch })

  return (
    <div className="space-y-3">
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div className="min-w-0 sm:col-span-2">
          <dt className="text-xs text-usd-green-700">{t('Tên bữa')}</dt>
          <dd className="text-lg font-bold">
            <InlineText label={t('Tên bữa')} value={meal.title} readOnly={archived} onCommit={(title) => save({ title })} maxLength={140} />
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-xs text-usd-green-700">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            {t('Ngày')}
          </dt>
          <dd className="money !text-left">
            <InlineText
              label={t('Ngày diễn ra')}
              type="date"
              value={meal.date}
              display={formatDateVi}
              readOnly={archived}
              min={MIN_YMD}
              max={MAX_YMD}
              onCommit={(date) => save({ date })}
            />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-usd-green-700">{t('Chủ trì')}</dt>
          <dd>
            <HostSelector mealId={meal.id} participants={participants} hostMemberId={meal.hostMemberId} readOnly={archived} />
          </dd>
        </div>
        <div className="min-w-0 sm:col-span-2">
          <dt className="flex items-center gap-1 text-xs text-usd-green-700">
            <NotebookPen className="h-3.5 w-3.5" aria-hidden="true" />
            {t('Ghi chú')}
          </dt>
          <dd className="whitespace-pre-line">
            <InlineText
              label={t('Ghi chú')}
              value={meal.note ?? ''}
              empty={t('Thêm ghi chú')}
              multiline
              readOnly={archived}
              onCommit={(note) => save({ note })}
            />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-usd-green-700">{t('Tổng chi')}</dt>
          <dd className={summary?.hasCost ? 'money !text-left font-semibold' : 'text-usd-green-700'}>
            {summary?.hasCost ? formatMoney(summary.totalAmount) : t('Chưa có chi phí')}
          </dd>
        </div>
      </dl>

      {archived && (
        <p className="flex items-start gap-2 rounded-lg border border-usd-gold-600 p-2 text-xs">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-usd-gold-600" aria-hidden="true" />
          {t('Đã lưu trữ: ảnh và chi tiết món đã xoá, chỉ xem. Vẫn xoá được bữa.')}
        </p>
      )}
    </div>
  )
}
