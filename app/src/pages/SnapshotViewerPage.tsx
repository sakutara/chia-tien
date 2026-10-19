import { AlertTriangle, Receipt, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import PaymentSlides from '../components/share/PaymentSlides'
import SnapshotBanner from '../components/share/SnapshotBanner'
import IconButton from '../components/ui/IconButton'
import StepTabs, { type Step } from '../components/ui/StepTabs'
import { buildPaymentSlides, filterSlides, personFilterOptions, slidesFromPayments } from '../domain/paymentSlides'
import { decodeSnapshotPayload, hydrateSnapshotForSettlement } from '../domain/shareSnapshot'
import { computeMealSettlement } from '../domain/settlementEngine'
import { formatMoney } from '../lib/money'
import { useSwipeSteps } from '../hooks/useSwipeSteps'
import { PeopleError } from '../services/peopleErrors'
import { Home } from 'lucide-react'
import type { MealSettlementResult, MealSnapshotPayload } from '../types'

interface Props {
  /** Chuỗi nén lz-string lấy từ `?snapshot=` (có thể rỗng nếu link bị cắt). */
  encoded: string
  onExit: () => void
}

const EMPTY_SETTLEMENT = { entities: [], transfers: [] } as unknown as MealSettlementResult

type Loaded =
  | { ok: true; payload: MealSnapshotPayload; settlement: MealSettlementResult }
  | { ok: false; message: string }

/**
 * Xem Snapshot chỉ đọc (BR-8.2, BR-8.3, R-6). Dữ liệu chỉ nằm trong bộ nhớ; không ghi vào IndexedDB.
 * Chuỗi hỏng hiển thị thông báo thân thiện kèm nút về trang chủ, không làm trắng trang (BR-8.4).
 */
export default function SnapshotViewerPage({ encoded, onExit }: Props) {
  const loaded = useMemo<Loaded>(() => {
    try {
      const payload = decodeSnapshotPayload(encoded)
      // Snapshot mang sẵn khoản chuyển tiền thì không cần tính lại từ hoá đơn.
      const settlement = payload.payments
        ? EMPTY_SETTLEMENT
        : computeMealSettlement(hydrateSnapshotForSettlement(payload))
      return { ok: true, payload, settlement }
    } catch (err) {
      const message = err instanceof PeopleError ? err.message : 'Link Snapshot không hợp lệ.'
      return { ok: false, message }
    }
  }, [encoded])

  if (!loaded.ok) {
    return (
      <div className="space-y-4">
        <div role="alert" className="card space-y-3">
          <p className="inline-flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-5 w-5 text-usd-red-600" aria-hidden="true" />
            {loaded.message}
          </p>
          <p className="text-sm text-usd-green-700">Hãy hỏi lại người gửi để nhận link đầy đủ.</p>
          <IconButton icon={Home} label="Về trang chủ ứng dụng của tôi" tone="primary" onClick={onExit} />
        </div>
      </div>
    )
  }

  return <SnapshotView payload={loaded.payload} settlement={loaded.settlement} onExit={onExit} />
}

/** Số hoá đơn đã chốt của kèo khi bữa lưu trữ (hoá đơn gốc đã bị xoá). */
function archivedInvoiceCount(payload: MealSnapshotPayload, sessionId: string): number {
  return payload.archivedSummary?.sessionsSummary.find((s) => s.sessionId === sessionId)?.invoiceCount ?? 0
}

type StepKey = 'bills' | 'settle'

const STEPS: ReadonlyArray<Step<StepKey>> = [
  { key: 'bills', label: 'Hoá đơn', icon: Receipt },
  { key: 'settle', label: 'Chia tiền', icon: Wallet },
]

/** Xem chỉ đọc: hoá đơn và chia tiền (mặc định mở ô chia tiền để thanh toán ngay). */
function SnapshotView({ payload, settlement, onExit }: { payload: MealSnapshotPayload; settlement: MealSettlementResult; onExit: () => void }) {
  const paymentsOnly = !!payload.payments && payload.sessions.length === 0 && !payload.itemShares
  const [step, setStep] = useState<StepKey>('settle')
  const [selected, setSelected] = useState<string[]>([])
  useSwipeSteps(() => setStep(STEPS[0].key), () => setStep(STEPS[STEPS.length - 1].key))
  const nameById = new Map(payload.members.map((m) => [m.id, m.name] as const))
  const memberName = (id: string) => nameById.get(id) ?? 'Đã rời bữa'
  // Snapshot mới mang sẵn các khoản chuyển của đúng người được chọn; link cũ (không có `payments`) thì tính lại.
  const allSlides = useMemo(
    () =>
      payload.payments
        ? slidesFromPayments(payload.payments)
        : buildPaymentSlides({ settlement, mealTitle: payload.meal.title, people: payload.members }),
    [settlement, payload],
  )
  const options = useMemo(() => personFilterOptions(allSlides), [allSlides])
  const slides = useMemo(() => filterSlides(allSlides, selected), [allSlides, selected])
  const toggle = (id: string) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  return (
    <div className="space-y-2 pb-16">
      <SnapshotBanner title={payload.meal.title} onExit={onExit} />

      {!paymentsOnly && <StepTabs steps={STEPS} active={step} onChange={setStep} label="Các bước của bữa" idBase="snap" />}

      <div role="tabpanel" id="snap-panel" aria-labelledby={`snap-tab-${step}`}>
        {step === 'bills' && payload.itemShares && (
          <section className="space-y-3" aria-label="Các món phải trả">
            {payload.itemShares.map((keo, k) => {
              const owners = new Set(keo.lines.map((l) => l.ownerId))
              const total = keo.lines.reduce((sum, l) => sum + l.amount, 0)
              return (
                <details key={k} className="card" open>
                  <summary className="flex min-h-10 cursor-pointer flex-wrap items-center justify-between gap-2 font-semibold">
                    <span className="break-words">{keo.name}</span>
                    <span className="money">{formatMoney(total)}</span>
                  </summary>
                  <ul className="mt-2 space-y-1 text-sm">
                    {keo.lines.map((l, i) => (
                      <li key={i} className="flex flex-wrap justify-between gap-2 rounded border border-usd-paper-200 px-2 py-1">
                        <span className="break-words">
                          {l.name}
                          {owners.size > 1 && <span className="text-xs text-usd-green-700"> · {allSlides.find((x) => x.fromEntityId === l.ownerId)?.fromName ?? ''}</span>}
                        </span>
                        <span className="money">{formatMoney(l.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )
            })}
          </section>
        )}

        {step === 'bills' && !payload.itemShares && (
          <section className="space-y-3" aria-label="Kèo và hoá đơn">
            {payload.sessions.length === 0 && <p className="card text-sm text-usd-green-700">Bữa này chưa có kèo nào.</p>}
            <ul className="grid gap-3 xl:grid-cols-2">
              {payload.sessions.map((session) => {
                const total = session.archivedTotalAmount ?? session.invoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
                return (
                  <li key={session.id} className="min-w-0">
                    <details className="card">
                      <summary className="flex min-h-10 cursor-pointer flex-wrap items-center justify-between gap-2 font-semibold">
                        <span className="break-words">{session.name}</span>
                        <span className="money">{formatMoney(total)}</span>
                      </summary>
                      <p className="mt-1 text-xs text-usd-green-700">Tham gia: {session.participantIds.map(memberName).join(', ') || '—'}</p>

                      {session.invoices.length === 0 && session.archivedPayerSummary && (
                        <ul className="mt-2 space-y-1 text-sm">
                          <li className="font-semibold">Đã chốt {archivedInvoiceCount(payload, session.id)} hoá đơn</li>
                          {session.archivedPayerSummary.map((p) => (
                            <li key={p.memberId} className="flex justify-between gap-2">
                              <span>Ứng: {memberName(p.memberId)}</span>
                              <span className="money">{formatMoney(p.paidAmount)}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      <ul className="mt-2 space-y-2">
                        {session.invoices.map((inv, index) => (
                          <li key={inv.id} className="space-y-1 rounded-lg border border-usd-paper-200 bg-white/70 p-2 text-sm">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <p className="break-words font-medium">#{index + 1} {inv.vendorName ?? 'Không rõ tên quán'}</p>
                              <p className="money font-semibold">{formatMoney(inv.totalAmount)}</p>
                            </div>
                            <p className="text-usd-green-700">
                              Ứng: {memberName(inv.payerMemberId)} · {inv.splitType === 'BY_ITEM' ? 'Chia từng món' : 'Chia đều theo tổng'}
                              {inv.inputMode === 'TOTAL_ONLY' && ' · Chỉ nhập tổng'}
                            </p>
                            {inv.splitType === 'EQUAL_TOTAL' && (
                              <p>Chia đều: {inv.equalSplitParticipantIds.map(memberName).join(', ')}</p>
                            )}
                            {inv.items.length > 0 && (
                              <ul className="space-y-1">
                                {inv.items.map((it, i) => (
                                  <li key={i} className="rounded border border-usd-paper-200 px-2 py-1">
                                    <div className="flex flex-wrap justify-between gap-2">
                                      <span className="break-words">{it.name} · {it.quantity} × {formatMoney(it.unitPrice)}</span>
                                      <span className="money">{formatMoney(it.finalAmount)}</span>
                                    </div>
                                    {inv.splitType === 'BY_ITEM' && (
                                      <p className="text-xs text-usd-green-700">
                                        Tham gia: {it.consumers.length === 0 ? 'chưa có' : it.consumers.map((c) => (c.shares > 1 ? `${memberName(c.memberId)} ×${c.shares}` : memberName(c.memberId))).join(', ')}
                                      </p>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                            {(inv.discountAmount > 0 || inv.serviceAmount > 0 || inv.vatAmount > 0) && (
                              <p className="money text-xs text-usd-green-700">
                                Tiền hàng {formatMoney(inv.subtotalAmount)}
                                {inv.discountAmount > 0 && ` · Giảm −${formatMoney(inv.discountAmount)}`}
                                {inv.serviceAmount > 0 && ` · Phí +${formatMoney(inv.serviceAmount)}`}
                                {inv.vatAmount > 0 && ` · VAT +${formatMoney(inv.vatAmount)}`}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {step === 'settle' && (
          <section className="space-y-2" aria-label="Chia tiền">
            {options.length > 1 && (
              <div role="group" aria-label="Lọc theo người" className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  type="button"
                  aria-pressed={selected.length === 0}
                  onClick={() => setSelected([])}
                  className={`min-h-8 shrink-0 whitespace-nowrap rounded-full border px-3 text-xs ${selected.length === 0 ? 'border-usd-green-700 bg-usd-green-100 font-semibold' : 'border-usd-paper-200 bg-white'}`}
                >
                  Tất cả
                </button>
                {options.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={selected.includes(o.id)}
                    onClick={() => toggle(o.id)}
                    className={`min-h-8 shrink-0 whitespace-nowrap rounded-full border px-3 text-xs ${selected.includes(o.id) ? 'border-usd-green-700 bg-usd-green-100 font-semibold' : 'border-usd-paper-200 bg-white'}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
            {allSlides.length === 0 ? (
              <p className="text-sm text-usd-green-700">Không có khoản chuyển tiền nào.</p>
            ) : (
              <PaymentSlides key={slides.map((x) => x.key).join('|')} slides={slides} />
            )}
          </section>
        )}
      </div>
    </div>
  )
}
