import { Pencil, Plus, Trash2, UsersRound } from 'lucide-react'
import { countUnassignedItems } from '../../domain/invoiceRules'
import type { InvoiceRow } from '../../hooks/useMealSessions'
import { formatMoney } from '../../lib/money'
import {
  addInvoiceItem,
  deleteInvoiceItem,
  reorderInvoiceItems,
  setAllItemsConsumers,
  setInvoicePayer,
  setInvoiceSplitType,
} from '../../services/invoiceService'
import { PeopleError } from '../../services/peopleErrors'
import type { Member, SessionKeo } from '../../types'
import IconButton from '../ui/IconButton'
import PeoplePicker from '../ui/PeoplePicker'
import Switch from '../ui/Switch'
import EqualSplitPicker from './EqualSplitPicker'
import InvoiceItemList from './InvoiceItemList'
import { t } from '../../i18n'

interface Props {
  row: InvoiceRow
  /** Số thứ tự của hoá đơn trong kèo (hiển thị #n). */
  index: number
  session: SessionKeo
  /** Người đang tham gia kèo — nguồn của người ứng, người chia đều và người ăn. */
  sessionMembers: Member[]
  readOnly: boolean
  onEditInvoice: () => void
  onDeleteInvoice: () => void
  onError: (message: string) => void
}

const errorText = (err: unknown) => (err instanceof PeopleError ? err.message : t('Có lỗi không xác định.'))

/**
 * Thẻ một hoá đơn trong kèo (Tầng 2 + Tầng 3), dạng gọn: tên + tổng + icon; người ứng là chuỗi bấm để đổi;
 * công tắc chia từng món / chia đều; món hiện 3 dòng (tên, SL × giá = tiền, người tham gia).
 */
export default function InvoiceCard({ row, index, session, sessionMembers, readOnly, onEditInvoice, onDeleteInvoice, onError }: Props) {
  const { invoice, items } = row
  const unassigned = countUnassignedItems(invoice.splitType, items)
  const locked = invoice.inputMode === 'TOTAL_ONLY'
  const n = index + 1

  async function run(action: () => Promise<unknown>) {
    try {
      await action()
    } catch (err) {
      onError(errorText(err))
    }
  }

  const title = invoice.vendorName ?? t('Không rõ tên quán')

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-1">
        <p className="min-w-0 flex-1 break-words font-medium">
          #{n} {title}
        </p>
        <span className="money shrink-0 py-2 text-sm font-semibold sm:py-1.5">{formatMoney(invoice.totalAmount)}</span>
        {!readOnly && (
          <>
            <IconButton icon={Pencil} label={t('Sửa hoá đơn #{n}', { n })} onClick={onEditInvoice} />
            <IconButton icon={Trash2} label={t('Xoá hoá đơn #{n}', { n })} tone="danger" onClick={onDeleteInvoice} />
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span>
          <span className="text-usd-green-700">{t('Ứng trước:')}</span>
          <PeoplePicker
            mode="single"
            label={t('Người ứng tiền hoá đơn #{n}', { n })}
            options={sessionMembers}
            value={invoice.payerMemberId}
            readOnly={readOnly}
            onChange={(id) => void run(() => setInvoicePayer(invoice.id, id))}
          />
        </span>
        {!locked && (
          <Switch
            label={t('Chia từng món')}
            checked={invoice.splitType === 'BY_ITEM'}
            disabled={readOnly}
            onChange={(on) => void run(() => setInvoiceSplitType(invoice.id, on ? 'BY_ITEM' : 'EQUAL_TOTAL'))}
          />
        )}
      </div>

      {unassigned > 0 && (
        <div role="status" className="flex items-center justify-between gap-2 rounded bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
          <span>{t('Còn {n} món chưa chọn người ăn', { n: unassigned })}</span>
          {!readOnly && (
            <IconButton
              icon={UsersRound}
              label={t('Gán cả kèo cho các món trống')}
              onClick={() => void run(() => setAllItemsConsumers(invoice.id, session.participantIds, 'UNASSIGNED_ONLY'))}
            />
          )}
        </div>
      )}

      {(invoice.splitType === 'EQUAL_TOTAL' || locked) && (
        <EqualSplitPicker invoice={invoice} sessionMembers={sessionMembers} readOnly={readOnly} onError={onError} />
      )}

      {!locked && (
        <section aria-label={t('Món của hoá đơn #{n}', { n })} className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <h5 className="text-xs font-semibold uppercase tracking-wide text-usd-green-700">{t('Món ({n})', { n: items.length })}</h5>
            {!readOnly && (
              <IconButton
                icon={Plus}
                label={t('Thêm món vào hoá đơn #{n}', { n })}
                tone="outline"
                onClick={() => void run(() => addInvoiceItem(invoice.id, { name: t('Món mới'), quantity: 1, unitPrice: 0 }))}
              />
            )}
          </div>
          <InvoiceItemList
            items={items}
            splitType={invoice.splitType}
            sessionMembers={sessionMembers}
            readOnly={readOnly}
            onDelete={(id) => void run(() => deleteInvoiceItem(id))}
            onReorder={(ids) => void run(() => reorderInvoiceItems(invoice.id, ids))}
            onError={onError}
          />
        </section>
      )}
    </div>
  )
}
