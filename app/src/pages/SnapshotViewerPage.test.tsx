import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '../db/db'
import { ensureDefaultData } from '../db/seed'
import { buildSnapshotPayload, encodeSnapshotPayload } from '../domain/shareSnapshot'
import type { Invoice, InvoiceItem, Meal, Member, SessionKeo } from '../types'
import SnapshotViewerPage from './SnapshotViewerPage'

afterEach(cleanup)

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
  await ensureDefaultData()
})

const NOW = '2026-10-19T10:00:00.000Z'

/** Snapshot của một bữa 2 người: An (chủ trì) trả lẩu 90 000, Bình ăn một nửa. */
function encodedSnapshot(opts: { withBank?: boolean; extraDebtor?: boolean; onlyPayer?: string } = {}): string {
  const ids = opts.extraDebtor ? ['an', 'binh', 'cuong'] : ['an', 'binh']
  const names: Record<string, string> = { an: 'An', binh: 'Bình', cuong: 'Cường' }
  const members: Member[] = ids.map((id) => ({
    id, name: names[id], normalizedName: id, avatarColor: '#2D6A4F', createdAt: NOW, lastUsedAt: NOW,
    ...(id === 'an' && opts.withBank ? { bank: { bankBin: '970436', bankName: 'Vietcombank', accountName: 'NGUYEN VAN AN', accountNumber: '0123456789' } } : {}),
  }))
  const meal: Meal = {
    id: 'm', title: 'Lẩu cuối tuần', date: '2026-10-19', status: 'ACTIVE', participantIds: ids, hostMemberId: 'an',
    settlementMode: 'SELF_SETTLEMENT', paymentGroups: [], settlementStatuses: {}, createdAt: NOW, updatedAt: NOW,
  }
  const sessions: SessionKeo[] = [{ id: 's', mealId: 'm', name: 'Kèo 1 - Lẩu', orderIndex: 0, participantIds: ids, createdAt: NOW }]
  const invoices: Invoice[] = [{
    id: 'i', mealId: 'm', sessionId: 's', vendorName: 'Lẩu Bò Gỗ', payerMemberId: 'an', inputMode: 'ITEMIZED', splitType: 'BY_ITEM',
    equalSplitParticipantIds: ids, subtotalAmount: 90_000, discountMode: 'NONE', discountValue: 0, discountAmount: 0,
    serviceMode: 'NONE', serviceValue: 0, serviceAmount: 0, vatMode: 'NONE', vatValue: 0, vatAmount: 0, totalAmount: 90_000,
    fileIds: [], createdAt: NOW,
  }]
  const items: InvoiceItem[] = [{
    id: 'it', mealId: 'm', sessionId: 's', invoiceId: 'i', name: 'Lẩu', quantity: 1, unitPrice: 90_000, rawAmount: 90_000,
    allocatedDiscountAmount: 0, allocatedServiceAmount: 0, allocatedVatAmount: 0, finalAmount: 90_000,
    consumers: ids.map((memberId) => ({ memberId, shares: 1 })),
  }]
  const payments = opts.onlyPayer
    ? [{ key: `${opts.onlyPayer}->an`, fromId: opts.onlyPayer, fromName: names[opts.onlyPayer], toId: 'an', toName: 'An', amount: 300_000, content: 'x thanh toan' }]
    : undefined
  return encodeSnapshotPayload(buildSnapshotPayload({ meal, members, sessions, invoices, items, exportedAt: NOW, payments }))
}

