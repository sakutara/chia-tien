import type { MealSummary } from '../../types'
import { Plus } from 'lucide-react'
import IconButton from '../ui/IconButton'
import MealCard from './MealCard'
import { t } from '../../i18n'

interface Props {
  summaries: MealSummary[]
  onOpen: (mealId: string) => void
  onDelete: (mealId: string) => void
  onCreate: () => void
}

/** Chế độ xem Danh sách: mới → cũ (BR-3.5, R-8). `summaries` đã được xếp. */
export default function MealListView({ summaries, onOpen, onDelete, onCreate }: Props) {
  if (summaries.length === 0) return <EmptyState onCreate={onCreate} />

  return (
    <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3" aria-label={t('Danh sách bữa')}>
      {summaries.map((s) => (
        <li key={s.meal.id}>
          <MealCard summary={s} onOpen={onOpen} onDelete={onDelete} />
        </li>
      ))}
    </ul>
  )
}

/** R-18: lần đầu mở app. */
export function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="card space-y-2 text-center">
      <h2 className="text-base font-semibold">{t('Chưa có bữa nào')}</h2>
      <p className="text-sm text-usd-green-700">{t('Tạo bữa → thêm người → nhập hoá đơn → chia tiền.')}</p>
      <IconButton icon={Plus} label={t('Tạo bữa đầu tiên')} tone="primary" className="mx-auto" onClick={onCreate} />
    </div>
  )
}
