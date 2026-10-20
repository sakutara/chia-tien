import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { InvoiceRow, SessionView } from '../../hooks/useMealSessions'
import { formatMoney } from '../../lib/money'
import { PeopleError } from '../../services/peopleErrors'
import { deleteInvoice, getInvoiceDeletePreview, type InvoiceDeletePreview } from '../../services/invoiceService'
import { SESSION_NAME_MAX } from '../../domain/sessionRules'
import { deleteSession, getSessionDeletePreview, moveSession, renameSession, setSessionParticipants, type SessionDeletePreview } from '../../services/sessionService'
import type { Member } from '../../types'
import ConfirmDialog from '../ui/ConfirmDialog'
import IconButton from '../ui/IconButton'
import InlineText from '../ui/InlineText'
import PeoplePicker from '../ui/PeoplePicker'
import InvoiceCard from '../invoices/InvoiceCard'
import InvoiceFormDialog from '../invoices/InvoiceFormDialog'
import { t } from '../../i18n'

interface Props {
  view: SessionView
  isFirst: boolean
  isLast: boolean
  /** Người đang có trong bữa, dùng cho hộp chọn người tham gia kèo. */
  mealParticipants: Member[]
  /** Chủ trì của bữa, làm người ứng mặc định khi họ tham gia kèo. */
  hostMemberId: string
  readOnly: boolean
  /** Bữa đã lưu trữ: số hoá đơn đã chốt của kèo (Epic 7, R-6). */
  archivedInvoiceCount?: number
  onError: (message: string) => void
}

type PendingDelete =
  | { kind: 'session'; preview: SessionDeletePreview }
  | { kind: 'invoice'; invoiceId: string; preview: InvoiceDeletePreview }

const errorText = (err: unknown) => (err instanceof PeopleError ? err.message : t('Có lỗi không xác định.'))

