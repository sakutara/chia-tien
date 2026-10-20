import LZString from 'lz-string'
import { describe, expect, it } from 'vitest'
import { PeopleError } from '../services/peopleErrors'
import type { Invoice, InvoiceItem, Meal, Member, PaymentEntitySettlement, SessionKeo, SettlementTransfer } from '../types'
import { computeMealSettlement } from './settlementEngine'
import {
  buildSnapshotPayload,
  buildSnapshotUrl,
  decodeSnapshotPayload,
  encodeSnapshotPayload,
  formatEntityShareLabel,
  formatShareMessage,
  hostRecipientLabels,
  hydrateSnapshotForSettlement,
  encodeCompactSnapshot,
  buildItemShares,
  type ItemSharesInput,
} from './shareSnapshot'

const NOW = '2026-10-19T10:00:00.000Z'

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn()
  } catch (e) {
    return e instanceof PeopleError ? e.code : 'OTHER'
  }
  return undefined
}

const members: Member[] = [
  { id: 'an', name: 'An', normalizedName: 'an', avatarColor: '#1B4332', createdAt: NOW, lastUsedAt: NOW },
  { id: 'binh', name: 'Bình', normalizedName: 'binh', avatarColor: '#2D6A4F', createdAt: NOW, lastUsedAt: NOW },
  { id: 'cuong', name: 'Cường', normalizedName: 'cuong', avatarColor: '#2D6A4F', createdAt: NOW, lastUsedAt: NOW },
  { id: 'dung', name: 'Dung', normalizedName: 'dung', avatarColor: '#2D6A4F', createdAt: NOW, lastUsedAt: NOW },
]

/** Bữa 4 người: An (chủ trì) trả lẩu 120 000 + VAT 8%, Cường & Dung là một nhóm. */
function fixture() {
  const meal: Meal = {
    id: 'meal-1', title: 'Lẩu cuối tuần', date: '2026-10-19', status: 'ACTIVE', note: 'Nhớ mang ô',
    participantIds: ['an', 'binh', 'cuong', 'dung'], hostMemberId: 'an', settlementMode: 'SELF_SETTLEMENT',
    paymentGroups: [{ id: 'g1', mealId: 'meal-1', name: 'Cường - Dung', memberIds: ['cuong', 'dung'] }],
    settlementStatuses: {}, createdAt: NOW, updatedAt: NOW,
  }
  const sessions: SessionKeo[] = [
    { id: 's1', mealId: 'meal-1', name: 'Kèo 1 - Lẩu', orderIndex: 0, participantIds: ['an', 'binh', 'cuong', 'dung'], createdAt: NOW },
  ]
  const invoices: Invoice[] = [
    {
      id: 'i1', mealId: 'meal-1', sessionId: 's1', vendorName: 'Lẩu Bò Gỗ', payerMemberId: 'an',
      inputMode: 'ITEMIZED', splitType: 'BY_ITEM', equalSplitParticipantIds: ['an', 'binh', 'cuong', 'dung'],
      subtotalAmount: 120_000, discountMode: 'NONE', discountValue: 0, discountAmount: 0,
      serviceMode: 'NONE', serviceValue: 0, serviceAmount: 0, vatMode: 'PERCENTAGE', vatValue: 8, vatAmount: 9_600,
      totalAmount: 129_600, fileIds: ['f-secret'], createdAt: NOW,
    },
  ]
  const item = (id: string, finalAmount: number, consumers: InvoiceItem['consumers']): InvoiceItem => ({
    id, mealId: 'meal-1', sessionId: 's1', invoiceId: 'i1', name: id, quantity: 1, unitPrice: finalAmount,
    rawAmount: finalAmount, allocatedDiscountAmount: 0, allocatedServiceAmount: 0, allocatedVatAmount: 0,
    finalAmount, consumers,
  })
  const items: InvoiceItem[] = [
    item('Lẩu', 80_000, [{ memberId: 'an', shares: 1 }, { memberId: 'binh', shares: 1 }, { memberId: 'cuong', shares: 1 }, { memberId: 'dung', shares: 1 }]),
    item('Bia', 49_600, [{ memberId: 'binh', shares: 2 }, { memberId: 'cuong', shares: 1 }]),
  ]
  return { meal, members, sessions, invoices, items }
}

