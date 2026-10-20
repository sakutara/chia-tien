import { Check, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ITEM_NAME_MAX, countUnassignedItems } from '../../domain/invoiceRules'
import { formatMoney, parseMoney } from '../../lib/money'
import { setItemConsumers, updateInvoiceItem } from '../../services/invoiceService'
import { PeopleError } from '../../services/peopleErrors'
import type { Member, InvoiceItem, InvoiceSplitType } from '../../types'
import ConfirmDialog from '../ui/ConfirmDialog'
import IconButton from '../ui/IconButton'
import InlineText from '../ui/InlineText'
import PeoplePicker from '../ui/PeoplePicker'
import Popover from '../ui/Popover'
import { t } from '../../i18n'

interface Props {
  item: InvoiceItem
  splitType: InvoiceSplitType
  /** Người đang tham gia kèo — nguồn của danh sách chọn người ăn. */
  sessionMembers: Member[]
  readOnly: boolean
  canDelete: boolean
  /** Gọi sau khi người dùng xác nhận (nếu món đã có người ăn). */
  onDelete: () => void
  onError: (message: string) => void
}

const errorText = (err: unknown) => (err instanceof PeopleError ? err.message : t('Có lỗi không xác định.'))

/**
 * Một món rút gọn thành 3 dòng (Tầng 3):
 * tên (bấm để đổi) / SL × đơn giá = thành tiền (bấm để đổi SL, đơn giá; thành tiền tự tính) / tham gia (bấm để thêm bớt).
 */
export default function InvoiceItemRow({ item, splitType, sessionMembers, readOnly, canDelete, onDelete, onError }: Props) {
  const [confirming, setConfirming] = useState(false)
  const consumers = item.consumers
  const showConsumers = splitType === 'BY_ITEM'
  const unassigned = countUnassignedItems(splitType, [item]) > 0

  async function rename(name: string) {
    // Giữ nguyên thành tiền đã có (ví dụ số đã đối chiếu từ bill) khi chỉ đổi tên.
    await updateInvoiceItem(item.id, { name, quantity: item.quantity, unitPrice: item.unitPrice, rawAmount: item.rawAmount })
  }

  function requestDelete() {
    if (consumers.length > 0) setConfirming(true)
    else onDelete()
  }

  return (
    <li className="space-y-0.5 rounded-lg border border-usd-paper-200 bg-white/70 px-2 py-1.5 text-sm" aria-label={t('Món {name}', { name: item.name })}>
      <div className="flex items-start gap-1">
        <p className="min-w-0 flex-1 break-words font-medium">
          <InlineText label={t('Tên món')} value={item.name} readOnly={readOnly} maxLength={ITEM_NAME_MAX} onCommit={rename} />
        </p>
        {!readOnly && (
          <IconButton
            icon={Trash2}
            label={t('Xoá món {name}', { name: item.name })}
            tone="danger"
            className="-my-1.5"
            onClick={requestDelete}
            disabled={!canDelete}
            title={canDelete ? t('Xoá món {name}', { name: item.name }) : t('Hoá đơn phải có ít nhất một món')}
          />
        )}
      </div>

      <div className="text-usd-green-900">
        <AmountLine item={item} readOnly={readOnly} onError={onError} />
      </div>

      {showConsumers && (
        <div className={unassigned ? 'text-amber-800' : ''}>
          <span className="text-usd-green-700">Tham gia: </span>
          <PeoplePicker
            mode="shares"
            label={t('Người ăn {name}', { name: item.name })}
            options={sessionMembers}
            value={consumers}
            readOnly={readOnly}
            empty={t('Chưa chọn người')}
            onChange={(next) => void setItemConsumers(item.id, next).catch((err) => onError(errorText(err)))}
          />
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        title={t('Xoá món đã có người ăn?')}
        message={<>{t('Món')} <strong>{item.name}</strong> {t('đang có {n} người ăn. Các phần đã chọn sẽ mất.', { n: consumers.length })}</>}
        confirmLabel={t('Xoá món')}
        tone="danger"
        onConfirm={() => {
          setConfirming(false)
          onDelete()
        }}
        onCancel={() => setConfirming(false)}
      />
    </li>
  )
}

/** "2 × 150.000 ₫ = 300.000 ₫": bấm để sửa số lượng và đơn giá, thành tiền tự tính. */
function AmountLine({ item, readOnly, onError }: { item: InvoiceItem; readOnly: boolean; onError: (m: string) => void }) {
  const adjustment = item.finalAmount - item.rawAmount
  const text = `${item.quantity} × ${formatMoney(item.unitPrice)} = ${formatMoney(item.rawAmount)}`
  const extra = adjustment !== 0 && (
    <span className="ml-1 text-xs text-usd-green-700">
      ({adjustment > 0 ? '+' : '−'}
      {t('{amount} phân bổ)', { amount: formatMoney(Math.abs(adjustment)) })}
    </span>
  )

  if (readOnly) {
    return (
      <span className="money !text-left">
        {text}
        {extra}
      </span>
    )
  }
  return (
    <>
      <Popover label={t('Số lượng và đơn giá {name}', { name: item.name })} summary={text} trigger={<span className="money">{text}</span>}>
        {(close) => <AmountForm item={item} onDone={close} onError={onError} />}
      </Popover>
      {extra}
    </>
  )
}

function AmountForm({ item, onDone, onError }: { item: InvoiceItem; onDone: () => void; onError: (m: string) => void }) {
  const [qty, setQty] = useState(String(item.quantity))
  const [price, setPrice] = useState(String(item.unitPrice))
  const q = Number(qty.trim())
  const p = parseMoney(price)
  const valid = Number.isInteger(q) && q >= 1 && p !== null
  const total = valid ? q * p : null

  async function save() {
    if (!valid) return
    try {
      // Thành tiền bỏ trống để hệ thống tự tính lại theo SL × đơn giá.
      await updateInvoiceItem(item.id, { name: item.name, quantity: q, unitPrice: p })
      onDone()
    } catch (err) {
      onError(errorText(err))
    }
  }

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      <div className="grid grid-cols-[4rem_1fr] gap-2">
        <label className="text-xs">
          SL
          <input data-autofocus inputMode="numeric" aria-label={t('Số lượng')} value={qty} onChange={(e) => setQty(e.target.value)} className="field mt-0.5" />
        </label>
        <label className="text-xs">
          {t('Đơn giá')}
          <input inputMode="numeric" aria-label={t('Đơn giá')} value={price} onChange={(e) => setPrice(e.target.value)} className="field mt-0.5" />
        </label>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="money text-sm font-semibold" aria-live="polite">
          = {total === null ? '—' : formatMoney(total)}
        </span>
        <IconButton icon={Check} label={t('Lưu số lượng và đơn giá')} tone="primary" type="submit" disabled={!valid} />
      </div>
    </form>
  )
}
