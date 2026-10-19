import LZString from 'lz-string'
import { formatMoney } from '../lib/money'
import { findBankByBin } from './banks'
import { buildTransferContent } from './vietQr'
import { PeopleError } from '../services/peopleErrors'
import type {
  AdjustmentMode,
  ArchivedMealSummary,
  BankAccount,
  Invoice,
  InvoiceInputMode,
  InvoiceItem,
  InvoiceSplitType,
  ItemShare,
  Meal,
  MealStatus,
  MealSnapshotPayload,
  Member,
  PaymentEntitySettlement,
  PaymentGroup,
  SessionKeo,
  SettlementMode,
  SettlementTransfer,
  SnapshotKeoShares,
  SnapshotPayment,
  VatMode,
} from '../types'
import type { SettlementEngineInput } from './settlementEngine'

/*
 * Custom URL Snapshot và tin nhắn thông báo thanh toán (Epic 8). Hàm thuần: không đọc DB, không chạm DOM.
 */

export const SNAPSHOT_PARAM = 's'
/** Tên tham số của link cũ (`?snapshot=`), vẫn đọc được. */
export const LEGACY_SNAPSHOT_PARAM = 'snapshot'
const SNAPSHOT_MEAL_ID = 'snapshot'
const DEFAULT_AVATAR = '#2D6A4F'

const invalidSnapshot = () =>
  new PeopleError('INVALID_SNAPSHOT', 'Link Snapshot không hợp lệ hoặc đã bị cắt bớt khi gửi tin nhắn.')

/** R-1: đóng gói toàn bộ dữ liệu của bữa; không đưa ảnh, OCR hay đường dẫn file vào payload. */
export function buildSnapshotPayload(
  input: SettlementEngineInput & {
    exportedAt?: string
    /**
     * Khoản chuyển tiền được phép đưa vào snapshot. Khi có, payload KHÔNG chứa tài khoản trong danh sách thành viên,
     * số dư/khoản chuyển của người khác (archivedSummary bị lược) và trạng thái tick của khoản không được chọn.
     */
    payments?: SnapshotPayment[]
  },
): MealSnapshotPayload {
  const { meal, members, sessions, invoices, items, exportedAt, payments } = input
  const scoped = payments !== undefined
  const allowedKeys = new Set(payments?.map((p) => p.key))
  const archived = meal.archivedSummary
  const participants = new Set(meal.participantIds)
  const itemsByInvoice = new Map<string, InvoiceItem[]>()
  for (const it of items) {
    const list = itemsByInvoice.get(it.invoiceId)
    if (list) list.push(it)
    else itemsByInvoice.set(it.invoiceId, [it])
  }

  return {
    v: 1,
    exportedAt: exportedAt ?? new Date().toISOString(),
    meal: {
      title: meal.title,
      date: meal.date,
      note: meal.note,
      status: meal.status,
      settlementMode: meal.settlementMode,
      hostMemberId: meal.hostMemberId,
    },
    members: members
      .filter((m) => participants.has(m.id))
      .map((m) => ({ id: m.id, name: m.name, avatarColor: m.avatarColor, ...(m.bank && !scoped ? { bank: m.bank } : {}) })),
    paymentGroups: meal.paymentGroups.map((g) => ({
      id: g.id,
      name: g.name,
      memberIds: g.memberIds,
      representativeId: g.representativeId,
    })),
    sessions: [...sessions]
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((session) => ({
        id: session.id,
        name: session.name,
        orderIndex: session.orderIndex,
        participantIds: session.participantIds,
        archivedTotalAmount: session.archivedTotalAmount,
        archivedPayerSummary: session.archivedPayerSummary,
        invoices: invoices
          .filter((inv) => inv.sessionId === session.id)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
          .map((inv) => ({
            id: inv.id,
            vendorName: inv.vendorName,
            invoiceDate: inv.invoiceDate,
            payerMemberId: inv.payerMemberId,
            inputMode: inv.inputMode,
            splitType: inv.splitType,
            equalSplitParticipantIds: inv.equalSplitParticipantIds,
            subtotalAmount: inv.subtotalAmount,
            discountMode: inv.discountMode,
            discountValue: inv.discountValue,
            discountAmount: inv.discountAmount,
            serviceMode: inv.serviceMode,
            serviceValue: inv.serviceValue,
            serviceAmount: inv.serviceAmount,
            vatMode: inv.vatMode,
            vatValue: inv.vatValue,
            vatAmount: inv.vatAmount,
            totalAmount: inv.totalAmount,
            items: (itemsByInvoice.get(inv.id) ?? [])
              .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
              .map((it) => ({
                name: it.name,
                quantity: it.quantity,
                unitPrice: it.unitPrice,
                rawAmount: it.rawAmount,
                allocatedDiscountAmount: it.allocatedDiscountAmount,
                allocatedServiceAmount: it.allocatedServiceAmount,
                allocatedVatAmount: it.allocatedVatAmount,
                finalAmount: it.finalAmount,
                orderIndex: it.orderIndex,
                consumers: it.consumers,
              })),
          })),
      })),
    settlementStatuses: scoped
      ? Object.fromEntries(Object.entries(meal.settlementStatuses).filter(([key]) => allowedKeys.has(key)))
      : meal.settlementStatuses,
    archivedSummary:
      scoped && archived ? { ...archived, entitiesSummary: [], transfers: [] } : archived,
    ...(scoped ? { payments } : {}),
  }
}

