import { Plus, Trash2 } from 'lucide-react'
import { ITEM_NAME_MAX } from '../../domain/invoiceRules'
import { formatMoney } from '../../lib/money'
import IconButton from '../ui/IconButton'
import { newItemRow, suggestAmount, type ItemRow } from './formState'

interface Props {
  rows: ItemRow[]
  onChange: (rows: ItemRow[]) => void
}

const INPUT = 'field min-h-10 px-2'

/** Bảng món trong form hoá đơn (BR-4.5, R-10). Đổi số lượng hoặc đơn giá thì thành tiền tự cập nhật. */
export default function InvoiceItemsEditor({ rows, onChange }: Props) {
  function update(key: string, patch: Partial<ItemRow>) {
    onChange(
      rows.map((row) => {
        if (row.key !== key) return row
        // Sửa dòng là người dùng đã xem lại: bỏ cờ cần xem lại.
        const next = { ...row, ...patch, uncertain: false }
        if ('quantity' in patch || 'unitPrice' in patch) {
          next.amount = suggestAmount(next.quantity, next.unitPrice)
        }
        return next
      }),
    )
  }

  return (
    <div className="space-y-2">
      {rows.length === 0 && <p className="text-sm text-usd-green-700">Chưa có món nào. Bấm + để thêm.</p>}

      <ul className="space-y-2">
        {rows.map((row, i) => (
          <li
            key={row.key}
            className={`grid grid-cols-[minmax(0,1fr)_4rem_auto] gap-1.5 rounded-lg border p-2 sm:grid-cols-[minmax(0,2fr)_4rem_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center ${row.uncertain ? 'border-amber-600 bg-amber-50' : 'border-usd-paper-200'}`}
          >
            {row.uncertain && (
              <p className="col-span-full text-xs font-semibold text-amber-800">Cần xem lại: thành tiền không khớp SL × đơn giá trên bill.</p>
            )}
            <input
              aria-label={`Tên món ${i + 1}`}
              placeholder="Tên món"
              value={row.name}
              maxLength={ITEM_NAME_MAX}
              onChange={(e) => update(row.key, { name: e.target.value })}
              className={INPUT}
            />
            <input
              aria-label={`Số lượng ${i + 1}`}
              placeholder="SL"
              inputMode="numeric"
              value={row.quantity}
              onChange={(e) => update(row.key, { quantity: e.target.value })}
              className={INPUT}
            />
            <IconButton
              icon={Trash2}
              label={`Xoá món ${i + 1}`}
              tone="danger"
              className="sm:order-last"
              onClick={() => onChange(rows.filter((r) => r.key !== row.key))}
            />
            <input
              aria-label={`Đơn giá ${i + 1}`}
              placeholder="Đơn giá"
              inputMode="numeric"
              value={row.unitPrice}
              onChange={(e) => update(row.key, { unitPrice: e.target.value })}
              className={INPUT}
            />
            <input
              aria-label={`Thành tiền ${i + 1}`}
              placeholder="Thành tiền"
              inputMode="numeric"
              value={row.amount}
              onChange={(e) => update(row.key, { amount: e.target.value })}
              className={`${INPUT} col-span-2 sm:col-span-1`}
            />
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between gap-2">
        <IconButton icon={Plus} label="Thêm món" tone="outline" onClick={() => onChange([...rows, newItemRow()])} />
        <span className="money text-sm">
          Tổng món: {formatMoney(rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0))}
        </span>
      </div>
    </div>
  )
}
