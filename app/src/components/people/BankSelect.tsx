import { useId, useMemo, useState } from 'react'
import { BANKS, findBankByBin, searchBanks, type BankInfo } from '../../domain/banks'

interface Props {
  id: string
  /** BIN của ngân hàng đang chọn (rỗng nếu chưa chọn). */
  value: string
  onChange: (bank: BankInfo) => void
}

const label = (b: BankInfo) => `${b.name} (${b.code})`

/** Ô chọn ngân hàng có tìm nhanh: gõ tên/mã (không cần dấu) để lọc danh sách, bấm một dòng để chọn. */
export default function BankSelect({ id, value, onChange }: Props) {
  const selected = findBankByBin(value)
  const [query, setQuery] = useState(selected ? label(selected) : '')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const listId = useId()
  const results = useMemo(() => (selected && query === label(selected) ? [...BANKS] : searchBanks(query)), [query, selected])

  function pick(bank: BankInfo) {
    onChange(bank)
    setQuery(label(bank))
    setOpen(false)
  }

  return (
    <div className="relative">
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder="Gõ để tìm ngân hàng…"
        value={query}
        className="field min-h-10"
        onFocus={(e) => {
          setOpen(true)
          e.currentTarget.select()
        }}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
            setActive((i) => Math.min(i + 1, results.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((i) => Math.max(i - 1, 0))
          } else if (e.key === 'Enter' && open && results[active]) {
            e.preventDefault()
            pick(results[active])
          } else if (e.key === 'Escape' && open) {
            e.stopPropagation()
            setOpen(false)
          }
        }}
      />
      {open && (
        <ul id={listId} role="listbox" aria-label="Ngân hàng" className="absolute z-30 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-usd-paper-200 bg-usd-paper-50 p-1 shadow-lg">
          {results.length === 0 && <li className="px-2 py-2 text-sm text-usd-green-700">Không tìm thấy ngân hàng.</li>}
          {results.map((b, i) => (
            <li
              key={b.bin}
              role="option"
              aria-selected={b.bin === value}
              onMouseDown={(e) => {
                e.preventDefault()
                pick(b)
              }}
              className={`cursor-pointer rounded-md px-2 py-1.5 text-sm ${i === active ? 'bg-usd-green-100' : ''} ${b.bin === value ? 'font-semibold' : ''}`}
            >
              {label(b)}
              <span className="ml-1 text-xs text-usd-green-700">{b.fullName}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