/*
 * Bảng ký tự của lz-string có `+` và `$`, hai ký tự bị `encodeURIComponent` đổi thành `%2B`/`%24` (dài gấp 3).
 * Đổi sang `.` và `_` (đều là ký tự không dành riêng của URL) để link không phải escape. Link cũ không chứa `.`/`_`
 * nên chiều ngược lại vẫn đọc được cả link cũ.
 */
const toUrlSafe = (s: string) => s.replace(/\+/g, '.').replace(/\$/g, '_')
const fromUrlSafe = (s: string) => s.replace(/\./g, '+').replace(/_/g, '$')

/**
 * Các món mà từng thực thể trong `payers` phải trả, theo từng kèo, kèm số tiền phần của họ (cộng các thành viên của nhóm).
 * Cùng quy tắc chia như bộ quyết toán (chỉ người tham gia kèo, chia theo `shares`; hoá đơn chia đều theo tổng thì mỗi hoá đơn
 * là một dòng). Số tiền từng dòng làm tròn riêng nên tổng có thể lệch vài đồng so với khoản chuyển.
 */
export function buildItemShares(
  input: Pick<SettlementEngineInput, 'sessions' | 'invoices' | 'items'>,
  payers: ReadonlyArray<{ entityId: string; entityName: string; memberIds: ReadonlyArray<string> }>,
): ItemSharesInput[] {
  const itemsByInvoice = new Map<string, InvoiceItem[]>()
  for (const it of input.items) {
    const list = itemsByInvoice.get(it.invoiceId)
    if (list) list.push(it)
    else itemsByInvoice.set(it.invoiceId, [it])
  }
  return [...input.sessions]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((session) => {
      const inSession = new Set(session.participantIds)
      const lines: ItemSharesInput['lines'] = []
      const invoices = input.invoices.filter((i) => i.sessionId === session.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      invoices.forEach((inv, n) => {
        const push = (name: string, amount: number, payer: (typeof payers)[number]) => {
          if (amount > 0) lines.push({ name, amount: Math.round(amount), ownerId: payer.entityId, ownerName: payer.entityName })
        }
        if (inv.splitType === 'EQUAL_TOTAL') {
          const equal = [...new Set(inv.equalSplitParticipantIds)].filter((id) => inSession.has(id))
          for (const payer of payers) {
            const mine = payer.memberIds.filter((id) => equal.includes(id)).length
            if (mine > 0 && equal.length > 0) push(inv.vendorName?.trim() || `Hoá đơn ${n + 1}`, (inv.totalAmount * mine) / equal.length, payer)
          }
          return
        }
        for (const item of [...(itemsByInvoice.get(inv.id) ?? [])].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))) {
          const consumers = item.consumers.filter((c) => inSession.has(c.memberId) && c.shares > 0)
          const totalShares = consumers.reduce((sum, c) => sum + c.shares, 0)
          if (totalShares === 0) continue
          for (const payer of payers) {
            const mine = consumers.filter((c) => payer.memberIds.includes(c.memberId)).reduce((sum, c) => sum + c.shares, 0)
            if (mine > 0) push(item.name, (item.finalAmount * mine) / totalShares, payer)
          }
        }
      })
      return { name: session.name, lines }
    })
}