describe('buildSnapshotPayload / encode / decode (BR-8.1, R-1, R-2, BR-8.4)', () => {
  it('khôi phục đúng dữ liệu sau khi nén và giải nén', () => {
    const input = fixture()
    const payload = buildSnapshotPayload({ ...input, exportedAt: NOW })
    const decoded = decodeSnapshotPayload(encodeSnapshotPayload(payload))
    expect(decoded).toEqual(payload)
  })

  it('không đưa dữ liệu file hoá đơn hay OCR vào payload (R-1)', () => {
    const payload = buildSnapshotPayload({ ...fixture(), exportedAt: NOW })
    const json = JSON.stringify(payload)
    expect(json).not.toContain('f-secret')
    expect(json).not.toContain('opfsPath')
    expect(json).not.toContain('ocrRawText')
  })

  it('hydrate rồi tính quyết toán cho cùng kết quả như dữ liệu gốc', () => {
    const input = fixture()
    const original = computeMealSettlement(input)
    const payload = decodeSnapshotPayload(encodeSnapshotPayload(buildSnapshotPayload({ ...input, exportedAt: NOW })))
    const rebuilt = computeMealSettlement(hydrateSnapshotForSettlement(payload))
    expect(rebuilt.entities.map((e) => [e.entityName, e.netBalance])).toEqual(original.entities.map((e) => [e.entityName, e.netBalance]))
    expect(rebuilt.transfers.map((t) => t.amount)).toEqual(original.transfers.map((t) => t.amount))
    expect(rebuilt.totalMealAmount).toBe(129_600)
  })

  it('bữa ARCHIVED giữ archivedSummary để hiển thị đã chốt', () => {
    const input = fixture()
    const payload = buildSnapshotPayload({ ...input, exportedAt: NOW })
    payload.meal.status = 'ARCHIVED'
    payload.archivedSummary = {
      totalMealAmount: 129_600,
      sessionsSummary: [{ sessionId: 's1', sessionName: 'Kèo 1 - Lẩu', totalAmount: 129_600, invoiceCount: 1 }],
      entitiesSummary: [],
      transfers: [],
    }
    const rebuilt = computeMealSettlement(hydrateSnapshotForSettlement(decodeSnapshotPayload(encodeSnapshotPayload(payload))))
    expect(rebuilt.status).toBe('ARCHIVED')
    expect(rebuilt.totalMealAmount).toBe(129_600)
  })

  it('giải mã bổ sung mặc định cho trường tuỳ chọn còn thiếu (tương thích ngược)', () => {
    const payload = buildSnapshotPayload({ ...fixture(), exportedAt: NOW }) as unknown as Record<string, unknown>
    const sessions = payload.sessions as Array<{ invoices: Array<Record<string, unknown>> }>
    delete sessions[0].invoices[0].discountMode
    delete sessions[0].invoices[0].serviceMode
    const decoded = decodeSnapshotPayload(encodeSnapshotPayload(payload as never))
    expect(decoded.sessions[0].invoices[0].discountMode).toBe('NONE')
    expect(decoded.sessions[0].invoices[0].serviceMode).toBe('NONE')
  })

  it.each([
    ['chuỗi rỗng', ''],
    ['chuỗi rác', 'không phải snapshot'],
  ])('ném INVALID_SNAPSHOT khi %s', (_, encoded) => {
    expect(codeOf(() => decodeSnapshotPayload(encoded))).toBe('INVALID_SNAPSHOT')
  })

  it('ném lỗi khi link bị cắt cụt hoặc sai phiên bản schema', () => {
    const encoded = encodeSnapshotPayload(buildSnapshotPayload({ ...fixture(), exportedAt: NOW }))
    expect(codeOf(() => decodeSnapshotPayload(encoded.slice(0, Math.floor(encoded.length / 2))))).toBe('INVALID_SNAPSHOT')
    const wrongVersion = buildSnapshotPayload({ ...fixture(), exportedAt: NOW }) as unknown as Record<string, unknown>
    wrongVersion.v = 2
    expect(codeOf(() => decodeSnapshotPayload(encodeSnapshotPayload(wrongVersion as never)))).toBe('INVALID_SNAPSHOT')
  })

  it('buildSnapshotUrl đặt payload nén vào ?s= và đọc lại được', () => {
    const payload = buildSnapshotPayload({ ...fixture(), exportedAt: NOW })
    const encoded = encodeSnapshotPayload(payload)
    const url = new URL(buildSnapshotUrl(payload, { origin: 'https://chia.tien', pathname: '/app/' }))
    expect(url.origin + url.pathname).toBe('https://chia.tien/app/')
    expect(url.searchParams.get('s')).toBe(encoded)
    expect(url.search).not.toMatch(/%/) // không phải escape nên không phình dài
  })
})