describe('SnapshotViewerPage (Epic 8: BR-8.2, BR-8.3, BR-8.4, AC-6)', () => {
  it('chỉ có hai tab Hoá đơn và Chia tiền, mặc định mở Chia tiền, chỉ đọc và không ghi IndexedDB', async () => {
    render(<SnapshotViewerPage encoded={encodedSnapshot()} onExit={() => {}} />)

    expect(await screen.findByRole('heading', { name: 'Lẩu cuối tuần' })).toBeTruthy()
    expect(screen.getByRole('status', { name: 'Chế độ xem Snapshot' })).toBeTruthy()
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['1. Hoá đơn', '2. Chia tiền'])
    expect(screen.getByRole('tab', { name: /Chia tiền/ }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('listitem', { name: 'Thanh toán Bình cho An' })).toBeTruthy()

    await userEvent.click(screen.getByRole('tab', { name: /Hoá đơn/ }))
    expect(screen.getByText(/Lẩu Bò Gỗ/)).toBeTruthy()
    expect(screen.getByText(/Lẩu · 1 × 90\.000 ₫/)).toBeTruthy()

    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.queryByRole('button', { name: /Sửa|Xoá|Thêm/ })).toBeNull()
    expect(await db.meals.count()).toBe(0)
    expect(await db.invoices.count()).toBe(0)
  })

  it('người nhận có ngân hàng → slide có QR, thông tin chuyển khoản và nội dung "<người nợ> thanh toán <bữa>"', async () => {
    render(<SnapshotViewerPage encoded={encodedSnapshot({ withBank: true })} onExit={() => {}} />)
    const slide = await screen.findByRole('listitem', { name: 'Thanh toán Bình cho An' })
    expect(within(slide).getByRole('img', { name: /Mã QR chuyển 45\.000 ₫ tới NGUYEN VAN AN/ })).toBeTruthy()
    expect(within(slide).getByText('Vietcombank')).toBeTruthy()
    expect(within(slide).getByText('0123456789')).toBeTruthy()
    expect(within(slide).getByText('Binh thanh toan Lau cuoi tuan')).toBeTruthy()
    expect(within(slide).queryByRole('note')).toBeNull()
  })

  it('người nhận chưa có ngân hàng → không QR, có lời nhắc', async () => {
    render(<SnapshotViewerPage encoded={encodedSnapshot()} onExit={() => {}} />)
    const slide = await screen.findByRole('listitem', { name: 'Thanh toán Bình cho An' })
    expect(within(slide).queryByRole('img')).toBeNull()
    expect(within(slide).getByRole('note').textContent).toContain('chưa có thông tin ngân hàng')
  })

  it('lọc theo tên người và tự lọc sẵn theo focusIds', async () => {
    render(<SnapshotViewerPage encoded={encodedSnapshot({ extraDebtor: true })} onExit={() => {}} />)
    expect(await screen.findAllByRole('listitem', { name: /^Thanh toán/ })).toHaveLength(2)
    await userEvent.click(screen.getByRole('button', { name: 'Cường' }))
    const rest = screen.getAllByRole('listitem', { name: /^Thanh toán/ })
    expect(rest).toHaveLength(1)
    expect(rest[0].getAttribute('aria-label')).toBe('Thanh toán Cường cho An')
    await userEvent.click(screen.getByRole('button', { name: 'Tất cả' }))
    expect(screen.getAllByRole('listitem', { name: /^Thanh toán/ })).toHaveLength(2)
  })

  it('snapshot có sẵn payments chỉ hiện đúng khoản của người được chọn', async () => {
    render(<SnapshotViewerPage encoded={encodedSnapshot({ extraDebtor: true, onlyPayer: 'cuong' })} onExit={() => {}} />)
    const items = await screen.findAllByRole('listitem', { name: /^Thanh toán/ })
    expect(items.map((i) => i.getAttribute('aria-label'))).toEqual(['Thanh toán Cường cho An'])
    expect(screen.queryByText(/Bình/, { selector: 'strong' })).toBeNull()
    expect(screen.getAllByText('300.000 ₫').length).toBeGreaterThan(0)
  })

  it('link hỏng hiện thông báo thân thiện và nút về trang chủ, không làm trắng trang', async () => {
    const onExit = vi.fn()
    render(<SnapshotViewerPage encoded={encodedSnapshot().slice(0, 40)} onExit={onExit} />)
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByText('Link Snapshot không hợp lệ hoặc đã bị cắt bớt khi gửi tin nhắn.')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Về trang chủ ứng dụng của tôi' }))
    expect(onExit).toHaveBeenCalledTimes(1)
  })

  it('link rỗng cũng báo lỗi an toàn', async () => {
    render(<SnapshotViewerPage encoded="" onExit={() => {}} />)
    expect(await screen.findByText('Link Snapshot không hợp lệ hoặc đã bị cắt bớt khi gửi tin nhắn.')).toBeTruthy()
  })
})
