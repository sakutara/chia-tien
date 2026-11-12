import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MyProfileDialog from './MyProfileDialog'
import { db } from '../../db/db'
import { ensureDefaultData } from '../../db/seed'
import { initMealPeople } from '../../services/mealPeopleService'
import type { Member } from '../../types'

afterEach(cleanup)

let profile: Member

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
  await ensureDefaultData()
  const init = await initMealPeople()
  profile = (await db.members.get(init.hostMemberId)) as Member
})

describe('MyProfileDialog (BR-3.11)', () => {
  it('shows the current name and bank fields of the profile', () => {
    render(<MyProfileDialog profile={profile} onClose={() => {}} />)
    expect(screen.getByRole('dialog', { name: 'Hồ sơ của tôi' })).toBeTruthy()
    expect((screen.getByLabelText('Tên của tôi') as HTMLInputElement).value).toBe(profile.name)
    expect(screen.getByRole('group', { name: 'Tài khoản ngân hàng' })).toBeTruthy()
  })

  it('saves a new name and closes', async () => {
    const onClose = vi.fn()
    render(<MyProfileDialog profile={profile} onClose={onClose} />)

    const name = screen.getByLabelText('Tên của tôi')
    await userEvent.clear(name)
    await userEvent.type(name, 'Sakura')
    await userEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }))

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect((await db.members.get(profile.id))!.name).toBe('Sakura')
  })

  it('refuses an empty name, shows why, and stays open', async () => {
    const onClose = vi.fn()
    render(<MyProfileDialog profile={profile} onClose={onClose} />)

    await userEvent.clear(screen.getByLabelText('Tên của tôi'))
    await userEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }))

    expect((await screen.findByRole('alert')).textContent).toBe('Tên không được để trống.')
    expect(onClose).not.toHaveBeenCalled()
    expect((await db.members.get(profile.id))!.name).toBe(profile.name)
  })

  it('saves a bank account for receiving transfers', async () => {
    const onClose = vi.fn()
    render(<MyProfileDialog profile={profile} onClose={onClose} />)

    await userEvent.type(screen.getByLabelText('Ngân hàng'), 'vietcom')
    await userEvent.click(screen.getByRole('option', { name: /Vietcombank/ }))
    await userEvent.type(screen.getByLabelText('Tên chủ tài khoản'), 'NGUYEN VAN AN')
    await userEvent.type(screen.getByLabelText('Số tài khoản'), '0123456789')
    await userEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }))

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    const saved = (await db.members.get(profile.id))!
    expect(saved.bank).toMatchObject({ bankBin: '970436', bankName: 'Vietcombank', accountName: 'NGUYEN VAN AN', accountNumber: '0123456789' })
  })

  it('cancels without saving the change', async () => {
    const onClose = vi.fn()
    render(<MyProfileDialog profile={profile} onClose={onClose} />)
    const dialog = screen.getByRole('dialog')

    await userEvent.type(screen.getByLabelText('Tên của tôi'), ' thử')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Huỷ' }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect((await db.members.get(profile.id))!.name).toBe(profile.name)
  })
})