/** R-2: nén JSON bằng lz-string theo bảng ký tự an toàn cho URL. */
export function encodeSnapshotPayload(payload: MealSnapshotPayload): string {
  return toUrlSafe(LZString.compressToEncodedURIComponent(JSON.stringify(payload)))
}

/**
 * Định dạng gọn (v2) chỉ chứa các khoản chuyển tiền — đủ dựng slide + QR, bỏ hoá đơn/món/thành viên.
 * JSON dạng mảng, không có tên trường: `[tiêu đề, [tên...], [[bin, số TK, tên TK, tên NH?]...], [[từ, đến, số tiền, tk, nội dung?]...]]`.
 * Nội dung chuyển khoản mặc định và tên ngân hàng (tra theo BIN) được suy ra lại khi giải mã nên không lưu.
 */
/**
 * Tuỳ chọn `shares` thêm phần tử thứ 5: `[[tên kèo, [[tên món, số tiền phần của người chuyển, người chuyển]...]]...]`
 * (người chuyển là chỉ số trong bảng tên, trùng với `fromId` của khoản chuyển tiền).
 */
export function encodeCompactSnapshot(title: string, payments: ReadonlyArray<SnapshotPayment>, shares?: ReadonlyArray<ItemSharesInput>): string {
  const names: string[] = []
  const nameIdx = new Map<string, number>()
  const person = (id: string, name: string) => {
    let i = nameIdx.get(id)
    if (i === undefined) {
      i = names.push(name) - 1
      nameIdx.set(id, i)
    }
    return i
  }
  const accounts: string[][] = []
  const accountIdx = new Map<string, number>()
  const account = (b: BankAccount) => {
    const k = `${b.bankBin}|${b.accountNumber}|${b.accountName}`
    let i = accountIdx.get(k)
    if (i === undefined) {
      const known = findBankByBin(b.bankBin)?.name === b.bankName
      i = accounts.push(known ? [b.bankBin, b.accountNumber, b.accountName] : [b.bankBin, b.accountNumber, b.accountName, b.bankName]) - 1
      accountIdx.set(k, i)
    }
    return i
  }
  const rows = payments.map((p) => {
    const row: Array<number | string> = [person(p.fromId, p.fromName), person(p.toId, p.toName), p.amount, p.bank ? account(p.bank) : -1]
    if (p.content !== buildTransferContent(p.fromName, title)) row.push(p.content)
    return row
  })
  const tuple: unknown[] = [title, names, accounts, rows]
  const keos = (shares ?? []).filter((k) => k.lines.length > 0)
  if (keos.length > 0) tuple.push(keos.map((k) => [k.name, k.lines.map((l) => [l.name, l.amount, person(l.ownerId, l.ownerName)])]))
  return toUrlSafe(LZString.compressToEncodedURIComponent(JSON.stringify(tuple)))
}

export interface ItemSharesInput {
  name: string
  lines: Array<{ name: string; amount: number; ownerId: string; ownerName: string }>
}

function decodeItemShares(raw: unknown, nameAt: (i: unknown) => string): SnapshotKeoShares[] {
  return asArray(raw).map((k) => {
    const [name, lines] = asArray(k)
    return {
      name: asString(name),
      lines: asArray(lines).map((l) => {
        const [itemName, amount, owner] = asArray(l)
        nameAt(owner)
        return { name: asString(itemName), amount: asNumber(amount), ownerId: `p${asNumber(owner)}` }
      }),
    }
  })
}

