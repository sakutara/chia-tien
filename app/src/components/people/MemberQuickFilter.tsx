import { useId, useMemo, useState, type KeyboardEvent } from 'react'
import { Check, Crown, Plus } from 'lucide-react'
import { formatMemberName } from '../../db/normalize'
import { decideEnter, filterMembers, findExactMatch } from '../../domain/memberFilter'
import type { Member } from '../../types'

interface Props {
  /** Toàn bộ danh bạ, đã xếp (chủ app ghim đầu). */
  members: Member[]
  participantIds: string[]
  onPick: (member: Member) => void | Promise<void>
  onCreate: (name: string) => void | Promise<void>
  disabled?: boolean
}

type Row =
  | { kind: 'member'; key: string; member: Member }
  | { kind: 'create'; key: string; name: string }

/**
 * Quick Filter chọn người (BR-2.2 → 2.5, R-4 → R-6).
 * Gõ tới đâu lọc tới đó; nếu chưa có người khớp thì hiện "+ Thêm người mới".
 */
export default function MemberQuickFilter({ members, participantIds, onPick, onCreate, disabled }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const listId = useId()

  const name = formatMemberName(query)
  const exact = useMemo(() => findExactMatch(members, name), [members, name])
  const matches = useMemo(() => filterMembers(members, query), [members, query])

  const rows: Row[] = useMemo(() => {
    const list: Row[] = matches.map((m) => ({ kind: 'member', key: m.id, member: m }))
    if (name && !exact) list.push({ kind: 'create', key: '__create__', name })
    return list
  }, [matches, name, exact])

  const activeRow = rows.find((r) => r.key === activeKey)
  const activeMemberId = activeRow?.kind === 'member' ? activeRow.member.id : undefined
  const optionId = (key: string) => `${listId}-${key}`

  function reset() {
    setQuery('')
    setActiveKey(null)
    setMessage(null)
  }

  async function pick(member: Member) {
    if (participantIds.includes(member.id)) {
      setMessage(`${member.name} đã tham gia bữa này.`)
      return
    }
    await onPick(member)
    reset()
  }

  async function create(newName: string) {
    await onCreate(newName)
    reset()
  }

  async function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    // Bộ gõ tiếng Việt (IME): Enter đang chốt ký tự thì không được coi là "thêm người"
    if (e.nativeEvent.isComposing) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (rows.length === 0) return
      const i = rows.findIndex((r) => r.key === activeKey)
      const next = e.key === 'ArrowDown' ? (i + 1) % rows.length : (i <= 0 ? rows.length - 1 : i - 1)
      setActiveKey(rows[next].key)
      setOpen(true)
      return
    }
    if (e.key === 'Escape') {
      setOpen(false)
      setActiveKey(null)
      return
    }
    if (e.key !== 'Enter') return
    e.preventDefault()

    if (activeRow?.kind === 'create') return create(activeRow.name)

    const action = decideEnter({
      query,
      members,
      highlightedId: activeMemberId,
      participantIds,
    })
    if (action.type === 'pick') return pick(action.member)
    if (action.type === 'already') {
      setMessage(`${action.member.name} đã tham gia bữa này.`)
      return
    }
    if (action.type === 'create') return create(action.name)
  }

  return (
    <div className="relative">
      <label htmlFor={`${listId}-input`} className="sr-only">
        Thêm người vào bữa
      </label>
      <input
        id={`${listId}-input`}
        type="text"
        role="combobox"
        aria-expanded={open && rows.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeKey ? optionId(activeKey) : undefined}
        autoComplete="off"
        disabled={disabled}
        value={query}
        placeholder="Thêm người: gõ tên…"
        onChange={(e) => {
          setQuery(e.target.value)
          setActiveKey(null)
          setMessage(null)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKey}
        className="field min-h-10 text-usd-green-950 placeholder:text-usd-green-700/60 disabled:opacity-50"
      />

      {open && rows.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Danh sách người"
          onMouseDown={(e) => e.preventDefault()}
          className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-usd-paper-200 bg-usd-paper-50 py-1 shadow-md"
        >
          {rows.map((row) => {
            const active = row.key === activeKey
            if (row.kind === 'create') {
              return (
                <li
                  key={row.key}
                  id={optionId(row.key)}
                  role="option"
                  aria-selected={active}
                  onClick={() => create(row.name)}
                  className={`flex min-h-11 cursor-pointer items-center gap-2 px-3 py-2 text-sm font-semibold text-usd-green-900 ${active ? 'bg-usd-green-100' : ''}`}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span>Thêm "{row.name}"</span>
                </li>
              )
            }
            const joined = participantIds.includes(row.member.id)
            return (
              <li
                key={row.key}
                id={optionId(row.key)}
                role="option"
                aria-selected={active}
                onClick={() => pick(row.member)}
                className={`flex min-h-11 cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm ${active ? 'bg-usd-green-100' : 'hover:bg-usd-paper-200'}`}
              >
                <span className="flex items-center gap-2">
                  {row.member.isDefaultHost && <Crown className="h-4 w-4 text-usd-gold-600" aria-label="Chủ app" />}
                  <span>{row.member.name}</span>
                </span>
                {joined && (
                  <span className="flex items-center gap-1 text-xs text-usd-green-700">
                    <Check className="h-3.5 w-3.5" aria-label="Đã tham gia" />
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <p role="status" className="min-h-4 text-xs text-usd-green-700">
        {message ?? (name && exact ? `Đã có "${exact.name}". Muốn thêm người khác cùng tên, hãy thêm họ hoặc hậu tố (ví dụ "${exact.name} A").` : '')}
      </p>
    </div>
  )
}