/** Một kèo trong Khu vực 2 (UI §4.2): tên, tổng chi, người tham gia, hoá đơn và thao tác. */
export default function SessionCard({ view, isFirst, isLast, mealParticipants, hostMemberId, readOnly, archivedInvoiceCount, onError }: Props) {
  const { session, invoices, total, hasCost, keptItems } = view
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<InvoiceRow | null>(null)
  const [pending, setPending] = useState<PendingDelete | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const memberName = (id: string) => mealParticipants.find((m) => m.id === id)?.name ?? t('Đã rời bữa')
  const sessionMembers = mealParticipants.filter((m) => session.participantIds.includes(m.id))
  const defaultPayerId = session.participantIds.includes(hostMemberId)
    ? hostMemberId
    : (sessionMembers[0]?.id ?? hostMemberId)

  async function move(direction: 'UP' | 'DOWN') {
    try {
      await moveSession(session.id, direction)
    } catch (err) {
      onError(errorText(err))
    }
  }

  async function requestDeleteSession() {
    try {
      setPending({ kind: 'session', preview: await getSessionDeletePreview(session.id) })
    } catch (err) {
      onError(errorText(err))
    }
  }

  async function requestDeleteInvoice(invoiceId: string) {
    try {
      setPending({ kind: 'invoice', invoiceId, preview: await getInvoiceDeletePreview(invoiceId) })
    } catch (err) {
      onError(errorText(err))
    }
  }

  async function confirmDelete() {
    if (!pending) return
    if (pending.kind === 'session') await deleteSession(session.id)
    else await deleteInvoice(pending.invoiceId)
    setPending(null)
  }

  const deleteMessage = pending
    ? pending.kind === 'session'
      ? (
        <>
          {t('Kèo')} <strong>{session.name}</strong> {t('sẽ bị xoá cùng {what}. Không hoàn tác được.', { what: describeSession(pending.preview) })}
        </>
      )
      : (
        <>
          {t('Hoá đơn này sẽ bị xoá{what}. Không hoàn tác được.', { what: describeInvoice(pending.preview) })}
        </>
      )
    : null

  return (
    <article className="space-y-2 rounded-xl border border-usd-paper-200 bg-usd-paper-50 p-3 shadow-sm" aria-label={t('Kèo {name}', { name: session.name })}>
      <div className="flex items-start gap-1">
        <IconButton
          icon={ChevronDown}
          label={open ? t('Thu gọn {name}', { name: session.name }) : t('Mở {name}', { name: session.name })}
          aria-expanded={open}
          className={open ? '' : '-rotate-90'}
          onClick={() => setOpen((v) => !v)}
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">
            <InlineText
              label={t('Tên kèo')}
              value={session.name}
              readOnly={readOnly}
              maxLength={SESSION_NAME_MAX + 20}
              onCommit={(name) => renameSession(session.id, name)}
            />
          </h3>
          <p className="money !text-left text-sm">
            {hasCost ? formatMoney(total) : t('Chưa có chi phí')}
            {!open && invoices.length > 0 && <span className="ml-2 text-xs text-usd-green-700">· {t('{n} hoá đơn', { n: invoices.length })}</span>}
          </p>
        </div>
        {!readOnly && (
          <div className="flex shrink-0">
            <IconButton icon={ArrowUp} label={t('Đưa {name} lên', { name: session.name })} onClick={() => move('UP')} disabled={isFirst} />
            <IconButton icon={ArrowDown} label={t('Đưa {name} xuống', { name: session.name })} onClick={() => move('DOWN')} disabled={isLast} />
            <IconButton icon={Trash2} label={t('Xoá kèo {name}', { name: session.name })} tone="danger" onClick={requestDeleteSession} />
          </div>
        )}
      </div>

      {open && (
        <div className="space-y-2">
      <div className="text-sm">
        <span className="text-usd-green-700">Tham gia: </span>
        <PeoplePicker
          mode="multi"
          label={t('Người tham gia {name}', { name: session.name })}
          options={mealParticipants}
          value={session.participantIds}
          readOnly={readOnly}
          onChange={(ids) => void setSessionParticipants(session.id, ids).catch((err) => onError(errorText(err)))}
        />
      </div>

      {notice && <p role="status" className="text-sm text-usd-green-700">{notice}</p>}

      {readOnly && session.archivedTotalAmount !== undefined ? (
        <section aria-label={t('Tóm tắt đã chốt của {name}', { name: session.name })} className="space-y-1 text-sm">
          <h4 className="font-semibold">{t('Đã chốt {n} hoá đơn', { n: archivedInvoiceCount ?? 0 })}</h4>
          {(session.archivedPayerSummary ?? []).length === 0 ? (
            <p className="text-usd-green-700">{t('Không có người ứng tiền trong kèo này.')}</p>
          ) : (
            <ul className="space-y-1">
              {(session.archivedPayerSummary ?? []).map((p) => (
                <li key={p.memberId} className="flex flex-wrap justify-between gap-2">
                  <span>{t('Ứng:')} {memberName(p.memberId)}</span>
                  <span className="money">{formatMoney(p.paidAmount)}</span>
                </li>
              ))}
            </ul>
          )}
          {keptItems.length > 0 && (
            <>
              <h4 className="pt-1 font-semibold">{t('Món ({n})', { n: keptItems.length })}</h4>
              <ul className="space-y-1" aria-label={t('Món của {name}', { name: session.name })}>
                {keptItems.map((it) => (
                  <li key={it.id} className="flex flex-wrap justify-between gap-2">
                    <span className="min-w-0 break-words">{it.name} · {it.quantity} × {formatMoney(it.unitPrice)}</span>
                    <span className="money">{formatMoney(it.finalAmount)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      ) : (
        <section aria-label={t('Hoá đơn của {name}', { name: session.name })} className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold">{t('Hoá đơn ({n})', { n: invoices.length })}</h4>
            {!readOnly && (
              <IconButton icon={Plus} label={t('Thêm hoá đơn')} tone="outline" onClick={() => setAdding(true)} disabled={sessionMembers.length === 0} />
            )}
          </div>

          {invoices.length === 0 ? (
            <p className="text-sm text-usd-green-700">{t('Chưa có hoá đơn trong kèo này.')}</p>
          ) : (
            <ul className="space-y-2">
              {invoices.map((row, i) => (
                <li key={row.invoice.id} className="rounded-lg border border-usd-paper-200 bg-white/60 p-2 text-sm">
                  <InvoiceCard
                    row={row}
                    index={i}
                    session={session}
                    sessionMembers={sessionMembers}
                    readOnly={readOnly}
                    onEditInvoice={() => setEditing(row)}
                    onDeleteInvoice={() => requestDeleteInvoice(row.invoice.id)}
                    onError={onError}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

        </div>
      )}

      {(adding || editing) && (
        <InvoiceFormDialog
          session={session}
          participants={mealParticipants}
          defaultPayerId={defaultPayerId}
          existing={editing ?? undefined}
          onClose={() => {
            setAdding(false)
            setEditing(null)
          }}
          onSaved={(result) => {
            setAdding(false)
            setEditing(null)
            setNotice(result.renamedSessionTo ? t('Đã đổi tên kèo thành "{renamedSessionTo}".', { renamedSessionTo: result.renamedSessionTo }) : null)
          }}
        />
      )}
      <ConfirmDialog
        open={pending !== null}
        title={pending?.kind === 'session' ? t('Xoá kèo?') : t('Xoá hoá đơn?')}
        message={deleteMessage}
        confirmLabel={pending?.kind === 'session' ? t('Xoá kèo') : t('Xoá hoá đơn')}
        tone="danger"
        onConfirm={confirmDelete}
        onCancel={() => setPending(null)}
      />
    </article>
  )
}

function describeSession(preview: SessionDeletePreview): string {
  const parts = [
    preview.invoices > 0 && t('{invoices} hoá đơn', { invoices: preview.invoices }),
    preview.items > 0 && t('{items} món', { items: preview.items }),
    preview.files > 0 && t('{files} file ảnh', { files: preview.files }),
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : t('toàn bộ dữ liệu của kèo')
}

/** " cùng 3 món và 2 file ảnh" hoặc chuỗi rỗng khi hoá đơn không có gì đi kèm (ví dụ chỉ nhập tổng). */
function describeInvoice(preview: InvoiceDeletePreview): string {
  const parts = [
    preview.items > 0 && t('{items} món', { items: preview.items }),
    preview.files > 0 && t('{files} file ảnh', { files: preview.files }),
  ].filter(Boolean)
  return parts.length > 0 ? t(' cùng {v}', { v: parts.join(t(' và ')) }) : ''
}
