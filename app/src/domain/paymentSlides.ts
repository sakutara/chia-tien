import type { BankAccount, MealSettlementResult, PaymentEntitySettlement, SettlementTransfer, SnapshotPayment } from '../types'
import { buildTransferContent, buildVietQrPayload } from './vietQr'

/*
 * Các "slide thanh toán" trong Snapshot: mỗi lệnh chuyển tiền là một slide gồm số tiền, nội dung và
 * (nếu người nhận có tài khoản) mã VietQR. Hàm thuần.
 */

export interface PersonBank {
  id: string
  name: string
  bank?: BankAccount
}

export interface PaymentSlide {
  key: string
  fromEntityId: string
  fromName: string
  toEntityId: string
  toName: string
  amount: number
  content: string
  /** Tài khoản nhận; vắng khi người nhận chưa nhập thông tin ngân hàng. */
  bank?: BankAccount
  /** Chuỗi để dựng QR; vắng khi chưa có `bank`. */
  qrPayload?: string
  /** Id hai bên (người chuyển, người nhận) dùng để lọc theo người. */
  involvedIds: string[]
}

/** Hai thực thể có chung thành viên (cùng một nhóm) thì không phát sinh thanh toán giữa họ. */
function shareMembers(a?: PaymentEntitySettlement, b?: PaymentEntitySettlement): boolean {
  if (!a || !b) return false
  return a.memberIds.some((id) => b.memberIds.includes(id))
}

/**
 * Chọn tài khoản nhận của một thực thể: nếu nhờ chủ trì thu và thực thể chứa chủ trì thì ưu tiên tài khoản chủ trì;
 * sau đó người đại diện nhóm → chủ trì (nếu nằm trong nhóm) → thành viên đầu tiên có tài khoản.
 * Cá nhân lẻ dùng tài khoản của chính họ.
 */
export function resolveRecipient(
  entity: Pick<PaymentEntitySettlement, 'memberIds' | 'representativeId'> | undefined,
  hostMemberId: string,
  people: ReadonlyMap<string, PersonBank>,
  hostFirst = false,
): { memberId: string; bank: BankAccount } | undefined {
  if (!entity) return undefined
  const hostInside = entity.memberIds.includes(hostMemberId) ? hostMemberId : undefined
  const order = [hostFirst ? hostInside : undefined, entity.representativeId, hostInside, ...entity.memberIds]
  for (const id of order) {
    if (!id || !entity.memberIds.includes(id)) continue
    const bank = people.get(id)?.bank
    if (bank) return { memberId: id, bank }
  }
  return undefined
}

export function resolveRecipientBank(
  entity: Pick<PaymentEntitySettlement, 'memberIds' | 'representativeId'> | undefined,
  hostMemberId: string,
  people: ReadonlyMap<string, PersonBank>,
  hostFirst = false,
): BankAccount | undefined {
  return resolveRecipient(entity, hostMemberId, people, hostFirst)?.bank
}

const isHostFirst = (settlement: MealSettlementResult, entity?: PaymentEntitySettlement) =>
  settlement.settlementMode === 'HOST_MEDIATED' && !!entity?.memberIds.includes(settlement.hostMemberId)

export function buildPaymentSlides(input: {
  settlement: MealSettlementResult
  mealTitle: string
  people: ReadonlyArray<PersonBank>
}): PaymentSlide[] {
  const { settlement, mealTitle, people } = input
  const peopleById = new Map(people.map((p) => [p.id, p] as const))
  const entityById = new Map(settlement.entities.map((e) => [e.entityId, e] as const))

  return settlement.transfers
    .filter((t: SettlementTransfer) => t.amount > 0 && !shareMembers(entityById.get(t.fromEntityId), entityById.get(t.toEntityId)))
    .map((t) => {
      const to = entityById.get(t.toEntityId)
      const bank = resolveRecipientBank(to, settlement.hostMemberId, peopleById, isHostFirst(settlement, to))
      const content = buildTransferContent(t.fromEntityName, mealTitle)
      return {
        key: `${t.fromEntityId}->${t.toEntityId}`,
        fromEntityId: t.fromEntityId,
        fromName: t.fromEntityName,
        toEntityId: t.toEntityId,
        toName: t.toEntityName,
        amount: t.amount,
        content,
        bank,
        qrPayload: bank ? buildVietQrPayload({ bankBin: bank.bankBin, accountNumber: bank.accountNumber, amount: t.amount, content }) : undefined,
        involvedIds: [t.fromEntityId, t.toEntityId],
      }
    })
}

export interface PersonFilterOption {
  id: string
  label: string
}

/** Các bên phải chuyển tiền trong slide để lọc theo tên (người nhận không có trong danh sách). */
export function personFilterOptions(slides: ReadonlyArray<PaymentSlide>): PersonFilterOption[] {
  const seen = new Map<string, string>()
  for (const s of slides) {
    seen.set(s.fromEntityId, s.fromName)
  }
  return [...seen].map(([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label, 'vi'))
}

/** Dạng gọn đưa vào Snapshot: đủ dựng lại slide và QR. */
export function toSnapshotPayments(slides: ReadonlyArray<PaymentSlide>): SnapshotPayment[] {
  return slides.map((s) => ({
    key: s.key,
    fromId: s.fromEntityId,
    fromName: s.fromName,
    toId: s.toEntityId,
    toName: s.toName,
    amount: s.amount,
    content: s.content,
    ...(s.bank ? { bank: s.bank } : {}),
  }))
}

/** Dựng lại slide (kể cả QR) từ các khoản chuyển lưu trong Snapshot. */
export function slidesFromPayments(payments: ReadonlyArray<SnapshotPayment>): PaymentSlide[] {
  return payments.map((p) => ({
    key: p.key,
    fromEntityId: p.fromId,
    fromName: p.fromName,
    toEntityId: p.toId,
    toName: p.toName,
    amount: p.amount,
    content: p.content,
    bank: p.bank,
    qrPayload: p.bank ? buildVietQrPayload({ bankBin: p.bank.bankBin, accountNumber: p.bank.accountNumber, amount: p.amount, content: p.content }) : undefined,
    involvedIds: [p.fromId, p.toId],
  }))
}

/** Slide liên quan tới ít nhất một người được chọn; không chọn ai → tất cả. */
export function filterSlides(slides: ReadonlyArray<PaymentSlide>, selectedIds: ReadonlyArray<string>): PaymentSlide[] {
  if (selectedIds.length === 0) return [...slides]
  return slides.filter((s) => selectedIds.some((id) => s.involvedIds.includes(id)))
}