function decodeCompactSnapshot(raw: unknown[]): MealSnapshotPayload {
  const [title, names, accounts, rows, keos] = raw
  const title_ = asString(title)
  const nameList = asArray(names).map(asString)
  const bankList = asArray(accounts).map((a) => {
    const t = asArray(a)
    const bankBin = asString(t[0])
    const bank = parseBank({ bankBin, bankName: t[3] ?? findBankByBin(bankBin)?.name ?? bankBin, accountNumber: t[1], accountName: t[2] })
    if (!bank) throw invalidSnapshot()
    return bank
  })
  const nameAt = (i: unknown) => {
    const n = nameList[asNumber(i)]
    if (n === undefined) throw invalidSnapshot()
    return n
  }
  const payments = asArray(rows).map<SnapshotPayment>((r) => {
    const t = asArray(r)
    const bank = bankList[asNumber(t[3])]
    const fromName = nameAt(t[0])
    return {
      key: `${asNumber(t[0])}->${asNumber(t[1])}`,
      fromId: `p${asNumber(t[0])}`,
      fromName,
      toId: `p${asNumber(t[1])}`,
      toName: nameAt(t[1]),
      amount: asNumber(t[2]),
      content: isString(t[4]) ? t[4] : buildTransferContent(fromName, title_),
      ...(bank ? { bank } : {}),
    }
  })
  return {
    v: 1,
    exportedAt: '',
    meal: { title: title_, date: '', status: 'ACTIVE', settlementMode: 'SELF_SETTLEMENT', hostMemberId: '' },
    members: [],
    paymentGroups: [],
    sessions: [],
    settlementStatuses: {},
    payments,
    ...(keos === undefined ? {} : { itemShares: decodeItemShares(keos, nameAt) }),
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isString = (v: unknown): v is string => typeof v === 'string'
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const asArray = (v: unknown): unknown[] => {
  if (!Array.isArray(v)) throw invalidSnapshot()
  return v
}
const asString = (v: unknown): string => {
  if (!isString(v)) throw invalidSnapshot()
  return v
}
const asNumber = (v: unknown, fallback?: number): number => {
  if (isNumber(v)) return v
  if (fallback !== undefined && v === undefined) return fallback
  throw invalidSnapshot()
}
function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback?: T): T {
  if (fallback !== undefined && v === undefined) return fallback
  if (typeof v === 'string' && (allowed as readonly string[]).includes(v)) return v as T
  throw invalidSnapshot()
}

const ADJUSTMENT_MODES: readonly AdjustmentMode[] = ['NONE', 'PERCENTAGE', 'FIXED_AMOUNT']
const INPUT_MODES: readonly InvoiceInputMode[] = ['ITEMIZED', 'TOTAL_ONLY']
const SPLIT_TYPES: readonly InvoiceSplitType[] = ['BY_ITEM', 'EQUAL_TOTAL']
const MEAL_STATUSES: readonly MealStatus[] = ['ACTIVE', 'ARCHIVED']
const SETTLEMENT_MODES: readonly SettlementMode[] = ['SELF_SETTLEMENT', 'HOST_MEDIATED']

/** Tài khoản ngân hàng tuỳ chọn: sai cấu trúc thì bỏ qua (không làm hỏng cả snapshot). */
function parseBank(raw: unknown): BankAccount | undefined {
  if (!isRecord(raw)) return undefined
  const { bankBin, bankName, accountName, accountNumber } = raw
  if (!isString(bankBin) || !isString(bankName) || !isString(accountName) || !isString(accountNumber)) return undefined
  if (!/^\d{6}$/.test(bankBin) || accountNumber === '') return undefined
  return { bankBin, bankName, accountName, accountNumber }
}

function parsePayment(raw: unknown): SnapshotPayment {
  if (!isRecord(raw)) throw invalidSnapshot()
  const bank = parseBank(raw.bank)
  return {
    key: asString(raw.key),
    fromId: asString(raw.fromId),
    fromName: asString(raw.fromName),
    toId: asString(raw.toId),
    toName: asString(raw.toName),
    amount: asNumber(raw.amount),
    content: asString(raw.content),
    ...(bank ? { bank } : {}),
  }
}

function parseConsumers(raw: unknown): ItemShare[] {
  return asArray(raw).map((c) => {
    if (!isRecord(c)) throw invalidSnapshot()
    return { memberId: asString(c.memberId), shares: asNumber(c.shares) }
  })
}

/**
 * Giải nén và kiểm tra cấu trúc (R-2, BR-8.4). Trường tuỳ chọn thiếu được gán mặc định an toàn
 * (ví dụ `discountMode` = 'NONE') để không báo lỗi giả. Ném `INVALID_SNAPSHOT` nếu hỏng.
 */
export function decodeSnapshotPayload(encoded: string): MealSnapshotPayload {
  if (!encoded || encoded.trim() === '') throw invalidSnapshot()
  let json: string | null
  try {
    json = LZString.decompressFromEncodedURIComponent(fromUrlSafe(encoded.trim()))
  } catch {
    throw invalidSnapshot()
  }
  if (!json) throw invalidSnapshot()

  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    throw invalidSnapshot()
  }
  if (Array.isArray(raw)) return decodeCompactSnapshot(raw)
  if (!isRecord(raw) || raw.v !== 1) throw invalidSnapshot()

  const meal = raw.meal
  if (!isRecord(meal)) throw invalidSnapshot()

  const members = asArray(raw.members).map((m) => {
    if (!isRecord(m)) throw invalidSnapshot()
    return {
      id: asString(m.id),
      name: asString(m.name),
      avatarColor: isString(m.avatarColor) ? m.avatarColor : DEFAULT_AVATAR,
      ...(parseBank(m.bank) ? { bank: parseBank(m.bank) } : {}),
    }
  })

  const paymentGroups = asArray(raw.paymentGroups ?? []).map((g) => {
    if (!isRecord(g)) throw invalidSnapshot()
    return {
      id: asString(g.id),
      name: asString(g.name),
      memberIds: asArray(g.memberIds).map(asString),
      representativeId: isString(g.representativeId) ? g.representativeId : undefined,
    }
  })

  const sessions = asArray(raw.sessions).map((s) => {
    if (!isRecord(s)) throw invalidSnapshot()
    const invoices = asArray(s.invoices).map((inv) => {
      if (!isRecord(inv)) throw invalidSnapshot()
      const items = asArray(inv.items).map((it) => {
        if (!isRecord(it)) throw invalidSnapshot()
        return {
          name: asString(it.name),
          quantity: asNumber(it.quantity),
          unitPrice: asNumber(it.unitPrice),
          rawAmount: asNumber(it.rawAmount),
          allocatedDiscountAmount: asNumber(it.allocatedDiscountAmount, 0),
          allocatedServiceAmount: asNumber(it.allocatedServiceAmount, 0),
          allocatedVatAmount: asNumber(it.allocatedVatAmount, 0),
          finalAmount: asNumber(it.finalAmount),
          orderIndex: isNumber(it.orderIndex) ? it.orderIndex : undefined,
          consumers: parseConsumers(it.consumers ?? []),
        }
      })
      return {
        id: asString(inv.id),
        vendorName: isString(inv.vendorName) ? inv.vendorName : undefined,
        invoiceDate: isString(inv.invoiceDate) ? inv.invoiceDate : undefined,
        payerMemberId: asString(inv.payerMemberId),
        inputMode: oneOf(inv.inputMode, INPUT_MODES),
        splitType: oneOf(inv.splitType, SPLIT_TYPES, 'EQUAL_TOTAL'),
        equalSplitParticipantIds: asArray(inv.equalSplitParticipantIds ?? []).map(asString),
        subtotalAmount: asNumber(inv.subtotalAmount),
        discountMode: oneOf(inv.discountMode, ADJUSTMENT_MODES, 'NONE'),
        discountValue: asNumber(inv.discountValue, 0),
        discountAmount: asNumber(inv.discountAmount, 0),
        serviceMode: oneOf(inv.serviceMode, ADJUSTMENT_MODES, 'NONE'),
        serviceValue: asNumber(inv.serviceValue, 0),
        serviceAmount: asNumber(inv.serviceAmount, 0),
        vatMode: oneOf<VatMode>(inv.vatMode, ADJUSTMENT_MODES, 'NONE'),
        vatValue: asNumber(inv.vatValue, 0),
        vatAmount: asNumber(inv.vatAmount, 0),
        totalAmount: asNumber(inv.totalAmount),
        items,
      }
    })
    return {
      id: asString(s.id),
      name: asString(s.name),
      orderIndex: asNumber(s.orderIndex),
      participantIds: asArray(s.participantIds).map(asString),
      archivedTotalAmount: isNumber(s.archivedTotalAmount) ? s.archivedTotalAmount : undefined,
      archivedPayerSummary: Array.isArray(s.archivedPayerSummary)
        ? s.archivedPayerSummary.map((p) => {
            if (!isRecord(p)) throw invalidSnapshot()
            return { memberId: asString(p.memberId), paidAmount: asNumber(p.paidAmount) }
          })
        : undefined,
      invoices,
    }
  })

  const settlementStatuses = isRecord(raw.settlementStatuses) ? raw.settlementStatuses : {}
  for (const status of Object.values(settlementStatuses)) {
    if (!isRecord(status) || typeof status.isPaid !== 'boolean') throw invalidSnapshot()
  }

  const payments = raw.payments === undefined ? undefined : asArray(raw.payments).map(parsePayment)

  return {
    v: 1,
    exportedAt: asString(raw.exportedAt),
    meal: {
      title: asString(meal.title),
      date: asString(meal.date),
      note: isString(meal.note) ? meal.note : undefined,
      status: oneOf(meal.status, MEAL_STATUSES),
      settlementMode: oneOf(meal.settlementMode, SETTLEMENT_MODES),
      hostMemberId: asString(meal.hostMemberId),
    },
    members,
    paymentGroups,
    sessions,
    settlementStatuses: settlementStatuses as MealSnapshotPayload['settlementStatuses'],
    archivedSummary: isRecord(raw.archivedSummary) ? (raw.archivedSummary as unknown as ArchivedMealSummary) : undefined,
    ...(payments ? { payments } : {}),
  }
}

