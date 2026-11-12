import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BankSelect from './BankSelect'
import { BANKS, findBankByBin, searchBanks, type BankInfo } from '../../domain/banks'

afterEach(cleanup)

const vcb = BANKS.find((b) => b.bin === '970436')!

describe('BankSelect', () => {
  it('shows the chosen bank by name and code when it is opened with a value', () => {
    render(<BankSelect id="bank" value="970436" onChange={() => {}} />)
    const input = screen.getByRole('combobox') as HTMLInputElement
    expect(input.value).toBe(`${vcb.name} (${vcb.code})`)
    expect(input.getAttribute('aria-expanded')).toBe('false')
  })

  it('filters the list as the user types, ignoring diacritics', async () => {
    render(<BankSelect id="bank" value="" onChange={() => {}} />)
    const input = screen.getByRole('combobox')
    await userEvent.click(input)

    const list = screen.getByRole('listbox', { name: 'Ngân hàng' })
    expect(within(list).getAllByRole('option')).toHaveLength(BANKS.length)

    await userEvent.type(input, 'vietcom')
    const options = within(list).getAllByRole('option')
    expect(options).toHaveLength(searchBanks('vietcom').length)
    expect(options[0].textContent).toContain('Vietcombank')
  })

  it('shows a hint when nothing matches', async () => {
    render(<BankSelect id="bank" value="" onChange={() => {}} />)
    await userEvent.type(screen.getByRole('combobox'), 'zzzz-khong-co')
    expect(screen.getByText('Không tìm thấy ngân hàng.')).toBeTruthy()
  })

  it('picks a bank when its row is clicked, and reports the whole bank', async () => {
    const onChange = vi.fn()
    render(<BankSelect id="bank" value="" onChange={onChange} />)
    const input = screen.getByRole('combobox')
    await userEvent.click(input)
    await userEvent.click(screen.getByRole('option', { name: /Vietcombank/ }))

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ bin: '970436', name: 'Vietcombank' }))
    expect((input as HTMLInputElement).value).toBe(`${vcb.name} (${vcb.code})`)
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('moves through the list with the arrow keys and picks the highlighted bank with Enter', async () => {
    const onChange = vi.fn<(bank: BankInfo) => void>()
    render(<BankSelect id="bank" value="" onChange={onChange} />)
    const input = screen.getByRole('combobox')
    await userEvent.type(input, 'ACB')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0].bin).toBe(searchBanks('ACB')[0].bin)
    expect(findBankByBin(onChange.mock.calls[0][0].bin)).toBeTruthy()
  })

  it('LỖI: rời ô sau khi gõ dở thì trả chữ về ngân hàng đang chọn', async () => {
    render(<BankSelect id="bank" value="970436" onChange={() => {}} />)
    const input = screen.getByRole('combobox') as HTMLInputElement
    await userEvent.clear(input)
    await userEvent.type(input, 'xyz')
    await userEvent.tab()
    await waitFor(() => expect(input.value).toBe(`${vcb.name} (${vcb.code})`))
  })

  it('closes the list on Escape', async () => {
    render(<BankSelect id="bank" value="" onChange={() => {}} />)
    const input = screen.getByRole('combobox')
    await userEvent.click(input)
    expect(screen.getByRole('listbox')).toBeTruthy()
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()
  })
})