describe('định dạng tin nhắn chia sẻ (BR-8.5, R-3, R-4)', () => {
  const entity = (overrides: Partial<PaymentEntitySettlement>): PaymentEntitySettlement => ({
    entityId: 'x', entityName: 'X', isGroup: false, memberIds: [], memberNames: [], totalPaid: 0, totalOwed: 0,
    netBalance: 0, isPaid: false, ...overrides,
  })

  it('nhóm thanh toán hiển thị "Cường + Dung"', () => {
    expect(formatEntityShareLabel(entity({ entityName: 'Cường - Dung', isGroup: true, memberNames: ['Cường', 'Dung'] }))).toBe('Cường + Dung')
    expect(formatEntityShareLabel(entity({ entityName: 'Bình' }))).toBe('Bình')
  })

  it('gom mọi khoản nợ của một người trên một dòng, kèm link ở dòng cuối', () => {
    const entities = [
      entity({ entityId: 'binh', entityName: 'Bình', netBalance: -230_000 }),
      entity({ entityId: 'an', entityName: 'An', netBalance: 150_000 }),
      entity({ entityId: 'g1', entityName: 'Cường - Dung', isGroup: true, memberNames: ['Cường', 'Dung'], netBalance: -80_000 }),
    ]
    const transfers: SettlementTransfer[] = [
      { fromEntityId: 'binh', fromEntityName: 'Bình', toEntityId: 'an', toEntityName: 'An', amount: 150_000, key: 'binh', isPaid: false },
      { fromEntityId: 'binh', fromEntityName: 'Bình', toEntityId: 'an', toEntityName: 'An', amount: 80_000, key: 'binh', isPaid: false },
      { fromEntityId: 'g1', fromEntityName: 'Cường - Dung', toEntityId: 'an', toEntityName: 'An', amount: 80_000, key: 'g1', isPaid: false },
    ]
    const text = formatShareMessage({
      mealTitle: 'Lẩu cuối tuần', entities, transfers, snapshotUrl: 'https://chia.tien/?snapshot=abc',
    })
    expect(text.split('\n')).toEqual([
      'Lẩu cuối tuần',
      '- Bình: chuyển cho An 150.000 ₫, chuyển cho An 80.000 ₫',
      '- Cường + Dung: chuyển cho An 80.000 ₫',
      'https://chia.tien/?snapshot=abc',
    ])
  })

  it('tin nhắn tiếng Anh: câu, dấu phân cách số và dòng hoàn tất theo ngôn ngữ truyền vào (Epic 9, BR-9.6)', () => {
    const entities = [entity({ entityId: 'binh', entityName: 'Bình' })]
    const transfers: SettlementTransfer[] = [
      { fromEntityId: 'binh', fromEntityName: 'Bình', toEntityId: 'an', toEntityName: 'An', amount: 1_620_000, key: 'binh->an', isPaid: false },
    ]
    expect(formatShareMessage({ mealTitle: 'Dinner', entities, transfers, snapshotUrl: 'L', lang: 'en' }).split('\n')[1]).toBe('- Bình: transfer to An 1,620,000 ₫')
    expect(formatShareMessage({ mealTitle: 'Dinner', entities, transfers, snapshotUrl: 'L', lang: 'vi' }).split('\n')[1]).toBe('- Bình: chuyển cho An 1.620.000 ₫')
    expect(formatShareMessage({ mealTitle: 'Dinner', entities, transfers, snapshotUrl: 'L', lang: 'en', onlyEntityIds: ['x'] }).split('\n')[1]).toBe('- All payments are settled.')
  })

  it('onlyUnpaid bỏ khoản đã tick; không còn khoản nợ thì ghi đã hoàn tất', () => {
    const entities = [entity({ entityId: 'binh', entityName: 'Bình', isPaid: true })]
    const transfers: SettlementTransfer[] = [
      { fromEntityId: 'binh', fromEntityName: 'Bình', toEntityId: 'an', toEntityName: 'An', amount: 10_000, key: 'binh->an', isPaid: true },
    ]
    const text = formatShareMessage({ mealTitle: 'Bữa', entities, transfers, snapshotUrl: 'L', onlyUnpaid: true })
    expect(text.split('\n')[1]).toBe('- Tất cả các khoản thanh toán đã hoàn tất.')
  })

  it('chế độ nhờ chủ trì: nhóm chứa chủ trì nhận tiền hiển thị tên chủ trì', () => {
    const entities = [
      entity({ entityId: 'g1', entityName: 'An - Vợ', isGroup: true, memberIds: ['an', 'vo'], memberNames: ['An', 'Vợ'] }),
      entity({ entityId: 'binh', entityName: 'Bình' }),
    ]
    const labels = hostRecipientLabels(entities, 'an', new Map([['an', 'An']]))
    expect(labels).toEqual({ g1: 'An' })
    const transfers: SettlementTransfer[] = [
      { fromEntityId: 'binh', fromEntityName: 'Bình', toEntityId: 'g1', toEntityName: 'An - Vợ', amount: 50_000, key: 'binh', isPaid: false },
    ]
    const text = formatShareMessage({ mealTitle: 'Bữa', entities, transfers, snapshotUrl: 'L', recipientLabelByEntityId: labels })
    expect(text.split('\n')[1]).toBe('- Bình: chuyển cho An 50.000 ₫')
  })

})