/** Đường dẫn Custom URL đầy đủ có `?s=<encoded>`; chuỗi đã URL-safe nên không cần escape thêm (R-2). */
export function buildSnapshotUrl(
  payload: MealSnapshotPayload | string,
  baseLocation: Pick<Location, 'origin' | 'pathname'> = window.location,
): string {
  const encoded = typeof payload === 'string' ? payload : encodeSnapshotPayload(payload)
  return `${baseLocation.origin}${baseLocation.pathname}?${SNAPSHOT_PARAM}=${encoded}`
}

/** Dựng dữ liệu trong bộ nhớ từ payload để chạy lại `computeMealSettlement` (Epic 6) mà không chạm IndexedDB. */
export function hydrateSnapshotForSettlement(payload: MealSnapshotPayload): SettlementEngineInput {
  const at = payload.exportedAt
  const memberIds = [...new Set([...payload.members.map((m) => m.id), ...payload.sessions.flatMap((s) => s.participantIds)])]

  const meal: Meal = {
    id: SNAPSHOT_MEAL_ID,
    title: payload.meal.title,
    date: payload.meal.date,
    note: payload.meal.note,
    status: payload.meal.status,
    participantIds: memberIds,
    hostMemberId: payload.meal.hostMemberId,
    settlementMode: payload.meal.settlementMode,
    paymentGroups: payload.paymentGroups.map<PaymentGroup>((g) => ({
      id: g.id,
      mealId: SNAPSHOT_MEAL_ID,
      name: g.name,
      memberIds: g.memberIds,
      representativeId: g.representativeId,
    })),
    settlementStatuses: payload.settlementStatuses,
    archivedSummary: payload.archivedSummary,
    createdAt: at,
    updatedAt: at,
  }

  const members: Member[] = payload.members.map((m) => ({
    id: m.id,
    name: m.name,
    normalizedName: m.name.toLowerCase(),
    avatarColor: m.avatarColor,
    bank: m.bank,
    createdAt: at,
    lastUsedAt: at,
  }))

  const sessions: SessionKeo[] = payload.sessions.map((s) => ({
    id: s.id,
    mealId: SNAPSHOT_MEAL_ID,
    name: s.name,
    orderIndex: s.orderIndex,
    participantIds: s.participantIds,
    archivedTotalAmount: s.archivedTotalAmount,
    archivedPayerSummary: s.archivedPayerSummary,
    createdAt: at,
  }))

  const invoices: Invoice[] = []
  const items: InvoiceItem[] = []
  for (const s of payload.sessions) {
    for (const inv of s.invoices) {
      invoices.push({
        id: inv.id,
        mealId: SNAPSHOT_MEAL_ID,
        sessionId: s.id,
        vendorName: inv.vendorName,
        invoiceDate: inv.invoiceDate,
        payerMemberId: inv.payerMemberId,
        inputMode: inv.inputMode,
        splitType: inv.splitType,
        equalSplitParticipantIds: inv.equalSplitParticipantIds,
        subtotalAmount: inv.subtotalAmount,
        discountMode: inv.discountMode,
        discountValue: inv.discountValue,
        discountAmount: inv.discountAmount,
        serviceMode: inv.serviceMode,
        serviceValue: inv.serviceValue,
        serviceAmount: inv.serviceAmount,
        vatMode: inv.vatMode,
        vatValue: inv.vatValue,
        vatAmount: inv.vatAmount,
        totalAmount: inv.totalAmount,
        fileIds: [],
        createdAt: at,
      })
      inv.items.forEach((it, index) => {
        items.push({
          id: `${inv.id}-${index}`,
          mealId: SNAPSHOT_MEAL_ID,
          sessionId: s.id,
          invoiceId: inv.id,
          name: it.name,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          rawAmount: it.rawAmount,
          allocatedDiscountAmount: it.allocatedDiscountAmount,
          allocatedServiceAmount: it.allocatedServiceAmount,
          allocatedVatAmount: it.allocatedVatAmount,
          finalAmount: it.finalAmount,
          orderIndex: it.orderIndex ?? index,
          consumers: it.consumers,
        })
      })
    }
  }

  return { meal, members, sessions, invoices, items }
}

