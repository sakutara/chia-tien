import { useRef, useState } from 'react'
import type { InvoiceItem, InvoiceSplitType, Member } from '../../types'
import InvoiceItemRow from './InvoiceItemRow'

interface Props {
  items: InvoiceItem[]
  splitType: InvoiceSplitType
  sessionMembers: Member[]
  readOnly: boolean
  onDelete: (itemId: string) => void
  /** Gọi khi thả xong với thứ tự id mới (chỉ khi vị trí thật sự đổi). */
  onReorder: (orderedIds: string[]) => void
  onError: (message: string) => void
}

interface Drag {
  id: string
  /** Vị trí (trong danh sách đã bỏ món đang kéo) mà ô trống đang nằm. */
  slot: number
  top: number
  left: number
  width: number
  height: number
  /** Khoảng cách từ con trỏ tới mép trên của món lúc bắt đầu kéo. */
  grabY: number
  pointerY: number
}

/** Danh sách món có số thứ tự và kéo thả (tay nắm bên trái): món đang kéo nổi theo con trỏ, ô trống đứt nét báo chỗ sẽ thả. */
export default function InvoiceItemList({ items, splitType, sessionMembers, readOnly, onDelete, onReorder, onError }: Props) {
  const [drag, setDrag] = useState<Drag | null>(null)
  // Giữ thứ tự mới ngay sau khi thả cho tới khi DB trả về, tránh món nhảy về chỗ cũ.
  const [pending, setPending] = useState<{ base: InvoiceItem[]; ids: string[] } | null>(null)
  const refs = useRef(new Map<string, HTMLLIElement>())

  // Chỉ dùng thứ tự tạm khi `items` chưa đổi kể từ lúc thả.
  const optimistic = pending && pending.base === items ? pending.ids : null
  const setOptimistic = (ids: string[]) => setPending({ base: items, ids })

  const ordered = optimistic
    ? [...items].sort((a, b) => optimistic.indexOf(a.id) - optimistic.indexOf(b.id))
    : items
  const rest = drag ? ordered.filter((it) => it.id !== drag.id) : ordered

  function slotAt(y: number, skipId: string): number {
    let slot = 0
    for (const it of ordered) {
      if (it.id === skipId) continue
      const rect = refs.current.get(it.id)?.getBoundingClientRect()
      if (rect && y > rect.top + rect.height / 2) slot++
    }
    return slot
  }

  function start(e: React.PointerEvent<HTMLButtonElement>, item: InvoiceItem) {
    const el = refs.current.get(item.id)
    if (!el || e.button > 0) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const rect = el.getBoundingClientRect()
    setDrag({
      id: item.id,
      slot: ordered.findIndex((it) => it.id === item.id),
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      grabY: e.clientY - rect.top,
      pointerY: e.clientY,
    })
  }

  function move(e: React.PointerEvent<HTMLButtonElement>) {
    if (!drag) return
    const center = e.clientY - drag.grabY + drag.height / 2
    setDrag({ ...drag, pointerY: e.clientY, slot: slotAt(center, drag.id) })
  }

  function end(e: React.PointerEvent<HTMLButtonElement>, commit: boolean) {
    if (!drag) return
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    const next = rest.map((it) => it.id)
    next.splice(drag.slot, 0, drag.id)
    const changed = next.some((id, i) => id !== ordered[i].id)
    setDrag(null)
    if (commit && changed) {
      setOptimistic(next)
      onReorder(next)
    }
  }

  function keyMove(e: React.KeyboardEvent, index: number) {
    const to = e.key === 'ArrowUp' ? index - 1 : e.key === 'ArrowDown' ? index + 1 : -1
    if (to < 0 || to >= ordered.length) return
    e.preventDefault()
    const next = ordered.map((it) => it.id)
    next.splice(to, 0, ...next.splice(index, 1))
    setOptimistic(next)
    onReorder(next)
  }

  const renderRow = (item: InvoiceItem, number: number, floating: boolean) => (
    <InvoiceItemRow
      key={item.id}
      item={item}
      splitType={splitType}
      sessionMembers={sessionMembers}
      readOnly={readOnly}
      canDelete={items.length > 1}
      number={number}
      dragging={floating}
      style={floating && drag ? { position: 'fixed', top: drag.pointerY - drag.grabY, left: drag.left, width: drag.width, pointerEvents: 'none' } : undefined}
      liRef={(el) => {
        if (el) refs.current.set(item.id, el)
        else refs.current.delete(item.id)
      }}
      dragHandleProps={
        readOnly || items.length < 2
          ? undefined
          : {
              onPointerDown: (e) => start(e, item),
              onPointerMove: move,
              onPointerUp: (e) => end(e, true),
              onPointerCancel: (e) => end(e, false),
              onKeyDown: (e) => keyMove(e, ordered.findIndex((it) => it.id === item.id)),
            }
      }
      onDelete={() => onDelete(item.id)}
      onError={onError}
    />
  )

  // Món đang kéo vẫn nằm nguyên trong DOM (chỉ đổi sang position: fixed) để không mất pointer capture;
  // ô trống chèn vào đúng chỗ sẽ thả.
  const rows: React.ReactNode[] = []
  let seen = 0
  ordered.forEach((item) => {
    if (drag && item.id === drag.id) {
      rows.push(renderRow(item, drag.slot + 1, true))
      return
    }
    if (drag && seen === drag.slot) rows.push(<DropPlaceholder key="drop-placeholder" height={drag.height} />)
    rows.push(renderRow(item, seen + (drag && seen >= drag.slot ? 2 : 1), false))
    seen++
  })
  if (drag && drag.slot >= seen) rows.push(<DropPlaceholder key="drop-placeholder" height={drag.height} />)

  return <ul className="space-y-1.5">{rows}</ul>
}

function DropPlaceholder({ height }: { height: number }) {
  return (
    <li
      aria-hidden="true"
      data-testid="drop-placeholder"
      style={{ height }}
      className="rounded-lg border-2 border-dashed border-usd-green-700 bg-usd-paper-100/60"
    />
  )
}
