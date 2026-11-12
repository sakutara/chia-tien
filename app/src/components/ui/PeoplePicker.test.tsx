import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PeoplePicker from './PeoplePicker'
import { MAX_ITEM_SHARES } from '../../domain/invoiceRules'
import type { Member } from '../../types'

afterEach(cleanup)

const base = { createdAt: '2026-01-01', lastUsedAt: '2026-01-01', avatarColor: '#2D6A4F' }
const an: Member = { ...base, id: 'an', name: 'An', normalizedName: 'an' }
const binh: Member = { ...base, id: 'binh', name: 'Bình', normalizedName: 'binh' }
const cuong: Member = { ...base, id: 'cuong', name: 'Cường', normalizedName: 'cuong' }
const options = [an, binh, cuong]
const LABEL = 'Người tham gia kèo Kèo 1'

describe('PeoplePicker', () => {
  it('shows the chosen names as text, and as plain text when read-only', () => {
    const { rerender } = render(<PeoplePicker label={LABEL} mode="multi" options={options} value={['an', 'cuong']} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: `${LABEL}: An, Cường` })).toBeTruthy()

    rerender(<PeoplePicker label={LABEL} mode="multi" options={options} value={['an', 'cuong']} readOnly onChange={() => {}} />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText('An, Cường')).toBeTruthy()
  })

  it('multi: ticking a person adds them in list order and unticking removes them', async () => {
    const onChange = vi.fn()
    const { rerender } = render(<PeoplePicker label={LABEL} mode="multi" options={options} value={['cuong']} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: `${LABEL}: Cường` }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'An' }))
    expect(onChange).toHaveBeenLastCalledWith(['an', 'cuong'])

    rerender(<PeoplePicker label={LABEL} mode="multi" options={options} value={['an', 'cuong']} onChange={onChange} />)
    await userEvent.click(screen.getByRole('checkbox', { name: 'Cường' }))
    expect(onChange).toHaveBeenLastCalledWith(['an'])
  })

  it('multi: cannot go below the minimum, so the last person cannot be unticked', async () => {
    render(<PeoplePicker label={LABEL} mode="multi" options={options} value={['an']} min={1} onChange={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: `${LABEL}: An` }))
    expect((screen.getByRole('checkbox', { name: 'An' }) as HTMLInputElement).disabled).toBe(true)
  })

  it('multi: "select all" picks everyone and is disabled once everyone is picked', async () => {
    const onChange = vi.fn()
    render(<PeoplePicker label={LABEL} mode="multi" options={options} value={['binh']} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: `${LABEL}: Bình` }))
    await userEvent.click(screen.getByRole('button', { name: `Chọn tất cả: ${LABEL}` }))
    expect(onChange).toHaveBeenCalledWith(['an', 'binh', 'cuong'])
  })

  it('single: choosing a radio returns that person id', async () => {
    const onChange = vi.fn()
    render(<PeoplePicker label={LABEL} mode="single" options={options} value="an" onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: `${LABEL}: An` }))
    const group = screen.getByRole('radiogroup', { name: LABEL })
    expect((within(group).getByRole('radio', { name: 'An' }) as HTMLInputElement).checked).toBe(true)
    await userEvent.click(within(group).getByRole('radio', { name: 'Cường' }))
    expect(onChange).toHaveBeenCalledWith('cuong')
  })

  it('shares: plus and minus change the number of parts', async () => {
    const onChange = vi.fn()
    render(<PeoplePicker label={LABEL} mode="shares" options={options} value={[{ memberId: 'an', shares: 2 }]} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: `${LABEL}: An ×2` }))
    await userEvent.click(screen.getByRole('button', { name: 'Tăng số phần của An' }))
    expect(onChange).toHaveBeenLastCalledWith([{ memberId: 'an', shares: 3 }])

    await userEvent.click(screen.getByRole('button', { name: 'Giảm số phần của An' }))
    expect(onChange).toHaveBeenLastCalledWith([{ memberId: 'an', shares: 1 }])
  })

  it('shares: removing the last part drops the person from the item', async () => {
    const onChange = vi.fn()
    render(<PeoplePicker label={LABEL} mode="shares" options={options} value={[{ memberId: 'an', shares: 1 }]} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: `${LABEL}: An` }))
    await userEvent.click(screen.getByRole('button', { name: 'Bỏ An' }))
    expect(onChange).toHaveBeenLastCalledWith([])
  })

  it('shares: a person at the maximum cannot get more parts', async () => {
    render(<PeoplePicker label={LABEL} mode="shares" options={options} value={[{ memberId: 'an', shares: MAX_ITEM_SHARES }]} onChange={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: `${LABEL}: An ×${MAX_ITEM_SHARES}` }))
    expect((screen.getByRole('button', { name: 'Tăng số phần của An' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('shares: ticking a person gives them one part', async () => {
    const onChange = vi.fn()
    render(<PeoplePicker label={LABEL} mode="shares" options={options} value={[]} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: `${LABEL}: chưa chọn` }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Bình' }))
    expect(onChange).toHaveBeenLastCalledWith([{ memberId: 'binh', shares: 1 }])
  })
})
