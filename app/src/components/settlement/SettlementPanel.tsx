import { Check, Lock } from 'lucide-react'
import { useState } from 'react'
import { useMealSettlement } from '../../hooks/useMealSettlement'
import { formatMoney } from '../../lib/money'
import { setSettlementMode, setTransfersPaid, toggleTransferPaid } from '../../services/settlementService'
import { PeopleError } from '../../services/peopleErrors'
import type { Meal, SettlementMode } from '../../types'
import Collapse from '../ui/Collapse'
import Switch from '../ui/Switch'
import EntityGroupList from './EntityGroupList'
import TransferInstructionList from './TransferInstructionList'
import { t } from '../../i18n'

interface Props {
  meal: Meal
  readOnly: boolean
  /** Chỗ để nút Lưu trữ (Epic 7) và Chia sẻ (Epic 8). */
  actionsSlot?: React.ReactNode
}

const errorText = (err: unknown) => (err instanceof PeopleError ? err.message : t('Có lỗi không xác định.'))

/**
 * Bước 4 — quyết toán. Thứ tự: chế độ → danh sách khoản chuyển tiền (mỗi khoản có ô tick) → tiến độ →
 * khối thu gọn "Chi tiết quyết toán" (mặc định đóng) gom theo từng thực thể thanh toán (số dư và giải trình từng người).
 * Tiến độ và các nút hành động (chia sẻ, lưu trữ ở `actionsSlot`) nằm cùng hàng với nút xác nhận chuyển tiền.
 */
export default function SettlementPanel({ meal, readOnly, actionsSlot }: Props) {
  const result = useMealSettlement(meal.id)
  const [error, setError] = useState<string | null>(null)

  if (!result) {
    return (
      <section className="card space-y-2" aria-label={t('Quyết toán')}>
        <p className="text-sm text-usd-green-700">{t('Đang tải…')}</p>
      </section>
    )
  }

  const hasCost = result.totalMealAmount > 0
  const hostName = result.memberBreakdowns.find((m) => m.memberId === meal.hostMemberId)?.memberName ?? t('chủ trì')

  async function run(action: () => Promise<unknown>) {
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(errorText(err))
    }
  }

  function changeMode(mode: SettlementMode) {
    if (mode === result!.settlementMode) return
    void run(() => setSettlementMode(meal.id, mode))
  }

  return (
    <section className="card space-y-3" aria-label={t('Quyết toán')}>
      {readOnly && (
        <Lock className="h-3 w-3 text-usd-green-700" aria-label={t('Chỉ xem')} />
      )}

      {!hasCost ? (
        <p className="text-sm text-usd-green-700">{t('Chưa có chi phí để quyết toán. Hãy thêm hoá đơn ở bước 3.')}</p>
      ) : (
        <>
          <Switch
            label={t('Nhờ chủ trì thu chi ({name})', { name: hostName })}
            checked={result.settlementMode === 'HOST_MEDIATED'}
            disabled={readOnly}
            onChange={(on) => changeMode(on ? 'HOST_MEDIATED' : 'SELF_SETTLEMENT')}
          />

          {result.unassignedItemCount > 0 && (
            <div role="alert" className="rounded-lg border border-amber-600 bg-amber-50 p-2 text-sm text-amber-900">
              {t('Còn')} <strong>{result.unassignedItemCount}</strong> {t('món chưa có người ăn ({amount}) chưa tính cho ai.', { amount: formatMoney(result.unassignedAmount) })}
            </div>
          )}

          <TransferInstructionList
            transfers={result.transfers}
            hasCost={hasCost}
            readOnly={readOnly}
            onToggle={(t) => void run(() => toggleTransferPaid(meal.id, t.key, !t.isPaid))}
            onMarkAll={() => void run(() => setTransfersPaid(meal.id, result.transfers.filter((t) => !t.isPaid).map((t) => t.key), true))}
            progress={
              <span
                role="status"
                aria-label={result.isAllSettled ? t('Đã thanh toán xong toàn bữa') : t('Đã thanh toán {paid}/{total} khoản chuyển tiền', { paid: result.paidTransferCount, total: result.transferCount })}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${result.isAllSettled ? 'bg-usd-green-100 text-usd-green-800' : 'bg-usd-paper-200 text-usd-green-700'}`}
              >
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="money">
                  {result.paidTransferCount}/{result.transferCount}
                </span>
              </span>
            }
            actions={actionsSlot}
          />

          <Collapse title={t('Chi tiết quyết toán')} label={t('Chi tiết quyết toán')}>
            <EntityGroupList entities={result.entities} breakdowns={result.memberBreakdowns} />
          </Collapse>

        </>
      )}

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </section>
  )
}