/** R-3: tên thực thể trong tin nhắn — cá nhân là tên; nhóm là các thành viên nối bằng " + ". */
export function formatEntityShareLabel(
  entity: Pick<PaymentEntitySettlement, 'entityName' | 'isGroup' | 'memberNames'>,
): string {
  if (entity.isGroup && entity.memberNames.length > 0) return entity.memberNames.join(' + ')
  return entity.entityName
}

/**
 * R-3 (cuối): khi chế độ nhờ chủ trì và nhóm chứa chủ trì nhận tiền, hiển thị đúng tên cá nhân chủ trì.
 * Trả về map entityId → tên hiển thị người nhận.
 */
export function hostRecipientLabels(
  entities: ReadonlyArray<Pick<PaymentEntitySettlement, 'entityId' | 'isGroup' | 'memberIds'>>,
  hostMemberId: string,
  nameById: ReadonlyMap<string, string>,
): Record<string, string> {
  const host = entities.find((e) => e.isGroup && e.memberIds.includes(hostMemberId))
  if (!host) return {}
  return { [host.entityId]: nameById.get(hostMemberId) ?? 'Chủ trì' }
}

export interface FormatShareMessageInput {
  mealTitle: string;
  entities: ReadonlyArray<PaymentEntitySettlement>;
  transfers: ReadonlyArray<SettlementTransfer>;
  snapshotUrl: string;
  /** Nếu true, bỏ qua các khoản chuyển đã được tick xong (R-4). */
  onlyUnpaid?: boolean;
  /** Tên người nhận hiển thị theo entityId (R-3). */
  recipientLabelByEntityId?: Record<string, string>;
  /** Chỉ liệt kê khoản chuyển của các thực thể này (gửi cho một số người); bỏ trống → tất cả. */
  onlyEntityIds?: ReadonlyArray<string>;
}

