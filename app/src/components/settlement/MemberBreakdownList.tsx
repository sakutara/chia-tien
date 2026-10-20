import type { MemberBreakdown } from '../../types'
import { formatMoney } from '../../lib/money'
import { t } from '../../i18n'

interface Props {
  /** Từng thành viên, nhóm theo thực thể thanh toán nếu có. */
  breakdowns: MemberBreakdown[]
}

/** Giải trình của một thành viên: đã ứng hoá đơn nào, tiêu dùng từng kèo/hoá đơn/món ra sao. */
export function MemberBreakdownSection({ b }: { b: MemberBreakdown }) {
  return (
    <section aria-label={t('Giải trình của {name}', { name: b.memberName })} className="min-w-0 space-y-2">
      <h4 className="font-semibold">{b.memberName}</h4>

      <div className="space-y-1">
        <p className="text-usd-green-700">{t('Đã ứng ({amount})', { amount: formatMoney(b.totalPaid) })}</p>
        {b.paidInvoices.length === 0 ? (
          <p>{t('Chưa ứng hoá đơn nào.')}</p>
        ) : (
          <ul className="space-y-1">
            {b.paidInvoices.map((p) => (
              <li key={p.invoiceId} className="flex flex-wrap justify-between gap-2">
                <span className="min-w-0 break-words">{p.vendorName ?? t('Không rõ tên quán')} · {p.sessionName}</span>
                <span className="money">{formatMoney(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-usd-green-700">{t('Tiêu dùng ({amount})', { amount: formatMoney(b.totalOwed) })}</p>
        {b.chargeLines.length === 0 ? (
          <p>{t('Không tham gia món hay hoá đơn nào.')}</p>
        ) : (
          <ul className="space-y-1.5">
            {b.chargeLines.map((line, index) => (
              <li key={`${line.invoiceId}-${index}`} className="rounded-lg border border-usd-paper-200 p-2">
                <p className="break-words font-medium">
                  {line.sessionName} · {line.vendorName ?? t('Không rõ tên quán')}
                </p>
                <p className="break-words text-usd-green-700">
                  {line.kind === 'EQUAL_TOTAL'
                    ? t('Chia đều {amount} cho {n} người', { amount: formatMoney(line.sourceAmount), n: line.totalShares })
                    : `${line.itemName} · ${formatMoney(line.sourceAmount)} × ${line.shares}/${line.totalShares} ${t('phần')}`}
                </p>
                <p className="money text-right font-semibold">{formatMoney(line.rawCost)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

/** Giải trình chi tiết cho mọi thành viên (BR-6.2, AC-6). */
export default function MemberBreakdownList({ breakdowns }: Props) {
  if (breakdowns.length === 0) return <p className="text-sm text-usd-green-700">{t('Chưa có dữ liệu giải trình.')}</p>
  return (
    <div className="grid gap-4 text-sm md:grid-cols-2">
      {breakdowns.map((b) => (
        <MemberBreakdownSection key={b.memberId} b={b} />
      ))}
    </div>
  )
}
