import { ArrowRight, Check, CheckCheck } from 'lucide-react'
import { formatMoney } from '../../lib/money'
import type { SettlementMode, SettlementTransfer } from '../../types'
import IconButton from '../ui/IconButton'
import { t } from '../../i18n'

interface Props {
  transfers: SettlementTransfer[]
  settlementMode?: SettlementMode
  hasCost: boolean
  readOnly?: boolean
  /** Tick hoặc bỏ tick một khoản chuyển. */
  onToggle?: (transfer: SettlementTransfer) => void
  /** Tick tất cả các khoản chưa xong. */
  onMarkAll?: () => void
  /** Nhóm nút hành động đặt cạnh nút xác nhận chuyển tiền (chia sẻ, lưu trữ). */
  actions?: React.ReactNode
  /** Tiến độ thanh toán, đặt cạnh tiêu đề. */
  progress?: React.ReactNode
}

/**
 * Hướng dẫn chuyển tiền: ai chuyển cho ai bao nhiêu (BR-6.4, BR-6.5). Mỗi khoản có ô tick "Đã chuyển";
 * tiến độ thanh toán đếm theo số khoản này.
 */
export default function TransferInstructionList({ transfers, hasCost, readOnly, onToggle, onMarkAll, actions, progress }: Props) {
  if (!hasCost) return null

  return (
    <div className="space-y-1.5" aria-label={t('Hướng dẫn chuyển tiền')}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          {t('Chuyển tiền')}
          {progress}
        </h3>
        <div className="flex items-center gap-1">
          {!readOnly && onMarkAll && transfers.some((tr) => !tr.isPaid) && (
            <IconButton icon={CheckCheck} label={t('Đánh dấu tất cả đã chuyển')} tone="outline" onClick={onMarkAll} />
          )}
          {actions}
        </div>
      </div>
      {transfers.length === 0 ? (
        <p className="text-sm text-usd-green-700">{t('Không cần chuyển tiền.')}</p>
      ) : (
        <ul className="grid gap-1.5 md:grid-cols-2">
          {transfers.map((tr) => (
            <li
              key={tr.key}
              className={`flex min-w-0 items-center gap-1.5 rounded-lg border px-1.5 py-1 text-xs ${
                tr.isPaid ? 'border-usd-green-700 bg-usd-green-100/60' : 'border-usd-paper-200 bg-white/70'
              }`}
            >
              <button
                type="button"
                aria-pressed={tr.isPaid}
                aria-label={t('Đã chuyển: {from} cho {to}', { from: tr.fromEntityName, to: tr.toEntityName })}
                disabled={readOnly || !onToggle}
                onClick={() => onToggle?.(tr)}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${
                  tr.isPaid ? 'border-usd-green-800 bg-usd-green-800 text-usd-paper-50' : 'border-usd-paper-200 bg-white'
                } disabled:opacity-70`}
              >
                <Check className={`h-4 w-4 ${tr.isPaid ? '' : 'opacity-0'}`} aria-hidden="true" />
              </button>
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-1">
                  <strong className="min-w-0 truncate">{tr.fromEntityName}</strong>
                  <ArrowRight className="h-3 w-3 shrink-0 text-usd-green-700" aria-label={t('chuyển cho')} />
                  <strong className="min-w-0 truncate">{tr.toEntityName}</strong>
                </span>
                <span className="money block text-sm font-semibold">{formatMoney(tr.amount)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
