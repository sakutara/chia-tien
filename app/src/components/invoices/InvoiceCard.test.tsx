import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { ensureDefaultData } from '../../db/seed'
import type { InvoiceRow } from '../../hooks/useMealSessions'
import { addSession } from '../../services/sessionService'
import { createInvoice, setItemConsumers } from '../../services/invoiceService'
import { initMealPeople } from '../../services/mealPeopleService'
import type { Member, Meal, SessionKeo } from '../../types'
import InvoiceCard from './InvoiceCard'

afterEach(cleanup)

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
  await ensureDefaultData()
})

async function member(id: string, name: string): Promise<Member> {
  const now = new Date().toISOString()
  const m: Member = { id, name, normalizedName: name.toLowerCase(), avatarColor: '#2D6A4F', createdAt: now, lastUsedAt: now }
  await db.members.put(m)
  return m
}

async function fixture(withConsumers = false) {
  const init = await initMealPeople()
  const bob = await member('bob', 'Bình')
  const chi = await member('chi', 'Chi')
  const now = new Date().toISOString()
  const meal: Meal = {
    id: crypto.randomUUID(), title: 'Bữa', date: '2026-10-19', status: 'ACTIVE',
    participantIds: [init.hostMemberId, bob.id, chi.id], hostMemberId: init.hostMemberId,
    settlementMode: 'SELF_SETTLEMENT', paymentGroups: [], settlementStatuses: {}, createdAt: now, updatedAt: now,
  }
  await db.meals.put(meal)
  const session: SessionKeo = await addSession(meal.id, 'Kèo 1')
  const { invoice, items } = await createInvoice({
    sessionId: session.id,
    payerMemberId: init.hostMemberId,
    inputMode: 'ITEMIZED',
    splitType: 'BY_ITEM',
    items: [
      { name: 'Lẩu bò', quantity: 1, unitPrice: 300_000 },
      { name: 'Bia', quantity: 2, unitPrice: 50_000 },
    ],
    discount: { mode: 'NONE', value: 0 },
    service: { mode: 'NONE', value: 0 },
    vat: { mode: 'NONE', value: 0 },
  })
  // Bật chia từng món tự gán cả kèo; bỏ người ăn để giữ món trống cho các test.
  for (const it of items) await setItemConsumers(it.id, [])
  if (withConsumers) await setItemConsumers(items[0].id, [{ memberId: bob.id, shares: 1 }])
  return { session, members: [...(await db.members.where('id').anyOf(meal.participantIds).toArray())], invoiceId: invoice.id, host: init.hostMemberId, bob, chi }
}

async function rowOf(invoiceId: string): Promise<InvoiceRow> {
  const invoice = (await db.invoices.get(invoiceId))!
  const items = await db.items.where('invoiceId').equals(invoiceId).sortBy('orderIndex')
  return { invoice, items }
}

/** Giống SessionCard: dữ liệu hoá đơn đọc trực tiếp từ DB và cập nhật khi ghi. */
function Live(props: Omit<Parameters<typeof InvoiceCard>[0], 'row' | 'index'> & { invoiceId: string }) {
  const row = useLiveQuery(() => rowOf(props.invoiceId), [props.invoiceId])
  if (!row) return null
  const { invoiceId: _id, ...rest } = props
  return <InvoiceCard row={row} index={0} {...rest} />
}

