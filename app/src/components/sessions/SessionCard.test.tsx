import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '../../db/db'
import { ensureDefaultData } from '../../db/seed'
import type { SessionView } from '../../hooks/useMealSessions'
import { createInvoice } from '../../services/invoiceService'
import { addSession } from '../../services/sessionService'
import { createMeal } from '../../services/mealService'
import type { Member, Meal, SessionKeo } from '../../types'
import SessionCard from './SessionCard'

afterEach(cleanup)

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
  await ensureDefaultData()
})

const none = { mode: 'NONE' as const, value: 0 }

/** Bữa 2 người (chủ app + Bình), hai kèo; kèo đầu tiên có sẵn `Lẩu bò`. */
async function fixture() {
  const meal: Meal = await createMeal({ title: 'Lẩu cuối tuần', date: '2026-10-19' })
  const members = (await db.members.bulkGet(meal.participantIds)).filter((m): m is Member => !!m)
  const first = await addSession(meal.id, 'Lẩu bò')
  const second = await addSession(meal.id, 'Cà phê')
  return { meal, members, first, second, host: members.find((m) => m.isDefaultHost)! }
}

/** Dựng dữ liệu hiển thị của một kèo từ DB, giống hook `useMealSessions` trả về. */
async function viewOf(session: SessionKeo, overrides: Partial<SessionView> = {}): Promise<SessionView> {
  const fresh = (await db.sessions.get(session.id))!
  const invoices = await db.invoices.where('sessionId').equals(session.id).toArray()
  const rows = await Promise.all(invoices.map(async (invoice) => ({ invoice, items: await db.items.where('invoiceId').equals(invoice.id).toArray() })))
  const total = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
  return { session: fresh, invoices: rows, keptItems: [], total, hasCost: invoices.length > 0, ...overrides }
}

describe('SessionCard (UI §4.2)', () => {
  it('mặc định thu gọn: chỉ hiện tên kèo và "Chưa có chi phí"; chưa thấy danh sách hoá đơn', async () => {
    const f = await fixture()
    render(
      <SessionCard
        view={await viewOf(f.first)}
        isFirst
        isLast={false}
        mealParticipants={f.members}
        hostMemberId={f.host.id}
        readOnly={false}
        onError={() => {}}
      />,
    )
    const card = screen.getByRole('article', { name: 'Kèo Lẩu bò' })
    expect(within(card).getByText('Chưa có chi phí')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Mở Lẩu bò' }).getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('region', { name: 'Hoá đơn của Lẩu bò' })).toBeNull()
  })

  it('bấm mở thì hiện khu hoá đơn; kèo chưa có hoá đơn báo rõ điều đó', async () => {
    const f = await fixture()
    render(
      <SessionCard
        view={await viewOf(f.first)}
        isFirst
        isLast={false}
        mealParticipants={f.members}
        hostMemberId={f.host.id}
        readOnly={false}
        onError={() => {}}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Mở Lẩu bò' }))
    const section = screen.getByRole('region', { name: 'Hoá đơn của Lẩu bò' })
    expect(within(section).getByText('Hoá đơn (0)')).toBeTruthy()
    expect(within(section).getByText('Chưa có hoá đơn trong kèo này.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Thu gọn Lẩu bò' }).getAttribute('aria-expanded')).toBe('true')
  })

  it('khi đã có hoá đơn: tổng chi hiện trên tiêu đề và số hoá đơn hiện khi thu gọn', async () => {
    const f = await fixture()
    await createInvoice({
      sessionId: f.first.id,
      payerMemberId: f.host.id,
      inputMode: 'TOTAL_ONLY',
      items: [],
      subtotalAmount: 90_000,
      discount: none,
      service: none,
      vat: none,
    })
    render(
      <SessionCard
        view={await viewOf(f.first)}
        isFirst
        isLast={false}
        mealParticipants={f.members}
        hostMemberId={f.host.id}
        readOnly={false}
        onError={() => {}}
      />,
    )
    const card = screen.getByRole('article', { name: 'Kèo Lẩu bò' })
    expect(within(card).getByText('90.000 ₫', { exact: false })).toBeTruthy()
    expect(within(card).getByText(/1 hoá đơn/)).toBeTruthy()
  })

  it('nút đưa lên/xuống bị khoá ở đầu và cuối danh sách; bấm đưa lên đổi thứ tự thật trong DB', async () => {
    const f = await fixture()
    const { rerender } = render(
      <SessionCard
        view={await viewOf(f.second)}
        isFirst={false}
        isLast
        mealParticipants={f.members}
        hostMemberId={f.host.id}
        readOnly={false}
        onError={() => {}}
      />,
    )
    expect((screen.getByRole('button', { name: 'Đưa Cà phê xuống' }) as HTMLButtonElement).disabled).toBe(true)
    await userEvent.click(screen.getByRole('button', { name: 'Đưa Cà phê lên' }))
    await waitFor(async () => expect((await db.sessions.get(f.second.id))!.orderIndex).toBe(0))
    expect((await db.sessions.get(f.first.id))!.orderIndex).toBe(1)

    rerender(
      <SessionCard
        view={await viewOf((await db.sessions.get(f.second.id))!)}
        isFirst
        isLast={false}
        mealParticipants={f.members}
        hostMemberId={f.host.id}
        readOnly={false}
        onError={() => {}}
      />,
    )
    expect((screen.getByRole('button', { name: 'Đưa Cà phê lên' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('xoá kèo phải qua hộp xác nhận; xác nhận thì kèo biến khỏi DB', async () => {
    const f = await fixture()
    render(
      <SessionCard
        view={await viewOf(f.second)}
        isFirst={false}
        isLast
        mealParticipants={f.members}
        hostMemberId={f.host.id}
        readOnly={false}
        onError={() => {}}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Xoá kèo Cà phê' }))
    const dialog = await screen.findByRole('dialog', { name: 'Xoá kèo?' })
    expect(within(dialog).getByText(/toàn bộ dữ liệu của kèo/)).toBeTruthy()
    expect(await db.sessions.get(f.second.id)).toBeDefined()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Xoá kèo' }))
    await waitFor(async () => expect(await db.sessions.get(f.second.id)).toBeUndefined())
  })

  it('chế độ chỉ đọc không có nút sửa/xoá; bữa đã chốt hiện tóm tắt ứng trước và số hoá đơn đã chốt', async () => {
    const f = await fixture()
    const archived: SessionKeo = {
      ...f.first,
      archivedTotalAmount: 90_000,
      archivedPayerSummary: [{ memberId: f.host.id, paidAmount: 90_000 }],
    }
    render(
      <SessionCard
        view={{ ...(await viewOf(f.first)), session: archived, total: 90_000, hasCost: true }}
        isFirst
        isLast
        mealParticipants={f.members}
        hostMemberId={f.host.id}
        readOnly
        archivedInvoiceCount={2}
        onError={() => {}}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Xoá kèo Lẩu bò' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Đưa Lẩu bò lên' })).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Mở Lẩu bò' }))
    const summary = screen.getByRole('region', { name: 'Tóm tắt đã chốt của Lẩu bò' })
    expect(within(summary).getByText('Đã chốt 2 hoá đơn')).toBeTruthy()
    expect(within(summary).getByText(`Ứng trước: ${f.host.name}`)).toBeTruthy()
    expect(within(summary).getByText('90.000 ₫')).toBeTruthy()
  })
})
