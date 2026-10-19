import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useMealSessions } from '../../hooks/useMealSessions'
import { sweepOrphanFiles } from '../../services/invoiceFileService'
import { addSession } from '../../services/sessionService'
import { PeopleError } from '../../services/peopleErrors'
import type { Member, Meal } from '../../types'
import IconButton from '../ui/IconButton'
import SessionCard from './SessionCard'

interface Props {
  meal: Meal
  participants: Member[]
}

/** Bước 3 — danh sách kèo & hoá đơn (BR-4.1, BR-4.12). Hai cột trên màn hình rộng. */
export default function SessionsPanel({ meal, participants }: Props) {
  const sessions = useMealSessions(meal.id)
  const [error, setError] = useState<string | null>(null)
  const readOnly = meal.status === 'ARCHIVED'

  // Dọn ảnh còn sót của hoá đơn đã mất (ví dụ tắt tab giữa lúc soạn) khi mở bữa (BR-4.14).
  useEffect(() => {
    void sweepOrphanFiles(meal.id).catch(() => {})
  }, [meal.id])

  async function handleAdd() {
    setError(null)
    try {
      await addSession(meal.id)
    } catch (err) {
      setError(err instanceof PeopleError ? err.message : 'Có lỗi không xác định.')
    }
  }

  return (
    <section className="space-y-3" aria-label="Kèo và hoá đơn">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Kèo ({sessions?.length ?? 0})</h3>
        {!readOnly && <IconButton icon={Plus} label="Thêm kèo" tone="primary" onClick={handleAdd} />}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      {sessions === undefined ? (
        <p className="text-sm text-usd-green-700">Đang tải kèo…</p>
      ) : sessions.length === 0 ? (
        <p className="card text-sm text-usd-green-700">
          {readOnly ? 'Bữa này không có kèo nào.' : 'Chưa có kèo nào. Bấm + để thêm kèo đầu tiên.'}
        </p>
      ) : (
        <ul className="grid gap-3 xl:grid-cols-2">
          {sessions.map((view, i) => (
            <li key={view.session.id} className="min-w-0">
              <SessionCard
                view={view}
                isFirst={i === 0}
                isLast={i === sessions.length - 1}
                mealParticipants={participants}
                hostMemberId={meal.hostMemberId}
                readOnly={readOnly}
                archivedInvoiceCount={meal.archivedSummary?.sessionsSummary.find((x) => x.sessionId === view.session.id)?.invoiceCount}
                onError={setError}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
