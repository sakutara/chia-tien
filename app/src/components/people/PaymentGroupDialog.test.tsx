import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PaymentGroupDialog from './PaymentGroupDialog'
import { db } from '../../db/db'
import { ensureDefaultData } from '../../db/seed'
import { initMealPeople } from '../../services/mealPeopleService'
import type { Meal, Member } from '../../types'

afterEach(cleanup)

const base = { createdAt: '2026-01-01', lastUsedAt: '2026-01-01', avatarColor: '#2D6A4F' }

let meal: Meal
let people: Member[]

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
  await ensureDefaultData()
  const init = await initMealPeople()
  const host = (await db.members.get(init.hostMemberId))!
  const binh: Member = { ...base, id: 'binh', name: 'Bình', normalizedName: 'binh' }
  const cuong: Member = { ...base, id: 'cuong', name: 'Cường', normalizedName: 'cuong' }
  const dung: Member = { ...base, id: 'dung', name: 'Dung', normalizedName: 'dung' }
  await db.members.bulkPut([binh, cuong, dung])
  people = [host, binh, cuong, dung]

  meal = {
    id: 'meal-group',
    title: 'Bữa',
    date: '2026-10-19',
    status: 'ACTIVE',
    participantIds: people.map((p) => p.id),
    hostMemberId: host.id,
    settlementMode: 'SELF_SETTLEMENT',
    // Bình và Cường đã là một cặp đôi
    paymentGroups: [{ id: 'g-couple', mealId: 'meal-group', name: 'Cặp đôi', memberIds: ['binh', 'cuong'] }],
    settlementStatuses: {},
    createdAt: '2026-10-19T00:00:00.000Z',
    updatedAt: '2026-10-19T00:00:00.000Z',
  }
  await db.meals.put(meal)
})

describe('PaymentGroupDialog (BR-2.8, BR-2.9)', () => {
  it('hides members already in another group (AC-3)', () => {
    render(<PaymentGroupDialog meal={meal} participants={people} onClose={() => {}} />)
    expect(screen.queryByRole('checkbox', { name: 'Bình' })).toBeNull()
    expect(screen.queryByRole('checkbox', { name: 'Cường' })).toBeNull()
    expect(screen.getByRole('checkbox', { name: 'Dung' })).toBeTruthy()
  })

  it('creates a group of available members and saves it to the meal', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<PaymentGroupDialog meal={meal} participants={people} onClose={onClose} />)
    await user.click(screen.getByRole('checkbox', { name: people[0].name }))
    await user.click(screen.getByRole('checkbox', { name: 'Dung' }))
    await user.click(screen.getByRole('button', { name: 'Tạo nhóm' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    const saved = (await db.meals.get(meal.id))!
    expect(saved.paymentGroups).toHaveLength(2)
    const created = saved.paymentGroups.find((g) => g.id !== 'g-couple')!
    expect(created.memberIds).toEqual([people[0].id, 'dung'])
    expect(created.name).toBe('Tôi + Dung')
  })

  it('requires at least two members before saving', async () => {
    const user = userEvent.setup()
    render(<PaymentGroupDialog meal={meal} participants={people} onClose={() => {}} />)
    await user.click(screen.getByRole('checkbox', { name: 'Dung' }))
    expect((screen.getByRole('button', { name: 'Tạo nhóm' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
