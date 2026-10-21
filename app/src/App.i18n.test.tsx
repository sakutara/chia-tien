import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { db } from './db/db'
import { loadStoredLang } from './db/languageStore'
import { ensureDefaultData } from './db/seed'
import { buildSnapshotPayload, buildSnapshotUrl, encodeSnapshotPayload } from './domain/shareSnapshot'
import { setLang } from './i18n'
import type { Meal, Member } from './types'

const NOW = '2026-10-19T10:00:00.000Z'

function snapshotHash(): string {
  const members: Member[] = ['an', 'binh'].map((id) => ({
    id, name: id === 'an' ? 'An' : 'Bình', normalizedName: id, avatarColor: '#2D6A4F', createdAt: NOW, lastUsedAt: NOW,
  }))
  const meal: Meal = {
    id: 'm', title: 'Lẩu cuối tuần', date: '2026-10-19', status: 'ACTIVE', participantIds: ['an', 'binh'], hostMemberId: 'an',
    settlementMode: 'SELF_SETTLEMENT', paymentGroups: [], settlementStatuses: {}, createdAt: NOW, updatedAt: NOW,
  }
  const payments = [{ key: 'binh->an', fromId: 'binh', fromName: 'Bình', toId: 'an', toName: 'An', amount: 45_000, content: 'Binh thanh toan Lau' }]
  return `#/snapshot/${encodeSnapshotPayload(buildSnapshotPayload({ meal, members, sessions: [], invoices: [], items: [], exportedAt: NOW, payments }))}`
}

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()))
  })
  await ensureDefaultData()
})

afterEach(() => {
  cleanup()
  setLang('vi')
  window.location.hash = ''
})

describe('Song ngữ (Epic 9)', () => {
  it('công tắc đổi tên app, giao diện và <html lang> giữa vi và en, không tải lại trang (AC-1, AC-2)', async () => {
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Chia tiền', level: 1 })).toBeTruthy()
    expect(await screen.findByRole('heading', { name: 'Bữa ăn' })).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: 'EN' }))
    expect(screen.getByRole('heading', { name: 'Split Bill', level: 1 })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Meals' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'My profile' })).toBeTruthy()
    expect(document.documentElement.lang).toBe('en')
    expect(document.title).toBe('Split Bill')

    await userEvent.click(screen.getByRole('button', { name: 'VI' }))
    expect(screen.getByRole('heading', { name: 'Chia tiền', level: 1 })).toBeTruthy()
  })

  it('trang Snapshot có công tắc; đổi ngôn ngữ đổi toàn bộ nội dung mà không ghi IndexedDB (AC-6)', async () => {
    window.location.hash = snapshotHash()
    render(<App />)
    expect(await screen.findByRole('listitem', { name: 'Thanh toán Bình cho An' })).toBeTruthy()
    expect(screen.getByRole('status', { name: 'Chế độ xem Snapshot' })).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: 'EN' }))
    expect(screen.getByRole('listitem', { name: 'Payment Bình to An' })).toBeTruthy()
    expect(screen.getByRole('status', { name: 'Snapshot view' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Back to my app home' })).toBeTruthy()
    expect(await db.meals.count()).toBe(0)
    // Chỉ lựa chọn ngôn ngữ được ghi (vào settings), không có dữ liệu Snapshot nào.
    await vi.waitFor(async () => expect((await db.settings.get('default'))?.language).toBe('en'))
    expect(await db.invoices.count()).toBe(0)
  })

  it('ngôn ngữ đã lưu trong IndexedDB được nạp lại khi mở app (BR-9.4)', async () => {
    await db.settings.update('default', { language: 'en' })
    expect(await loadStoredLang()).toBe('en')
    await db.settings.update('default', { language: undefined })
    expect(await loadStoredLang()).toBeNull()
  })

  it('hồ sơ "Tôi" mặc định hiển thị theo ngôn ngữ, tên tự đặt giữ nguyên (AC-8)', async () => {
    render(<App />)
    await screen.findByRole('heading', { name: 'Bữa ăn' })
    const { localizeMember } = await import('./db/localize')
    const me = (await db.members.toArray())[0]
    expect(localizeMember(me).name).toBe('Tôi')
    setLang('en')
    expect(localizeMember(me).name).toBe('Me')
    expect(localizeMember({ ...me, name: 'Leonard' }).name).toBe('Leonard')
  })

  it('link Snapshot mang ngôn ngữ người gửi qua tham số l (BR-9.8)', () => {
    const base = { origin: 'https://x.test', pathname: '/' }
    expect(buildSnapshotUrl('abc', base, 'en')).toBe('https://x.test/?s=abc&l=en')
    expect(buildSnapshotUrl('abc', base, 'vi')).toBe('https://x.test/?s=abc&l=vi')
  })
})