describe('InvoiceCard (Epic 5: BR-5.1, BR-5.4, BR-5.6, BR-5.8, R-8)', () => {
  it('cảnh báo món chưa có người ăn và cho phép gán cả kèo cho các món trống', async () => {
    const f = await fixture()
    render(<Live invoiceId={f.invoiceId} session={f.session} sessionMembers={f.members} readOnly={false} onEditInvoice={() => {}} onDeleteInvoice={() => {}} onError={() => {}} />)
    await screen.findByRole('switch', { name: 'Chia từng món' })
    expect(screen.getByText('Còn 2 món chưa chọn người ăn')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Gán cả kèo cho các món trống' }))
    await waitFor(async () => expect((await db.items.where('invoiceId').equals(f.invoiceId).toArray()).every((it) => it.consumers.length === 3)).toBe(true))
  })

  it('đổi người ứng ngay trên thẻ hoá đơn (BR-5.1)', async () => {
    const f = await fixture()
    render(<Live invoiceId={f.invoiceId} session={f.session} sessionMembers={f.members} readOnly={false} onEditInvoice={() => {}} onDeleteInvoice={() => {}} onError={() => {}} />)
    await screen.findByRole('switch', { name: 'Chia từng món' })
    await userEvent.click(screen.getByRole('button', { name: /^Người ứng tiền hoá đơn #1/ }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('radio', { name: 'Bình' }))
    await waitFor(async () => expect((await db.invoices.get(f.invoiceId))!.payerMemberId).toBe(f.bob.id))
  })

  it('đổi chế độ chia và tick chọn người chia đều (BR-5.4, BR-5.5)', async () => {
    const f = await fixture()
    render(<Live invoiceId={f.invoiceId} session={f.session} sessionMembers={f.members} readOnly={false} onEditInvoice={() => {}} onDeleteInvoice={() => {}} onError={() => {}} />)
    await screen.findByRole('switch', { name: 'Chia từng món' })
    await userEvent.click(screen.getByRole('switch', { name: 'Chia từng món' }))
    await waitFor(async () => expect((await db.invoices.get(f.invoiceId))!.splitType).toBe('EQUAL_TOTAL'))
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Chia từng món' }).getAttribute('aria-checked')).toBe('false'))

    await userEvent.click(await screen.findByRole('button', { name: /^Người chia đều/ }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('checkbox', { name: 'Chi' }))
    await waitFor(async () => expect((await db.invoices.get(f.invoiceId))!.equalSplitParticipantIds).toHaveLength(2))
  })

  it('chỉnh số phần trong khung chọn người và xác nhận khi xoá món đã có người ăn (R-5, R-8)', async () => {
    const f = await fixture(true)
    render(<Live invoiceId={f.invoiceId} session={f.session} sessionMembers={f.members} readOnly={false} onEditInvoice={() => {}} onDeleteInvoice={() => {}} onError={() => {}} />)
    await screen.findByRole('switch', { name: 'Chia từng món' })
    await userEvent.click(screen.getByRole('button', { name: /^Người ăn Lẩu bò/ }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Tăng số phần của Bình' }))
    await waitFor(async () => {
      const lau = (await db.items.where('invoiceId').equals(f.invoiceId).toArray()).find((it) => it.name === 'Lẩu bò')!
      expect(lau.consumers).toEqual([{ memberId: 'bob', shares: 2 }])
    })

    await userEvent.keyboard('{Escape}')
    await userEvent.click(screen.getByRole('button', { name: 'Xoá món Lẩu bò' }))
    expect(await screen.findByRole('dialog', { name: 'Xoá món đã có người ăn?' })).toBeTruthy()
  })
})

describe('InvoiceCard — món rút gọn', () => {
  it('đổi số lượng và đơn giá thì thành tiền tự tính lại', async () => {
    const f = await fixture()
    render(<Live invoiceId={f.invoiceId} session={f.session} sessionMembers={f.members} readOnly={false} onEditInvoice={() => {}} onDeleteInvoice={() => {}} onError={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: /^Số lượng và đơn giá Bia/ }))
    const dialog = screen.getByRole('dialog')
    const qty = within(dialog).getByLabelText('Số lượng')
    await userEvent.clear(qty)
    await userEvent.type(qty, '3')
    const price = within(dialog).getByLabelText('Đơn giá')
    await userEvent.clear(price)
    await userEvent.type(price, '40k')
    expect(within(dialog).getByText(/= 120\.000/)).toBeTruthy()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu số lượng và đơn giá' }))
    await waitFor(async () => {
      const bia = (await db.items.where('invoiceId').equals(f.invoiceId).toArray()).find((it) => it.name === 'Bia')!
      expect(bia).toMatchObject({ quantity: 3, unitPrice: 40_000, rawAmount: 120_000 })
    })
  })

  it('bấm vào tên món để đổi tên tại chỗ', async () => {
    const f = await fixture()
    render(<Live invoiceId={f.invoiceId} session={f.session} sessionMembers={f.members} readOnly={false} onEditInvoice={() => {}} onDeleteInvoice={() => {}} onError={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Bia' }))
    const input = screen.getByRole('textbox', { name: 'Tên món' })
    await userEvent.clear(input)
    await userEvent.type(input, 'Bia Tiger{Enter}')
    await waitFor(async () => expect((await db.items.where('invoiceId').equals(f.invoiceId).toArray()).map((i) => i.name)).toContain('Bia Tiger'))
  })
})
