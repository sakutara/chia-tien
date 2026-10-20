import { Users } from 'lucide-react'
import { formatMoney } from '../../lib/money'
import type { MemberBreakdown, PaymentEntitySettlement } from '../../types'
import Collapse from '../ui/Collapse'
import { MemberBreakdownSection } from './MemberBreakdownList'
import { t } from '../../i18n'

interface Props {
  entities: PaymentEntitySettlement[]
  breakdowns: MemberBreakdown[]
}

/** Số dư ròng ngắn gọn kèm nhãn: "Nhận lại +x", "Phải trả −x" hoặc "Cân bằng". */
function balanceOf(entity: PaymentEntitySettlement) {
  const net = entity.netBalance
  if (net === 0) return { text: t('Cân bằng'), className: 'text-usd-green-700' }
  return net > 0
    ? { text: t('Nhận lại +{amount}', { amount: formatMoney(net) }), className: 'font-semibold text-usd-green-800' }
    : { text: t('Phải trả −{amount}', { amount: formatMoney(-net) }), className: 'font-semibold text-usd-red-600' }
}

/**
 * Chi tiết quyết toán gom theo thực thể thanh toán (người lẻ hoặc nhóm) (BR-6.6): mỗi thực thể một khối thu gọn,
 * tiêu đề có số dư ròng, bên trong là ứng/chi và giải trình của từng thành viên thuộc thực thể đó.
 */
export default function EntityGroupList({ entities, breakdowns }: Props) {
  const byMember = new Map(breakdowns.map((b) => [b.memberId, b] as const))
  return (
    <ul aria-label={t('Thực thể thanh toán')} className="space-y-1.5">
      {entities.map((entity) => {
        const balance = balanceOf(entity)
        return (
          <li key={entity.entityId} aria-label={t('Thực thể {name}', { name: entity.entityName })}>
            <Collapse
              label={t('Chi tiết {name}', { name: entity.entityName })}
              title={
                <span className="flex flex-wrap items-center justify-between gap-x-2">
                  <span className="flex min-w-0 items-center gap-1.5 break-words">
                    {entity.isGroup && <Users className="h-4 w-4 shrink-0 text-usd-green-700" aria-label={t('Nhóm')} />}
                    {entity.entityName}
                  </span>
                  <span className={`money text-xs ${balance.className}`}>{balance.text}</span>
                </span>
              }
            >
              <div className="space-y-3 text-sm">
                <dl className="flex flex-wrap gap-x-4 gap-y-0.5">
                  <div className="flex gap-1.5">
                    <dt className="text-usd-green-700">{t('Ứng')}</dt>
                    <dd className="money">{formatMoney(entity.totalPaid)}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt className="text-usd-green-700">{t('Chi')}</dt>
                    <dd className="money">{formatMoney(entity.totalOwed)}</dd>
                  </div>
                </dl>
                <div className="grid gap-4 md:grid-cols-2">
                  {entity.memberIds.map((id) => {
                    const b = byMember.get(id)
                    return b ? <MemberBreakdownSection key={id} b={b} /> : null
                  })}
                </div>
              </div>
            </Collapse>
          </li>
        )
      })}
    </ul>
  )
}