/** Dựng link theo định dạng cũ (JSON mảng + lz-string) để so sánh và kiểm tra tương thích ngược. */
function toLegacy(title: string, names: string[], pays: Array<{ fromName: string; toName: string; amount: number; content: string }>, shares: ItemSharesInput[]): string {
  const rows = pays.map((p) => [names.indexOf(p.fromName), names.indexOf(p.toName), p.amount, -1, p.content])
  const keos = shares.map((k) => [k.name, k.lines.map((l) => [l.name, l.amount, 0])])
  const tuple: unknown[] = [title, names, [], rows]
  if (keos.length > 0) tuple.push(keos)
  return LZString.compressToEncodedURIComponent(JSON.stringify(tuple)).replace(/\+/g, '.').replace(/\$/g, '_')
}

describe('link gọn', () => {
  const bank = { bankBin: '970436', bankName: 'Vietcombank', accountName: 'NGUYEN VAN AN', accountNumber: '0123456789' }
  const payments = [
    { key: 'b->a', fromId: 'b', fromName: 'Bình', toId: 'a', toName: 'An', amount: 45_000, content: 'Binh thanh toan Lau', bank },
    { key: 'c->a', fromId: 'c', fromName: 'Cường', toId: 'a', toName: 'An', amount: 52_500, content: 'Binh thanh toan Lau', bank: { ...bank, bankBin: '123456', bankName: 'NH lạ' } },
    { key: 'd->a', fromId: 'd', fromName: 'Dung', toId: 'a', toName: 'An', amount: 10_000, content: 'Dung thanh toan Lau' },
  ]

  it('giải mã lại đủ khoản chuyển, tài khoản (kể cả ngân hàng lạ) và nội dung tuỳ chỉnh', () => {
    const decoded = decodeSnapshotPayload(encodeCompactSnapshot('Lau', payments))
    expect(decoded.meal.title).toBe('Lau')
    expect(decoded.payments!.map((p) => [p.fromName, p.toName, p.amount, p.content])).toEqual([
      ['Bình', 'An', 45_000, 'Binh thanh toan Lau'],
      ['Cường', 'An', 52_500, 'Binh thanh toan Lau'],
      ['Dung', 'An', 10_000, 'Dung thanh toan Lau'],
    ])
    expect(decoded.payments![0].bank).toEqual(bank)
    expect(decoded.payments![1].bank?.bankName).toBe('NH lạ')
    expect(decoded.payments![2].bank).toBeUndefined()
  })

  it('ngắn hơn nhiều so với payload đầy đủ và không có ký tự cần escape', () => {
    const compact = encodeCompactSnapshot('Lau', payments)
    const full = encodeSnapshotPayload(buildSnapshotPayload({ ...fixture(), exportedAt: NOW, payments }))
    expect(compact).toMatch(/^~[A-Za-z0-9_-]+$/)
    expect(compact.length).toBeLessThan(full.length / 2)
  })

  it('link bị cắt vẫn báo INVALID_SNAPSHOT', () => {
    const encoded = encodeCompactSnapshot('Lau', payments)
    expect(codeOf(() => decodeSnapshotPayload(encoded.slice(0, 20)))).toBe('INVALID_SNAPSHOT')
    expect(codeOf(() => decodeSnapshotPayload(encoded.slice(0, -3)))).toBe('INVALID_SNAPSHOT')
    expect(codeOf(() => decodeSnapshotPayload(`${encoded}!!`))).toBe('INVALID_SNAPSHOT')
    expect(codeOf(() => decodeSnapshotPayload('~'))).toBe('INVALID_SNAPSHOT')
  })

  it('ngắn hơn định dạng JSON + lz-string của link cũ', () => {
    const shares = [{ name: 'Kèo 1 - Lẩu', lines: ['Lẩu thái hải sản', 'Bia Tiger', 'Nước suối', 'Rau thêm'].map((name, i) => ({ name, amount: 12_345 * (i + 1), ownerId: 'b', ownerName: 'Bình' })) }]
    const names = ['Bình', 'An', 'Cường', 'Dung']
    const legacy = toLegacy('Lau', names, payments, shares)
    expect(encodeCompactSnapshot('Lau', payments, shares).length).toBeLessThan(legacy.length * 0.85)
  })

  it('số không nguyên thì rơi về JSON lz-string và vẫn giải mã được', () => {
    const odd = [{ ...payments[0], amount: 45_000.5 }]
    const encoded = encodeCompactSnapshot('Lau', odd)
    expect(encoded.startsWith('~')).toBe(false)
    expect(decodeSnapshotPayload(encoded).payments![0].amount).toBe(45_000.5)
  })

  it('vẫn đọc được link JSON + lz-string cũ', () => {
    const legacy = toLegacy('Lau', ['Bình', 'An'], [payments[0]], [])
    const decoded = decodeSnapshotPayload(legacy)
    expect(decoded.payments![0]).toMatchObject({ fromName: 'Bình', toName: 'An', amount: 45_000 })
  })

  it('chuỗi có ký tự NUL, emoji và tên dài vẫn khứ hồi đúng', () => {
    const title = 'Tiệc 🍻 ' + 'x'.repeat(300)
    const decoded = decodeSnapshotPayload(encodeCompactSnapshot(title, [{ ...payments[2], fromName: 'Dũng\0', content: 'nội dung 🍜' }]))
    expect(decoded.meal.title).toBe(title)
    expect(decoded.payments![0].fromName).toBe('Dũng ')
    expect(decoded.payments![0].content).toBe('nội dung 🍜')
  })

  it('kèm các món: chỉ món có người nhận tham gia, với số tiền phần của họ', () => {
    const f = fixture()
    const shares = buildItemShares(f, [{ entityId: 'binh', entityName: 'Bình', memberIds: ['binh'] }])
    expect(shares).toHaveLength(1)
    expect(shares[0].name).toBe('Kèo 1 - Lẩu')
    const sum = shares[0].lines.reduce((t, l) => t + l.amount, 0)
    expect(sum).toBeGreaterThan(0)
    expect(sum).toBeLessThan(129_600)
    expect(shares[0].lines.every((l) => l.ownerId === 'binh')).toBe(true)

    const decoded = decodeSnapshotPayload(encodeCompactSnapshot('Lau', payments, shares))
    expect(decoded.itemShares?.[0].name).toBe('Kèo 1 - Lẩu')
    expect(decoded.itemShares?.[0].lines.map((l) => [l.name, l.amount])).toEqual(shares[0].lines.map((l) => [l.name, l.amount]))
    expect(decoded.payments).toHaveLength(3)
  })

  it('nhóm cộng phần của các thành viên; người không tham gia món thì không có dòng', () => {
    const f = fixture()
    const group = buildItemShares(f, [{ entityId: 'g1', entityName: 'Cường - Dung', memberIds: ['cuong', 'dung'] }])
    const cuong = buildItemShares(f, [{ entityId: 'cuong', entityName: 'Cường', memberIds: ['cuong'] }])
    const dung = buildItemShares(f, [{ entityId: 'dung', entityName: 'Dung', memberIds: ['dung'] }])
    const total = (k: typeof group) => k[0].lines.reduce((t, l) => t + l.amount, 0)
    expect(Math.abs(total(group) - (total(cuong) + total(dung)))).toBeLessThanOrEqual(group[0].lines.length)
    expect(buildItemShares(f, [{ entityId: 'x', entityName: 'X', memberIds: ['x'] }])[0].lines).toEqual([])
  })
})
