import { useCallback, useEffect, useRef, useState } from 'react'
import type { InvoiceItem, InvoiceSplitType, Member } from '../../types'
import InvoiceItemRow from './InvoiceItemRow'

interface Props {
  items: InvoiceItem[]
  splitType: InvoiceSplitType
  sessionMembers: Member[]
  readOnly: boolean
  onDelete: (itemId: string) => void
  /** Gọi với thứ tự id mới sau khi một món được chuyển lên/xuống. */
  onReorder: (orderedIds: string[]) => void
  onError: (message: string) => void
}

/** Danh sách món có số thứ tự và hai nút chuyển lên/xuống bên trái mỗi món. */
export default function InvoiceItemList({ items, splitType, sessionMembers, readOnly, onDelete, onReorder, onError }: Props) {
  // Giữ thứ tự mới ngay sau khi bấm cho tới khi DB trả về, tránh món nhảy về chỗ cũ.
  const [pending, setPending] = useState<{ base: InvoiceItem[]; ids: string[] } | null>(null)
  const optimistic = pending && pending.base === items ? pending.ids : null
  const ordered = optimistic ? [...items].sort((a, b) => optimistic.indexOf(a.id) - optimistic.indexOf(b.id)) : items

  // Handler có danh tính cố định (để memo của hàng có tác dụng) nên đọc giá trị mới nhất qua ref.
  const latest = useRef({ items, ordered, onDelete, onReorder, onError })
  useEffect(() => {
    latest.current = { items, ordered, onDelete, onReorder, onError }
  })

  const move = useCallback((id: string, dir: -1 | 1) => {
    const { items: base, ordered: list, onReorder: reorder } = latest.current
    const from = list.findIndex((it) => it.id === id)
    const to = from + dir
    if (from < 0 || to < 0 || to >= list.length) return
    const next = list.map((it) => it.id)
    next.splice(to, 0, ...next.splice(from, 1))
    setPending({ base, ids: next })
    reorder(next)
  }, [])
  const handleDelete = useCallback((id: string) => latest.current.onDelete(id), [])
  const handleError = useCallback((message: string) => latest.current.onError(message), [])

  const canReorder = !readOnly && items.length > 1
  return (
    <ul className="space-y-1.5">
      {ordered.map((item, i) => (
        <InvoiceItemRow
          key={item.id}
          item={item}
          splitType={splitType}
          sessionMembers={sessionMembers}
          readOnly={readOnly}
          canDelete={items.length > 1}
          number={i + 1}
          onMove={canReorder ? move : undefined}
          canMoveUp={i > 0}
          canMoveDown={i < ordered.length - 1}
          onDelete={handleDelete}
          onError={handleError}
        />
      ))}
    </ul>
  )
}
