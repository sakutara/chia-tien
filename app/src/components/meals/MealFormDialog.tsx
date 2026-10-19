import { useState, type FormEvent } from 'react'
import { MEAL_NOTE_MAX, MEAL_TITLE_MAX, defaultMealTitle, validateMealDraft } from '../../domain/mealRules'
import { MAX_YMD, MIN_YMD, todayLocal } from '../../lib/dates'
import { createMeal, updateMealInfo } from '../../services/mealService'
import { PeopleError } from '../../services/peopleErrors'
import type { Meal } from '../../types'
import DialogActions from '../ui/DialogActions'
import Modal from '../ui/Modal'

interface Props {
  mode: 'create' | 'edit'
  /** Bữa đang sửa (mode = 'edit'). */
  meal?: Meal
  /** Ngày điền sẵn khi tạo (ví dụ ngày đang chọn trên lịch). */
  initialDate?: string
  onClose: () => void
  onSaved: (meal: Meal) => void
}

type FieldErrors = Partial<Record<'title' | 'date' | 'note' | 'form', string>>

const INPUT = 'field min-h-10'

/** Tạo / sửa thông tin bữa (BR-3.1, BR-3.2). Lỗi hiện cạnh từng ô. */
export default function MealFormDialog({ mode, meal, initialDate, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(meal?.title ?? '')
  const [date, setDate] = useState(meal?.date ?? initialDate ?? todayLocal())
  const [note, setNote] = useState(meal?.note ?? '')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErrors({})
    setSaving(true)
    try {
      validateMealDraft({ title, date, note })
      const saved =
        mode === 'edit' && meal ? await updateMealInfo(meal.id, { title, date, note }) : await createMeal({ title, date, note })
      onSaved(saved)
    } catch (err) {
      if (err instanceof PeopleError && err.code === 'INVALID_TITLE') setErrors({ title: err.message })
      else if (err instanceof PeopleError && err.code === 'INVALID_DATE') setErrors({ date: err.message })
      else if (err instanceof PeopleError && err.code === 'INVALID_NOTE') setErrors({ note: err.message })
      else setErrors({ form: err instanceof Error ? err.message : 'Có lỗi không xác định.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open title={mode === 'edit' ? 'Sửa thông tin bữa' : 'Tạo bữa mới'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <div>
          <label htmlFor="meal-title" className="mb-1 block text-sm font-medium">
            Tên bữa
          </label>
          <input
            id="meal-title"
            data-autofocus
            value={title}
            maxLength={MEAL_TITLE_MAX + 20}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={defaultMealTitle(date)}
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? 'meal-title-err' : undefined}
            className={INPUT}
          />
          {errors.title && (
            <p id="meal-title-err" role="alert" className="mt-1 text-sm text-usd-red-600">
              {errors.title}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="meal-date" className="mb-1 block text-sm font-medium">
            Ngày diễn ra
          </label>
          <input
            id="meal-date"
            type="date"
            value={date}
            min={MIN_YMD}
            max={MAX_YMD}
            onChange={(e) => setDate(e.target.value)}
            aria-invalid={!!errors.date}
            aria-describedby={errors.date ? 'meal-date-err' : undefined}
            className={INPUT}
          />
          {errors.date && (
            <p id="meal-date-err" role="alert" className="mt-1 text-sm text-usd-red-600">
              {errors.date}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="meal-note" className="mb-1 block text-sm font-medium">
            Ghi chú
          </label>
          <textarea
            id="meal-note"
            value={note}
            rows={2}
            onChange={(e) => setNote(e.target.value)}
            aria-invalid={!!errors.note}
            aria-describedby={errors.note ? 'meal-note-err' : undefined}
            className={INPUT}
          />
          <p className="mt-1 text-xs text-usd-green-700">
            {note.length}/{MEAL_NOTE_MAX}
          </p>
          {errors.note && (
            <p id="meal-note-err" role="alert" className="text-sm text-usd-red-600">
              {errors.note}
            </p>
          )}
        </div>

        {errors.form && (
          <p role="alert" className="text-sm text-usd-red-600">
            {errors.form}
          </p>
        )}

        <DialogActions onCancel={onClose} saveLabel={mode === 'edit' ? 'Lưu thay đổi' : 'Tạo bữa'} saving={saving} />
      </form>
    </Modal>
  )
}
