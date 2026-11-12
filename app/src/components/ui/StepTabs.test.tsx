import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Receipt, Users, Wallet } from 'lucide-react'
import StepTabs, { type Step } from './StepTabs'

afterEach(cleanup)

const steps: Step<'people' | 'invoice' | 'settle'>[] = [
  { key: 'people', label: 'Người tham gia', icon: Users },
  { key: 'invoice', label: 'Hoá đơn', icon: Receipt },
  { key: 'settle', label: 'Chia tiền', icon: Wallet },
]

function setup(active: 'people' | 'invoice' | 'settle', onChange = vi.fn()) {
  render(<StepTabs steps={steps} active={active} onChange={onChange} label="Các bước" idBase="meal" />)
  return { onChange }
}

describe('StepTabs', () => {
  it('marks the active step as the selected tab inside a named navigation', () => {
    setup('invoice')
    expect(screen.getByRole('navigation', { name: 'Các bước' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: /Hoá đơn/ }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tab', { name: /Người tham gia/ }).getAttribute('aria-selected')).toBe('false')
  })

  it('moves to a step when its tab is clicked', async () => {
    const { onChange } = setup('people')
    await userEvent.click(screen.getByRole('tab', { name: /Chia tiền/ }))
    expect(onChange).toHaveBeenCalledWith('settle')
  })

  it('disables the previous button on the first step and the next button on the last', async () => {
    const { onChange } = setup('people')
    const prev = screen.getByRole('button', { name: 'Bước trước' }) as HTMLButtonElement
    const next = screen.getByRole('button', { name: 'Bước sau' }) as HTMLButtonElement
    expect(prev.disabled).toBe(true)
    expect(next.disabled).toBe(false)
    await userEvent.click(next)
    expect(onChange).toHaveBeenCalledWith('invoice')
  })

  it('goes to the previous step from the middle', async () => {
    const { onChange } = setup('invoice')
    await userEvent.click(screen.getByRole('button', { name: 'Bước trước' }))
    expect(onChange).toHaveBeenCalledWith('people')
  })

  it('moves between steps with the arrow keys, wrapping at the ends, and moves focus with it', () => {
    const { onChange } = setup('settle')
    const tablist = screen.getByRole('tablist', { name: 'Các bước' })
    fireEvent.keyDown(tablist, { key: 'ArrowRight' })
    expect(onChange).toHaveBeenLastCalledWith('people')
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: /Người tham gia/ }))

    fireEvent.keyDown(tablist, { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenLastCalledWith('invoice')
  })
})
