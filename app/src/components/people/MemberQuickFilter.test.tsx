import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MemberQuickFilter from './MemberQuickFilter'
import type { Member } from '../../types'

// vitest không bật globals nên RTL không tự dọn DOM giữa các test.
afterEach(cleanup)

const base = { createdAt: '2026-01-01', lastUsedAt: '2026-01-01', avatarColor: '#2D6A4F' }
const host: Member = { ...base, id: 'host', name: 'Chủ app (Tôi)', normalizedName: 'chu app (toi)', isDefaultHost: true }
const binh: Member = { ...base, id: 'b', name: 'Bình', normalizedName: 'binh' }
const cuong: Member = { ...base, id: 'c', name: 'Cường', normalizedName: 'cuong' }
const members = [host, binh, cuong]

function setup(participantIds: string[] = ['host']) {
  const onPick = vi.fn()
  const onCreate = vi.fn()
  render(
    <MemberQuickFilter members={members} participantIds={participantIds} onPick={onPick} onCreate={onCreate} />,
  )
  return { onPick, onCreate, input: screen.getByRole('combobox') }
}

const statusText = () => screen.getByRole('status').textContent ?? ''
const optionNames = () => screen.queryAllByRole('option').map((o) => o.textContent ?? '')

describe('MemberQuickFilter', () => {
  it('filters as you type, with or without diacritics (BR-2.3)', async () => {
    const user = userEvent.setup()
    const { input } = setup()
    await user.type(input, 'binh')
    const list = screen.getByRole('listbox')
    expect(within(list).getByText('Bình')).toBeTruthy()
    expect(within(list).queryByText('Cường')).toBeNull()
  })

  it('creates a new person with Enter when nothing matches (AC-2)', async () => {
    const user = userEvent.setup()
    const { input, onCreate } = setup()
    await user.type(input, 'khánh linh{Enter}')
    expect(onCreate).toHaveBeenCalledWith('Khánh Linh')
  })

  it('ignores Enter that only commits an IME composition (Vietnamese input)', async () => {
    const { input, onCreate } = setup()
    fireEvent.change(input, { target: { value: 'Thảo' } })
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
    expect(onCreate).not.toHaveBeenCalled()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onCreate).toHaveBeenCalledWith('Thảo')
  })

  it('shows the add row and creates on click (AC-2)', async () => {
    const user = userEvent.setup()
    const { input, onCreate } = setup()
    await user.type(input, 'Thuỳ An')
    await user.click(screen.getByRole('option', { name: /Thêm "Thuỳ An"/ }))
    expect(onCreate).toHaveBeenCalledWith('Thuỳ An')
  })

  it('does not offer creation when the exact name already exists (R-5, R-2a)', async () => {
    const user = userEvent.setup()
    const { input } = setup()
    await user.type(input, 'bình')
    expect(optionNames().some((t) => t.startsWith('Thêm "'))).toBe(false)
    expect(statusText()).toContain('Đã có "Bình"')
  })

  it('picks the existing accented person for an unaccented Enter, no duplicate (R-6c)', async () => {
    const user = userEvent.setup()
    const { input, onPick, onCreate } = setup()
    await user.type(input, 'binh{Enter}')
    expect(onPick).toHaveBeenCalledWith(binh)
    expect(onCreate).not.toHaveBeenCalled()
  })

  it('tells the user when the person is already in the meal, without picking', async () => {
    const user = userEvent.setup()
    const { input, onPick } = setup(['host', 'b'])
    await user.type(input, 'Bình{Enter}')
    expect(onPick).not.toHaveBeenCalled()
    expect(statusText()).toContain('Bình đã tham gia bữa này.')
  })

  it('moves through options with arrow keys and picks the highlighted one', async () => {
    const user = userEvent.setup()
    const { input, onPick } = setup()
    // "cu" chỉ khớp Cường (chủ app không chứa "cu"), dòng đầu sau mũi tên là Cường.
    await user.type(input, 'cu')
    await user.keyboard('{ArrowDown}{Enter}')
    expect(onPick).toHaveBeenCalledWith(cuong)
  })

  it('marks people who already joined the meal (BR-2.5)', async () => {
    const user = userEvent.setup()
    const { input } = setup(['host', 'b'])
    await user.type(input, 'b')
    expect(within(screen.getByRole('listbox')).getByLabelText('Đã tham gia')).toBeTruthy()
  })
})
