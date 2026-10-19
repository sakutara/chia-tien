import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HostSelector from './HostSelector'
import { db } from '../../db/db'
import { ensureDefaultData } from '../../db/seed'
import { initMealPeople } from '../../services/mealPeopleService'
import type { Meal, Member } from '../../types'

afterEach(cleanup)

const base = { createdAt: '2026-01-01', lastUsedAt: '2026-01-01', avatarColor: '#2D6A4F' }

let meal: Meal
let host: Member
let binh: Member

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
  await ensureDefaultData()
  const init = await initMealPeople()
  host = (await db.members.get(init.hostMemberId))!
  binh = { ...base, id: 'binh', name: 'Bình', normalizedName: 'binh' }
  await db.members.put(binh)
  meal = {
    id: 'meal-host',
    title: 'Bữa',
    date: '2026-10-19',
    status: 'ACTIVE',
    participantIds: [host.id, binh.id],
    hostMemberId: host.id,
    settlementMode: 'SELF_SETTLEMENT',
    paymentGroups: [],
    settlementStatuses: {},
    createdAt: '2026-10-19T00:00:00.000Z',
    updatedAt: '2026-10-19T00:00:00.000Z',
  }
  await db.meals.put(meal)
})

describe('HostSelector (BR-2.6)', () => {
  it('lists only participants in a dropdown and shows the current host', () => {
    render(<HostSelector mealId={meal.id} participants={[host, binh]} hostMemberId={host.id} />)
    const select = screen.getByRole('combobox', { name: 'Người chủ trì' }) as HTMLSelectElement
    expect(select.value).toBe(host.id)
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual([host.name, 'Bình'])
  })

  it('changes the host of this meal when a participant is chosen', async () => {
    const user = userEvent.setup()
    render(<HostSelector mealId={meal.id} participants={[host, binh]} hostMemberId={host.id} />)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Người chủ trì' }), binh.id)
    await waitFor(async () => {
      expect((await db.meals.get(meal.id))!.hostMemberId).toBe(binh.id)
    })
  })

  it('is plain text when the meal is read-only', () => {
    render(<HostSelector mealId={meal.id} participants={[host, binh]} hostMemberId={host.id} readOnly />)
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.getByText(host.name)).toBeTruthy()
  })
})
