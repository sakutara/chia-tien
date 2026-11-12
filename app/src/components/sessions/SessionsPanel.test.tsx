import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '../../db/db'
import { ensureDefaultData } from '../../db/seed'
import { addSession } from '../../services/sessionService'
import { createMeal } from '../../services/mealService'
import type { Member, Meal } from '../../types'
import SessionsPanel from './SessionsPanel'

afterEach(cleanup)

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
  await ensureDefaultData()
})

async function fixture(): Promise<{ meal: Meal; participants: Member[] }> {
  const meal = await createMeal({ title: 'Lẩu cuối tuần', date: '2026-10-19' })
  const participants = (await db.members.bulkGet(meal.participantIds)).filter((m): m is Member => !!m)
  return { meal, participants }
}

describe('SessionsPanel - Bước 3: kèo và hoá đơn (BR-4.1, BR-4.12)', () => {
  it('bữa chưa có kèo nào: đếm 0 và gợi ý bấm + để thêm', async () => {
    const f = await fixture()
    render(<SessionsPanel meal={f.meal} participants={f.participants} />)
    expect(await screen.findByText('Chưa có kèo nào. Bấm + để thêm kèo đầu tiên.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Kèo (0)' })).toBeTruthy()
  })

  it('bấm thêm kèo tạo kèo mới có tên mặc định và đếm lại', async () => {
    const f = await fixture()
    render(<SessionsPanel meal={f.meal} participants={f.participants} />)
    await screen.findByText('Chưa có kèo nào. Bấm + để thêm kèo đầu tiên.')

    await userEvent.click(screen.getByRole('button', { name: 'Thêm kèo' }))
    expect(await screen.findByRole('heading', { name: 'Kèo (1)' })).toBeTruthy()
    expect(screen.getByRole('article', { name: 'Kèo Kèo 1' })).toBeTruthy()
    expect(await db.sessions.where('mealId').equals(f.meal.id).count()).toBe(1)
  })

  it('các kèo hiện theo đúng thứ tự trong bữa', async () => {
    const f = await fixture()
    await addSession(f.meal.id, 'Lẩu bò')
    await addSession(f.meal.id, 'Cà phê')
    render(<SessionsPanel meal={f.meal} participants={f.participants} />)

    const list = await screen.findByRole('list')
    const names = within(list)
      .getAllByRole('article')
      .map((a) => a.getAttribute('aria-label'))
    expect(names).toEqual(['Kèo Lẩu bò', 'Kèo Cà phê'])
    expect(screen.getByRole('heading', { name: 'Kèo (2)' })).toBeTruthy()
  })

  it('bữa đã lưu trữ: không thêm được kèo và báo không có kèo nào', async () => {
    const f = await fixture()
    await db.meals.update(f.meal.id, { status: 'ARCHIVED' })
    const archived = (await db.meals.get(f.meal.id))!
    render(<SessionsPanel meal={archived} participants={f.participants} />)
    expect(await screen.findByText('Bữa này không có kèo nào.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Thêm kèo' })).toBeNull()
  })

  it('bữa đã lưu trữ có kèo: vẫn xem được nhưng không có nút xoá, đưa lên/xuống', async () => {
    const f = await fixture()
    await addSession(f.meal.id, 'Lẩu bò')
    await db.meals.update(f.meal.id, { status: 'ARCHIVED' })
    const archived = (await db.meals.get(f.meal.id))!
    render(<SessionsPanel meal={archived} participants={f.participants} />)
    await screen.findByRole('article', { name: 'Kèo Lẩu bò' })
    expect(screen.queryByRole('button', { name: 'Xoá kèo Lẩu bò' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Đưa Lẩu bò lên' })).toBeNull()
  })
})
