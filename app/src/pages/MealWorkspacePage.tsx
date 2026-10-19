import { ArrowLeft, ClipboardList, Lock, Receipt, Trash2, UsersRound, Wallet, UserRoundPlus } from 'lucide-react'
import { useState } from 'react'
import DeleteMealDialog from '../components/meals/DeleteMealDialog'
import MealInfo from '../components/meals/MealInfo'
import MemberList from '../components/people/MemberList'
import MemberQuickFilter from '../components/people/MemberQuickFilter'
import SessionsPanel from '../components/sessions/SessionsPanel'
import SettlementPanel from '../components/settlement/SettlementPanel'
import ArchiveMealAction from '../components/meals/ArchiveMealAction'
import ShareMealAction from '../components/share/ShareMealAction'
import IconButton from '../components/ui/IconButton'
import StepTabs, { type Step } from '../components/ui/StepTabs'
import { useSwipeSteps } from '../hooks/useSwipeSteps'
import { useMealPeople } from '../hooks/useMealPeople'
import { useMealSummaries } from '../hooks/useMealSummaries'
import { useMembers } from '../hooks/useMembers'
import { formatDateVi } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { addParticipant, createAndAddParticipant } from '../services/mealPeopleService'

interface Props {
  mealId: string
  onBack: () => void
}

type StepKey = 'info' | 'people' | 'bills' | 'settle'

const STEPS: ReadonlyArray<Step<StepKey>> = [
  { key: 'info', label: 'Bữa', icon: ClipboardList },
  { key: 'people', label: 'Người', icon: UsersRound },
  { key: 'bills', label: 'Hoá đơn', icon: Receipt },
  { key: 'settle', label: 'Chia tiền', icon: Wallet },
]

/**
 * Chi tiết bữa (BR-3.9) dạng các bước nằm ngang: 1 Bữa → 2 Người → 3 Hoá đơn → 4 Chia tiền.
 * Trên máy tính, cột phải là tóm tắt luôn hiện để theo dõi tổng chi và tiến độ khi chuyển bước.
 */
export default function MealWorkspacePage({ mealId, onBack }: Props) {
  const view = useMealPeople(mealId)
  const members = useMembers()
  const summaries = useMealSummaries()
  const [step, setStep] = useState<StepKey>('info')
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [deleting, setDeleting] = useState(false)
  useSwipeSteps(
    () => setStep((k) => STEPS[Math.max(0, STEPS.findIndex((s) => s.key === k) - 1)].key),
    () => setStep((k) => STEPS[Math.min(STEPS.length - 1, STEPS.findIndex((s) => s.key === k) + 1)].key),
  )

  if (view === undefined || !members || !summaries) return <p className="text-usd-green-700">Đang tải…</p>

  if (view === null) {
    return (
      <div className="card space-y-3" role="alert">
        <h2 className="text-lg font-semibold">Không tìm thấy bữa này</h2>
        <p className="text-sm text-usd-green-700">Bữa có thể đã bị xoá hoặc đường dẫn không đúng.</p>
        <button type="button" className="btn-primary" onClick={onBack}>
          Về danh sách bữa
        </button>
      </div>
    )
  }

  const { meal, participants, groups } = view
  const archived = meal.status === 'ARCHIVED'
  const summary = summaries.find((s) => s.meal.id === meal.id)

  return (
    <div className="space-y-3 pb-20">
      <div className="flex items-center gap-1">
        <IconButton icon={ArrowLeft} label="Quay lại" onClick={onBack} />
        <h2 className="min-w-0 flex-1 truncate text-lg font-bold" title={meal.title}>
          {meal.title}
        </h2>
        <span className="money hidden text-sm text-usd-green-700 sm:inline">{formatDateVi(meal.date)}</span>
        {archived ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-usd-gold-600 px-2 py-0.5 text-xs font-semibold" title="Đã lưu trữ">
            <Lock className="h-3 w-3 text-usd-gold-600" aria-hidden="true" />
            Đã lưu trữ
          </span>
        ) : (
          <span className="badge-active">Đang hoạt động</span>
        )}
        <IconButton icon={Trash2} label="Xoá bữa" tone="danger" onClick={() => setDeleting(true)} />
      </div>

      <StepTabs steps={STEPS} active={step} onChange={setStep} label="Các bước của bữa" idBase="meal" />

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start lg:gap-4">
        <div role="tabpanel" id="meal-panel" aria-labelledby={`meal-tab-${step}`} className="min-w-0">
          {step === 'info' && (
            <section className="card" aria-label="Thông tin bữa">
              <MealInfo view={view} summary={summary} />
            </section>
          )}

          {step === 'people' && (
            <section className="card space-y-3" aria-label="Thành viên">
              {!archived && (
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <MemberQuickFilter
                      members={members}
                      participantIds={meal.participantIds}
                      onPick={(m) => addParticipant(meal.id, m.id)}
                      onCreate={async (name) => {
                        await createAndAddParticipant(meal.id, name)
                      }}
                    />
                  </div>
                  {participants.length >= 2 && (
                    <IconButton icon={UserRoundPlus} label="Tạo nhóm thanh toán" tone="outline" className="mt-0.5" onClick={() => setCreatingGroup(true)} />
                  )}
                </div>
              )}
              <MemberList
                meal={meal}
                participants={participants}
                groups={groups}
                readOnly={archived}
                creatingGroup={creatingGroup}
                onCloseCreate={() => setCreatingGroup(false)}
              />
              {archived && <p className="text-xs text-usd-green-700">Bữa đã lưu trữ: không sửa được thành viên.</p>}
            </section>
          )}

          {step === 'bills' && <SessionsPanel meal={meal} participants={participants} />}

          {step === 'settle' && (
            <SettlementPanel
              meal={meal}
              readOnly={archived}
              actionsSlot={
                <>
                  <ShareMealAction mealId={meal.id} />
                  <ArchiveMealAction mealId={meal.id} mealTitle={meal.title} readOnly={archived} />
                </>
              }
            />
          )}
        </div>

        <aside aria-label="Tóm tắt bữa" className="card sticky top-3 mt-3 hidden space-y-2 text-sm lg:mt-0 lg:block">
          <p className="font-semibold">{meal.title}</p>
          <p className="money !text-left text-usd-green-700">{formatDateVi(meal.date)}</p>
          <dl className="space-y-1">
            <div className="flex justify-between gap-2">
              <dt className="text-usd-green-700">Người</dt>
              <dd>{participants.length}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-usd-green-700">Kèo</dt>
              <dd>{summary?.sessionCount ?? 0}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-usd-green-700">Tổng chi</dt>
              <dd className="money font-semibold">{summary?.hasCost ? formatMoney(summary.totalAmount) : '—'}</dd>
            </div>
            {summary?.hasCost && (
              <div className="flex justify-between gap-2">
                <dt className="text-usd-green-700">Đã trả</dt>
                <dd>
                  {summary.paidCount}/{summary.entityCount}
                </dd>
              </div>
            )}
          </dl>
        </aside>
      </div>

      {deleting && (
        <DeleteMealDialog mealId={meal.id} title={meal.title} date={meal.date} onClose={() => setDeleting(false)} onDeleted={onBack} />
      )}
    </div>
  )
}
