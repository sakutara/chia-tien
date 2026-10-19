import { Plus } from 'lucide-react'
import { useState } from 'react'
import DeleteMealDialog from '../components/meals/DeleteMealDialog'
import MealCalendarView from '../components/meals/MealCalendarView'
import MealFormDialog from '../components/meals/MealFormDialog'
import MealListView from '../components/meals/MealListView'
import MealStatusView from '../components/meals/MealStatusView'
import MealViewSwitcher from '../components/meals/MealViewSwitcher'
import IconButton from '../components/ui/IconButton'
import { useMealSummaries } from '../hooks/useMealSummaries'
import { useMealViewMode } from '../hooks/useMealViewMode'
import type { Meal } from '../types'

interface Props {
  onOpenMeal: (mealId: string) => void
}

/** Màn hình Quản lý Bữa với 3 chế độ xem trên cùng một nguồn dữ liệu (BR-3.4…3.8). */
export default function MealsPage({ onOpenMeal }: Props) {
  const summaries = useMealSummaries()
  const [mode, setMode] = useMealViewMode()
  // `undefined` = đóng; chuỗi rỗng = mở và dùng ngày mặc định (hôm nay).
  const [createDate, setCreateDate] = useState<string | undefined>(undefined)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  if (!summaries) return <p className="text-usd-green-700">Đang tải…</p>

  const deleting = summaries.find((s) => s.meal.id === deletingId)?.meal
  const openCreate = (ymd = '') => setCreateDate(ymd)
  const saved = (meal: Meal) => {
    setCreateDate(undefined)
    onOpenMeal(meal.id)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Bữa ăn</h2>
        <div className="flex items-center gap-2">
          <MealViewSwitcher mode={mode} onChange={setMode} />
          <IconButton icon={Plus} label="Tạo bữa mới" tone="primary" onClick={() => openCreate()} />
        </div>
      </div>

      {mode === 'CALENDAR' && (
        <MealCalendarView
          summaries={summaries}
          onCreateForDate={openCreate}
          onOpen={onOpenMeal}
          onDelete={setDeletingId}
        />
      )}
      {mode === 'LIST' && (
        <MealListView summaries={summaries} onOpen={onOpenMeal} onDelete={setDeletingId} onCreate={() => openCreate()} />
      )}
      {mode === 'STATUS' && (
        <MealStatusView summaries={summaries} onOpen={onOpenMeal} onDelete={setDeletingId} onCreate={() => openCreate()} />
      )}

      {createDate !== undefined && (
        <MealFormDialog mode="create" initialDate={createDate || undefined} onClose={() => setCreateDate(undefined)} onSaved={saved} />
      )}
      {deleting && (
        <DeleteMealDialog
          mealId={deleting.id}
          title={deleting.title}
          date={deleting.date}
          onClose={() => setDeletingId(null)}
          onDeleted={() => setDeletingId(null)}
        />
      )}
    </div>
  )
}
