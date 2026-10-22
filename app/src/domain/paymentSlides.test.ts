import { describe, expect, it } from 'vitest'
import type { MealSettlementResult, PaymentEntitySettlement } from '../types'
import { buildPaymentSlides, filterSlides, personFilterOptions, resolveRecipientBank, slidesFromPayments, toSnapshotPayments } from './paymentSlides'

const bank = (n: string) => ({ bankBin: '970436', bankName: 'Vietcombank', accountName: n, accountNumber: '111222333' })
const entity = (id: string, memberIds: string[], extra: Partial<PaymentEntitySettlement> = {}): PaymentEntitySettlement => ({
  entityId: id, entityName: extra.entityName ?? id, isGroup: memberIds.length > 1, memberIds, memberNames: memberIds,
  totalPaid: 0, totalOwed: 0, netBalance: 0, isPaid: false, ...extra,
})
const result = (entities: PaymentEntitySettlement[], transfers: MealSettlementResult['transfers'], host = 'a'): MealSettlementResult => ({
  mealId: 'm', status: 'ACTIVE', settlementMode: 'SELF_SETTLEMENT', hostMemberId: host, hostEntityId: host, totalMealAmount: 1, assignedAmount: 1,
  unassignedAmount: 0, unassignedItemCount: 0, memberBreakdowns: [], entities, transfers, transferCount: transfers.length, paidTransferCount: 0, isAllSettled: false,
})
const t = (from: string, to: string, amount: number) => ({ fromEntityId: from, fromEntityName: from, toEntityId: to, toEntityName: to, amount, key: `${from}->${to}`, isPaid: false })

describe('buildPaymentSlides', () => {
  const people = [{ id: 'a', name: 'a', bank: bank('A') }, { id: 'b', name: 'b' }, { id: 'c', name: 'c', bank: bank('C') }]

  it('dựng QR cho người nhận có ngân hàng và bỏ QR khi chưa có', () => {
    const slides = buildPaymentSlides({
      settlement: result([entity('a', ['a']), entity('b', ['b']), entity('c', ['c'])], [t('b', 'a', 5000), t('a', 'b', 100)]),
      mealTitle: 'Lẩu', people,
    })
    expect(slides[0].bank?.accountName).toBe('A')
    expect(slides[0].qrPayload).toContain('54045000')
    expect(slides[0].content).toBe('b thanh toan Lau')
    expect(slides[1].bank).toBeUndefined()
    expect(slides[1].qrPayload).toBeUndefined()
  })

  it('không tính thanh toán giữa hai người cùng nhóm', () => {
    const group = entity('g', ['a', 'b'], { entityName: 'Cặp đôi' })
    const slides = buildPaymentSlides({
      settlement: result([group, entity('g2', ['a']), entity('c', ['c'])], [t('g', 'g2', 100), t('c', 'g', 200)]),
      mealTitle: 'x', people,
    })
    expect(slides.map((s) => s.key)).toEqual(['c->g'])
  })

  it('nhóm nhận tiền: lấy tài khoản của thành viên đầu tiên có thông tin, bỏ qua người đại diện', () => {
    const map = new Map(people.map((p) => [p.id, p]))
    const g = entity('g', ['b', 'c', 'a'])
    expect(resolveRecipientBank(g, 'zzz', map)?.accountName).toBe('C')
    expect(resolveRecipientBank(entity('x', ['b']), 'a', map)).toBeUndefined()
  })

  it('lọc theo người: khớp cả bên chuyển và bên nhận', () => {
    const ents = [entity('g', ['a', 'b'], { entityName: 'Cặp đôi' }), entity('c', ['c'])]
    const slides = buildPaymentSlides({ settlement: result(ents, [t('c', 'g', 10)]), mealTitle: 'x', people })
    expect(filterSlides(slides, [])).toHaveLength(1)
    expect(filterSlides(slides, ['g'])).toHaveLength(1)
    expect(filterSlides(slides, ['c'])).toHaveLength(1)
    expect(filterSlides(slides, ['zzz'])).toHaveLength(0)
    expect(personFilterOptions(slides).map((o) => o.label).sort()).toEqual(['c'])
  })

  it('nhờ chủ trì thu: nhóm có chủ trì nhận bằng tài khoản chủ trì; tự thanh toán thì lấy người đầu tiên có tài khoản', () => {
    const g = entity('g', ['c', 'a'], { representativeId: 'c' })
    const settlement = { ...result([g, entity('b', ['b'])], [t('b', 'g', 100)], 'a'), settlementMode: 'HOST_MEDIATED' as const }
    expect(buildPaymentSlides({ settlement, mealTitle: 'x', people })[0].bank?.accountName).toBe('A')
    const self = { ...settlement, settlementMode: 'SELF_SETTLEMENT' as const }
    expect(buildPaymentSlides({ settlement: self, mealTitle: 'x', people })[0].bank?.accountName).toBe('C')
  })

  it('khoản chuyển lưu trong Snapshot dựng lại đúng slide và QR', () => {
    const ents = [entity('a', ['a']), entity('b', ['b'])]
    const slides = buildPaymentSlides({ settlement: result(ents, [t('b', 'a', 5000)]), mealTitle: 'Lẩu', people })
    const again = slidesFromPayments(toSnapshotPayments(slides))
    expect(again).toEqual(slides)
    expect(again[0].qrPayload).toBeTruthy()
  })
})
