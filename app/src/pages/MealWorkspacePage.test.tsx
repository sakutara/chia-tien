import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MealWorkspacePage from './MealWorkspacePage'
import MyProfileDialog from '../components/profile/MyProfileDialog'
import { db } from '../db/db'
import { ensureDefaultData } from '../db/seed'
import { createGroup } from '../services/mealPeopleService'
import { createMeal } from '../services/mealService'
import type { Meal } from '../types'

afterEach(cleanup)

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
  await ensureDefaultData()
})

const step = (name: RegExp) => userEvent.click(screen.getByRole('tab', { name }))

describe('MealWorkspacePage (BR-3.9, AC-9, AC-10)', () => {
  it('shows 4 horizontal steps; step 1 holds the inline-editable meal info', async () => {
    const meal = await createMeal({ title: 'Lẩu bò', date: '2026-10-19', note: 'mang ô' })
    render(<MealWorkspacePage mealId={meal.id} onBack={() => {}} />)

    const tabs = await screen.findAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual(['1. Bữa', '2. Người', '3. Hoá đơn', '4. Chia tiền'])
    expect(tabs[0].getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('heading', { name: 'Lẩu bò' })).toBeTruthy()
    expect(screen.getByText('19/10/2026', { selector: 'button' })).toBeTruthy()
    expect(screen.getByText('mang ô')).toBeTruthy()
    expect(screen.getByText('Đang hoạt động')).toBeTruthy()
    expect(screen.getAllByText('Chưa có chi phí').length).toBeGreaterThan(0)
    // chủ trì là dropdown ngay trên thông tin bữa, không còn nút "Sửa thông tin"
    expect(screen.getByRole('combobox', { name: 'Người chủ trì' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Sửa thông tin' })).toBeNull()
  })

  it('moves between steps with the tabs and the next/previous icons', async () => {
    const meal = await createMeal({ title: 'Bữa', date: '2026-10-19' })
    render(<MealWorkspacePage mealId={meal.id} onBack={() => {}} />)
    await screen.findAllByRole('tab')

    await step(/Người/)
    expect(screen.getByRole('combobox')).toBeTruthy() // Quick Filter
    await userEvent.click(screen.getByRole('button', { name: 'Bước sau' }))
    expect(screen.getByRole('tab', { name: /Hoá đơn/ }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('button', { name: 'Thêm kèo' })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Bước sau' }))
    expect(screen.getByRole('tab', { name: /Chia tiền/ }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('button', { name: 'Bước sau' }).hasAttribute('disabled')).toBe(true)
    await userEvent.click(screen.getByRole('button', { name: 'Bước trước' }))
    expect(screen.getByRole('tab', { name: /Hoá đơn/ }).getAttribute('aria-selected')).toBe('true')
  })

  it('adds people with the Quick Filter inside a real meal (AC-10)', async () => {
    const meal = await createMeal({ title: 'Bữa', date: '2026-10-19' })
    render(<MealWorkspacePage mealId={meal.id} onBack={() => {}} />)
    await screen.findAllByRole('tab')
    await step(/Người/)
    await userEvent.type(screen.getByRole('combobox'), 'bình{Enter}')
    await waitFor(async () => expect((await db.meals.get(meal.id))!.participantIds).toHaveLength(2))
    await waitFor(() => expect(screen.getByRole('list', { name: 'Người tham gia' }).textContent).toContain('Bình'))
  })

  it('edits title, date, note and host in place (AC-5)', async () => {
    const meal = await createMeal({ title: 'Cũ', date: '2026-10-19' })
    render(<MealWorkspacePage mealId={meal.id} onBack={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Cũ', hidden: false }))
    const title = screen.getByRole('textbox', { name: 'Tên bữa' })
    await userEvent.clear(title)
    await userEvent.type(title, 'Mới{Enter}')
    await screen.findByRole('heading', { name: 'Mới' })

    await userEvent.click(screen.getByRole('button', { name: 'Thêm ghi chú' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Ghi chú' }), 'ghi chú mới{Enter}')
    await waitFor(async () => expect(await db.meals.get(meal.id)).toMatchObject({ title: 'Mới', note: 'ghi chú mới' }))
  })

  it('shows a validation error next to the field when the new title is invalid', async () => {
    const meal = await createMeal({ title: 'Bữa', date: '2026-10-19' })
    render(<MealWorkspacePage mealId={meal.id} onBack={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Bữa' }))
    const title = screen.getByRole('textbox', { name: 'Tên bữa' })
    await userEvent.clear(title)
    await userEvent.type(title, 'x'.repeat(200) + '{Enter}')
    expect((await screen.findByRole('alert')).textContent).toBeTruthy()
    expect((await db.meals.get(meal.id))!.title).toBe('Bữa')
  })

  it('is read-only for an archived meal but still deletable (BR-3.10, AC-8)', async () => {
    const meal = await createMeal({ title: 'Đã chốt', date: '2026-01-10' })
    await db.meals.update(meal.id, { status: 'ARCHIVED' } as Partial<Meal>)
    const onBack = vi.fn()
    render(<MealWorkspacePage mealId={meal.id} onBack={onBack} />)

    expect(await screen.findByText('Đã lưu trữ', { selector: 'span' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Đã chốt' })).toBeNull() // tên không còn bấm để sửa được
    expect(screen.queryByRole('combobox', { name: 'Người chủ trì' })).toBeNull()
    await step(/Người/)
    expect((screen.queryByRole('combobox') as HTMLInputElement | null)).toBeNull()
    expect(screen.queryByRole('button', { name: /Bỏ .* khỏi bữa/ })).toBeNull()
    expect(screen.queryByText(/không sửa được|chỉ xem/i)).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Xoá bữa' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Xoá bữa' }))
    await waitFor(() => expect(onBack).toHaveBeenCalled())
    expect(await db.meals.get(meal.id)).toBeUndefined()
  })

  it('bữa đã lưu trữ: giữ và hiện các món, không có nút chia sẻ thanh toán, không có thông báo khoá', async () => {
    const meal = await createMeal({ title: 'Đã chốt', date: '2026-01-10' })
    const now = '2026-01-10T00:00:00.000Z'
    await db.sessions.add({ id: 's1', mealId: meal.id, name: 'Kèo 1', orderIndex: 0, participantIds: meal.participantIds, createdAt: now, archivedTotalAmount: 90_000, archivedPayerSummary: [] })
    await db.items.add({
      id: 'i1', mealId: meal.id, sessionId: 's1', invoiceId: 'gone', name: 'Lẩu bò', quantity: 1, unitPrice: 90_000, rawAmount: 90_000,
      allocatedDiscountAmount: 0, allocatedServiceAmount: 0, allocatedVatAmount: 0, finalAmount: 90_000, consumers: [],
    })
    await db.meals.update(meal.id, {
      status: 'ARCHIVED',
      archivedSummary: { totalMealAmount: 90_000, sessionsSummary: [{ sessionId: 's1', sessionName: 'Kèo 1', totalAmount: 90_000, invoiceCount: 1 }], entitiesSummary: [], transfers: [] },
    } as Partial<Meal>)
    render(<MealWorkspacePage mealId={meal.id} onBack={() => {}} />)

    await userEvent.click(await screen.findByRole('tab', { name: /Hoá đơn/ }))
    await userEvent.click(await screen.findByRole('button', { name: /^Mở Kèo 1$/ }))
    expect(await screen.findByText(/Lẩu bò/)).toBeTruthy()

    await step(/Chia tiền/)
    expect(await screen.findByRole('region', { name: 'Quyết toán' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Chia sẻ thông báo thanh toán' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Lưu trữ bữa' })).toBeNull()
  })

  it('shows a clear message for a missing meal instead of a blank page (R-17)', async () => {
    const onBack = vi.fn()
    render(<MealWorkspacePage mealId="00000000-0000-4000-8000-000000000000" onBack={onBack} />)
    expect((await screen.findByRole('alert')).textContent).toContain('Không tìm thấy bữa này')
    await userEvent.click(screen.getByRole('button', { name: 'Về danh sách bữa' }))
    expect(onBack).toHaveBeenCalled()
  })

  it('confirms in-app (not window.confirm) before removing a person with a paid tick (BR-3.12, AC-12)', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm')
    const meal = await createMeal({ title: 'Bữa', date: '2026-10-19' })
    render(<MealWorkspacePage mealId={meal.id} onBack={() => {}} />)
    await screen.findAllByRole('tab')
    await step(/Người/)
    await userEvent.type(screen.getByRole('combobox'), 'Cường{Enter}')
    const cuong = (await db.members.toArray()).find((m) => m.name === 'Cường')!
    await db.meals.update(meal.id, { settlementStatuses: { [cuong.id]: { isPaid: true } } })

    await userEvent.click(await screen.findByRole('button', { name: 'Bỏ Cường khỏi bữa' }))
    const dialog = await screen.findByRole('dialog', { name: 'Bỏ người đã tick thanh toán?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Bỏ khỏi bữa' }))
    await waitFor(async () => expect((await db.meals.get(meal.id))!.participantIds).not.toContain(cuong.id))
    expect(confirmSpy).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('merges payment groups into the member list: the group replaces its members and opens only when chosen', async () => {
    const meal = await createMeal({ title: 'Bữa', date: '2026-10-19' })
    render(<MealWorkspacePage mealId={meal.id} onBack={() => {}} />)
    await screen.findAllByRole('tab')
    await step(/Người/)
    const input = screen.getByRole('combobox')
    await userEvent.type(input, 'Cường{Enter}')
    await waitFor(async () => expect((await db.meals.get(meal.id))!.participantIds).toHaveLength(2))
    await userEvent.type(input, 'Dung{Enter}')
    await waitFor(async () => expect((await db.meals.get(meal.id))!.participantIds).toHaveLength(3))
    const all = await db.members.toArray()
    const idOf = (name: string) => all.find((m) => m.name === name)!.id
    await createGroup(meal.id, { name: 'Cặp đôi', memberIds: [idOf('Cường'), idOf('Dung')] })

    const list = await screen.findByRole('list', { name: 'Người tham gia' })
    await waitFor(() => expect(within(list).getByRole('button', { name: 'Nhóm Cặp đôi' })).toBeTruthy())
    // thành viên trong nhóm không còn hiện riêng lẻ
    expect(within(list).queryByRole('button', { name: 'Bỏ Cường khỏi bữa' })).toBeNull()
    expect(screen.queryByRole('group', { name: 'Chi tiết nhóm Cặp đôi' })).toBeNull()

    await userEvent.click(within(list).getByRole('button', { name: 'Nhóm Cặp đôi' }))
    const detail = await screen.findByRole('group', { name: 'Chi tiết nhóm Cặp đôi' })
    expect(detail.textContent).toContain('Cường, Dung')
    expect(within(detail).getByRole('button', { name: 'Giải tán nhóm Cặp đôi' })).toBeTruthy()
  })
})

describe('MyProfileDialog (BR-3.11, AC-11)', () => {
  it('renames the default host and rejects a duplicate name', async () => {
    const settings = (await db.settings.get('default'))!
    const me = (await db.members.get(settings.defaultHostMemberId))!
    await db.members.put({ ...me, id: 'other', name: 'Bình', normalizedName: 'binh', isDefaultHost: false })
    const onClose = vi.fn()
    render(<MyProfileDialog profile={me} onClose={onClose} />)

    const input = screen.getByLabelText('Tên của tôi')
    await userEvent.clear(input)
    await userEvent.type(input, 'bình')
    await userEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Đã có người tên "Bình"')
    expect(onClose).not.toHaveBeenCalled()

    await userEvent.clear(input)
    await userEvent.type(input, 'an nguyễn')
    await userEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(await db.members.get(me.id)).toMatchObject({ name: 'An Nguyễn', isDefaultHost: true })
  })
})