/**
 * Bản tin thông báo thanh toán (BR-8.5, R-4):
 * `<Tên bữa>` / `- <Cá nhân>: chuyển cho <người nhận> <số tiền>, ...` / `<Link snapshot>`.
 */
export function formatShareMessage(input: FormatShareMessageInput): string {
  const { mealTitle, entities, transfers, snapshotUrl, onlyUnpaid = false, recipientLabelByEntityId = {}, onlyEntityIds } = input
  const entityById = new Map(entities.map((e) => [e.entityId, e] as const))
  const recipientLabel = (t: SettlementTransfer) => {
    const override = recipientLabelByEntityId[t.toEntityId]
    if (override) return override
    const target = entityById.get(t.toEntityId)
    return target ? formatEntityShareLabel(target) : t.toEntityName
  }

  const lines: string[] = [mealTitle.trim()]
  for (const entity of entities) {
    if (onlyEntityIds && !onlyEntityIds.includes(entity.entityId)) continue
    const outgoing = transfers.filter(
      (t) => t.fromEntityId === entity.entityId && t.amount > 0 && !(onlyUnpaid && t.isPaid),
    )
    if (outgoing.length === 0) continue
    const debts = outgoing.map((t) => `chuyển cho ${recipientLabel(t)} ${formatMoney(t.amount)}`)
    lines.push(`- ${formatEntityShareLabel(entity)}: ${debts.join(', ')}`)
  }
  if (lines.length === 1) lines.push('- Tất cả các khoản thanh toán đã hoàn tất.')
  lines.push(snapshotUrl)
  return lines.join('\n')
}
