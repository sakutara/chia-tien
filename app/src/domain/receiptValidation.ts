import { formatMoney } from '../lib/money'
import { fold } from '../lib/textFold'
import { computeAdjustment, computeBill, type Adjustment } from './billMath'
import { trailingAmounts, type ParsedAdjustment, type ParsedItem, type ParsedReceipt } from './receiptParser'

/*
 * Kiểm tra kết quả OCR trước khi điền vào danh sách món (BR-4.8). Hàm thuần.
 * 1. Từng dòng: thành tiền phải bằng số lượng × đơn giá.
 * 2. Cả bill: tổng các món (trừ giảm giá, cộng phí phục vụ, VAT) phải bằng tổng ghi trên bill, và tổng các món phải
 *    bằng dòng "Tổng tiền hàng" nếu bill có.
 * Không khớp thì thử lần lượt các kịch bản khác từ cùng văn bản OCR, kịch bản ít thay đổi nhất được ưu tiên:
 * sửa số lượng / đơn giá / thành tiền của dòng, bỏ dòng thực ra là dòng tổng, đổi hoặc thêm giảm giá / phí phục vụ /
 * VAT, và đổi cách tính (phí phục vụ trên tiền hàng trước giảm giá, VAT chỉ trên tiền hàng, giảm giá sau cùng).
 * Không kịch bản nào khớp thì giữ nguyên số đọc được và báo người dùng sửa tay: không đoán.
 */

export type ReceiptCheckStatus =
  /** Đọc được đúng ngay từ đầu: tổng các món khớp bill. */
  | 'OK'
  /** Khớp sau khi sửa theo một kịch bản khác; `notes` nói đã sửa gì. */
  | 'CORRECTED'
  /** Đã thử mọi kịch bản mà vẫn lệch: người dùng chỉnh tay. */
  | 'MISMATCH'
  /** Bill không có dòng tổng để đối chiếu. */
  | 'UNVERIFIED'

export interface ReceiptCheck {
  status: ReceiptCheckStatus
  /** Kết quả đã sửa (CORRECTED) hoặc nguyên bản đã đánh dấu dòng nghi ngờ. */
  receipt: ParsedReceipt
  /** Thông báo cho người dùng, mỗi dòng một ý. */
  notes: string[]
}

// ---------------------------------------------------------------------------
// 1. Kiểm tra từng dòng
// ---------------------------------------------------------------------------

export interface RowCandidate {
  quantity: number
  unitPrice: number
  rawAmount: number
  /** Số bước thay đổi so với số đọc được: dòng đã khớp (0) < sửa một số (1) < giữ dòng lệch (2). */
  cost: number
  /** Mô tả thay đổi, rỗng nếu là số đọc được. */
  change: string
}

export function isRowConsistent(item: Pick<ParsedItem, 'quantity' | 'unitPrice' | 'rawAmount'>): boolean {
  return item.quantity * item.unitPrice === item.rawAmount
}

const isPositiveInt = (n: number): boolean => Number.isSafeInteger(n) && n >= 1

/**
 * Các cách đọc khác của một dòng sao cho SL × đơn giá = thành tiền, chỉ sửa MỘT trong ba số
 * (OCR hiếm khi hỏng hai số cùng lúc trên một dòng). Dòng đã khớp chỉ có đúng một cách: giữ nguyên.
 */
export function rowCandidates(item: ParsedItem): RowCandidate[] {
  const { quantity: q, unitPrice: u, rawAmount: a } = item
  if (isRowConsistent(item)) return [{ quantity: q, unitPrice: u, rawAmount: a, cost: 0, change: '' }]

  const out: RowCandidate[] = [{ quantity: q, unitPrice: u, rawAmount: a, cost: 2, change: '' }]
  const add = (c: RowCandidate): void => {
    if (!out.some((o) => o.quantity === c.quantity && o.unitPrice === c.unitPrice && o.rawAmount === c.rawAmount)) out.push(c)
  }
  if (isPositiveInt(q) && q * u > 0) {
    add({ quantity: q, unitPrice: u, rawAmount: q * u, cost: 1, change: `thành tiền ${formatMoney(a)} → ${formatMoney(q * u)}` })
  }
  if (u > 0 && a % u === 0 && isPositiveInt(a / u) && a / u <= 999) {
    add({ quantity: a / u, unitPrice: u, rawAmount: a, cost: 1, change: `số lượng ${q} → ${a / u}` })
  }
  if (isPositiveInt(q) && a % q === 0 && a / q > 0) {
    add({ quantity: q, unitPrice: a / q, rawAmount: a, cost: 1, change: `đơn giá ${formatMoney(u)} → ${formatMoney(a / q)}` })
  }
  return out
}

/** Mô tả các dòng lệch (SL × đơn giá ≠ thành tiền) để báo người dùng. */
export function describeInconsistentRows(items: ParsedItem[]): string[] {
  return items
    .filter((item) => !isRowConsistent(item))
    .map(
      (item) =>
        `"${item.name}": ${item.quantity} × ${formatMoney(item.unitPrice)} = ${formatMoney(item.quantity * item.unitPrice)}, nhưng bill ghi thành tiền ${formatMoney(item.rawAmount)}.`,
    )
}

// ---------------------------------------------------------------------------
// 2. Cách tính tổng
// ---------------------------------------------------------------------------

type Method = 'STANDARD' | 'SERVICE_ON_GROSS' | 'VAT_ON_NET' | 'DISCOUNT_LAST'

const METHOD_NOTE: Record<Method, string> = {
  STANDARD: '',
  SERVICE_ON_GROSS: 'Bill tính phí phục vụ trên tiền hàng trước giảm giá',
  VAT_ON_NET: 'Bill tính VAT chỉ trên tiền hàng (không tính trên phí phục vụ)',
  DISCOUNT_LAST: 'Bill trừ giảm giá sau khi đã cộng phí phục vụ và VAT',
}

const METHODS: Method[] = ['STANDARD', 'SERVICE_ON_GROSS', 'VAT_ON_NET', 'DISCOUNT_LAST']

interface Amounts {
  discount: number
  service: number
  vat: number
  total: number
}

/** Tính các khoản theo một cách; trả `null` nếu số liệu vô lý (giảm giá lớn hơn tiền hàng, phần trăm sai). */
function computeBy(method: Method, subtotal: number, d: Adjustment, c: Adjustment, v: Adjustment): Amounts | null {
  try {
    if (method === 'STANDARD') {
      const bill = computeBill({ subtotal, discount: d, service: c, vat: v })
      return { discount: bill.discountAmount, service: bill.serviceAmount, vat: bill.vatAmount, total: bill.totalAmount }
    }
    if (method === 'SERVICE_ON_GROSS') {
      const discount = computeAdjustment(d, subtotal)
      if (discount > subtotal) return null
      const service = computeAdjustment(c, subtotal)
      const net = subtotal - discount
      const vat = computeAdjustment(v, net + service)
      return { discount, service, vat, total: net + service + vat }
    }
    if (method === 'VAT_ON_NET') {
      const discount = computeAdjustment(d, subtotal)
      if (discount > subtotal) return null
      const net = subtotal - discount
      const service = computeAdjustment(c, net)
      const vat = computeAdjustment(v, net)
      return { discount, service, vat, total: net + service + vat }
    }
    const service = computeAdjustment(c, subtotal)
    const vat = computeAdjustment(v, subtotal + service)
    const gross = subtotal + service + vat
    const discount = computeAdjustment(d, gross)
    if (discount > subtotal) return null
    return { discount, service, vat, total: gross - discount }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// 3. Kịch bản khoản điều chỉnh
// ---------------------------------------------------------------------------

type Kind = 'discount' | 'service' | 'vat'
const KIND_LABEL: Record<Kind, string> = { discount: 'giảm giá', service: 'phí phục vụ', vat: 'VAT' }
/** Mức phần trăm phổ biến, thử khi bill thiếu dòng hoặc OCR đọc sai số %. */
const COMMON_PERCENT: Record<Kind, number[]> = { discount: [], service: [5, 10, 15], vat: [8, 10] }

interface AdjustmentOption {
  value: ParsedAdjustment | undefined
  cost: number
  note: string
}

function sameAdjustment(a: ParsedAdjustment | undefined, b: ParsedAdjustment | undefined): boolean {
  return a?.mode === b?.mode && a?.value === b?.value
}

function adjustmentOptions(kind: Kind, parsed: ParsedAdjustment | undefined): AdjustmentOption[] {
  const label = KIND_LABEL[kind]
  const options: AdjustmentOption[] = [{ value: parsed, cost: 0, note: '' }]
  if (parsed) options.push({ value: undefined, cost: 2, note: `Bỏ ${label} đọc được (${describeAdjustment(parsed)}) vì không khớp tổng bill.` })
  for (const pct of COMMON_PERCENT[kind]) {
    const value: ParsedAdjustment = { mode: 'PERCENTAGE', value: pct }
    if (sameAdjustment(value, parsed)) continue
    options.push({
      value,
      cost: 3,
      note: parsed
        ? `Đổi ${label} ${describeAdjustment(parsed)} thành ${pct}%: chỉ khi đó tổng mới khớp bill.`
        : `Bill không đọc được dòng ${label}, nhưng tổng chỉ khớp khi có ${label} ${pct}%: đã thêm vào.`,
    })
  }
  return options
}

function describeAdjustment(adj: ParsedAdjustment): string {
  return adj.mode === 'PERCENTAGE' ? `${adj.value}%` : formatMoney(adj.value)
}

const asAdjustment = (adj: ParsedAdjustment | undefined): Adjustment => (adj ? { mode: adj.mode, value: adj.value } : { mode: 'NONE', value: 0 })
const fixed = (amount: number): ParsedAdjustment | undefined => (amount > 0 ? { mode: 'FIXED_AMOUNT', value: amount } : undefined)

// ---------------------------------------------------------------------------
// 4. Chọn dòng nghi là dòng tổng
// ---------------------------------------------------------------------------

const TOTAL_NAME_RE = /^\W*t[oe0]ng\b|\btotal\b|tien hang|tam tinh|thanh toan/

/** Dòng "món" có dấu hiệu là dòng tổng/tạm tính bị đọc nhầm: tên giống dòng tổng, hoặc số bằng tổng bill / tổng các món khác. */
function suspectRows(items: ParsedItem[], billTotal: number | undefined, billSubtotal: number | undefined): number[] {
  if (items.length < 2) return []
  const sum = items.reduce((s, i) => s + i.rawAmount, 0)
  return items.flatMap((item, index) => {
    const othersSum = sum - item.rawAmount
    const hit =
      TOTAL_NAME_RE.test(fold(item.name)) ||
      item.rawAmount === billTotal ||
      item.rawAmount === billSubtotal ||
      (items.length > 2 && item.rawAmount === othersSum)
    return hit ? [index] : []
  })
}

// ---------------------------------------------------------------------------
// 5. Tìm kịch bản khớp
// ---------------------------------------------------------------------------

/** Giữ tối đa chừng này tổng-tiền-hàng khác nhau khi thử các cách sửa dòng, để dòng nghi ngờ nhiều không làm chậm. */
const MAX_SUBTOTAL_STATES = 4000

interface SubtotalState {
  cost: number
  picks: number[]
}

/** Với mỗi tổng tiền hàng đạt được bằng cách chọn một cách đọc cho mỗi dòng, giữ cách ít thay đổi nhất. */
function reachableSubtotals(candidates: RowCandidate[][]): Map<number, SubtotalState> {
  let states = new Map<number, SubtotalState>([[0, { cost: 0, picks: [] }]])
  for (const options of candidates) {
    const next = new Map<number, SubtotalState>()
    for (const [sum, state] of states) {
      options.forEach((option, pick) => {
        const total = sum + option.rawAmount
        const cost = state.cost + option.cost
        const known = next.get(total)
        if (!known || cost < known.cost) next.set(total, { cost, picks: [...state.picks, pick] })
      })
    }
    states = next
    if (states.size > MAX_SUBTOTAL_STATES) {
      states = new Map([...states].sort((x, y) => x[1].cost - y[1].cost).slice(0, MAX_SUBTOTAL_STATES))
    }
  }
  return states
}

interface Scenario {
  cost: number
  removed: number | undefined
  picks: number[]
  kept: ParsedItem[]
  rowOptions: RowCandidate[][]
  discount: ParsedAdjustment | undefined
  service: ParsedAdjustment | undefined
  vat: ParsedAdjustment | undefined
  method: Method
  adjustmentNotes: string[]
}

function findScenario(parsed: ParsedReceipt, useSubtotal: boolean, billTotal: number | undefined, mustRemoveTotalRow = false): Scenario | null {
  const { billSubtotal: rawSubtotal } = parsed
  const billSubtotal = useSubtotal ? rawSubtotal : undefined
  let best: Scenario | null = null

  const suspects = suspectRows(parsed.items, billTotal, rawSubtotal)
  // Tổng đoán từ dòng cuối mà trùng số tiền của một món thì dòng đó chính là món bị đọc nhầm: bắt buộc bỏ nó khỏi danh sách,
  // nếu không thì món nào cũng "khớp" tổng một cách vô nghĩa.
  const removals: Array<number | undefined> = mustRemoveTotalRow
    ? suspects.filter((i) => parsed.items[i].rawAmount === billTotal)
    : [undefined, ...suspects]
  const discountOptions = adjustmentOptions('discount', parsed.discount)
  const serviceOptions = adjustmentOptions('service', parsed.service)
  const vatOptions = adjustmentOptions('vat', parsed.vat)

  for (const removed of removals) {
    const kept = parsed.items.filter((_, i) => i !== removed)
    if (kept.length === 0) continue
    const rowOptions = kept.map(rowCandidates)
    const reachable = reachableSubtotals(rowOptions)
    const removalCost = removed === undefined ? 0 : 2

    for (const [subtotal, state] of reachable) {
      if (billSubtotal !== undefined && subtotal !== billSubtotal) continue
      for (const d of discountOptions) {
        for (const c of serviceOptions) {
          for (const v of vatOptions) {
            const adjustmentCost = d.cost + c.cost + v.cost
            // Không có dòng tổng thanh toán thì chỉ so tiền hàng, không đổi khoản điều chỉnh.
            if (billTotal === undefined && adjustmentCost > 0) continue
            for (const method of METHODS) {
              const cost = state.cost + removalCost + adjustmentCost + (method === 'STANDARD' ? 0 : 1)
              if (best && cost >= best.cost) continue
              if (billTotal !== undefined) {
                const amounts = computeBy(method, subtotal, asAdjustment(d.value), asAdjustment(c.value), asAdjustment(v.value))
                if (!amounts || amounts.total !== billTotal) continue
              }
              best = {
                cost,
                removed,
                picks: state.picks,
                kept,
                rowOptions,
                discount: d.value,
                service: c.value,
                vat: v.value,
                method,
                adjustmentNotes: [d.note, c.note, v.note].filter((n) => n !== ''),
              }
            }
          }
        }
      }
    }
  }
  return best
}

/** Áp kịch bản khớp lên bill: dòng đã sửa, bỏ dòng tổng, khoản điều chỉnh; ghi chú những gì đã đổi. */
function applyScenario(parsed: ParsedReceipt, scenario: Scenario): { receipt: ParsedReceipt; notes: string[] } {
  const notes: string[] = []
  if (scenario.removed !== undefined) {
    const row = parsed.items[scenario.removed]
    notes.push(`Bỏ dòng "${row.name}" (${formatMoney(row.rawAmount)}) vì giống dòng tổng của bill, không phải một món.`)
  }

  const items = scenario.kept.map((item, i) => {
    const option = scenario.rowOptions[i][scenario.picks[i]]
    const changed = option.change !== ''
    if (changed) notes.push(`"${item.name}": sửa ${option.change} để SL × đơn giá = thành tiền.`)
    const consistent = option.quantity * option.unitPrice === option.rawAmount
    return {
      ...item,
      quantity: option.quantity,
      unitPrice: option.unitPrice,
      rawAmount: option.rawAmount,
      uncertain: changed || !consistent,
    }
  })

  const receipt: ParsedReceipt = { ...parsed, items }
  delete receipt.discount
  delete receipt.service
  delete receipt.vat
  notes.push(...scenario.adjustmentNotes)

  if (scenario.method === 'STANDARD') {
    if (scenario.discount) receipt.discount = scenario.discount
    if (scenario.service) receipt.service = scenario.service
    if (scenario.vat) receipt.vat = scenario.vat
  } else {
    // App tính giảm giá → phí phục vụ → VAT theo một thứ tự cố định (R-8): quy đổi sang số tiền cụ thể để tổng vẫn khớp bill.
    const subtotal = items.reduce((s, i) => s + i.rawAmount, 0)
    const amounts = computeBy(scenario.method, subtotal, asAdjustment(scenario.discount), asAdjustment(scenario.service), asAdjustment(scenario.vat))
    if (amounts) {
      const d = fixed(amounts.discount)
      const c = fixed(amounts.service)
      const v = fixed(amounts.vat)
      if (d) receipt.discount = d
      if (c) receipt.service = c
      if (v) receipt.vat = v
    }
    notes.push(`${METHOD_NOTE[scenario.method]}: đã đổi giảm giá, phí phục vụ, VAT sang số tiền cụ thể để tổng khớp bill.`)
  }
  return { receipt, notes }
}

const flagInconsistent = (items: ParsedItem[]): ParsedItem[] => items.map((i) => (isRowConsistent(i) ? i : { ...i, uncertain: true }))

/** Số dòng cuối bill được thử làm tổng khi không có hoặc không khớp dòng "Tổng cộng". */
const TRAILING_CANDIDATES = 3

interface Attempt {
  scenario: Scenario
  /** Tổng bill của lần thử này; `undefined` khi chỉ đối chiếu tiền hàng. */
  total: number | undefined
  /** Cộng vào chi phí kịch bản: tổng đọc từ chữ "Tổng cộng" tin hơn tổng đoán từ dòng cuối. */
  penalty: number
  fromTrailing: boolean
}

/**
 * Mọi cách chọn "tổng bill" để đối chiếu: dòng "Tổng cộng" đọc được, rồi các số ở dòng cuối bill (khả năng cao là tổng,
 * bất kể chữ "Tổng cộng" có đọc được hay không). Mỗi cách thử có và không có dòng "Tổng tiền hàng"; lấy kịch bản rẻ nhất.
 */
function findBestAttempt(parsed: ParsedReceipt, rawText: string | undefined): Attempt | null {
  const { billTotal, billSubtotal } = parsed
  const totals: Array<{ total: number | undefined; penalty: number; fromTrailing: boolean }> = []
  if (billTotal !== undefined) totals.push({ total: billTotal, penalty: 0, fromTrailing: false })
  else if (billSubtotal !== undefined) totals.push({ total: undefined, penalty: 0, fromTrailing: false })
  if (rawText !== undefined) {
    trailingAmounts(rawText, TRAILING_CANDIDATES).forEach((value, rank) => {
      if (value !== billTotal) totals.push({ total: value, penalty: 1 + rank, fromTrailing: true })
    })
  }

  let best: Attempt | null = null
  for (const t of totals) {
    for (const useSubtotal of billSubtotal !== undefined ? [true, false] : [false]) {
      if (t.total === undefined && !useSubtotal) continue
      const mustRemove = t.fromTrailing && parsed.items.some((i) => i.rawAmount === t.total)
      const scenario = findScenario(parsed, useSubtotal, t.total, mustRemove)
      if (!scenario) continue
      const penalty = t.penalty + (billSubtotal !== undefined && !useSubtotal ? 3 : 0)
      if (!best || scenario.cost + penalty < best.scenario.cost + best.penalty) best = { scenario, total: t.total, penalty, fromTrailing: t.fromTrailing }
    }
  }
  return best
}

/** Kiểm tra kết quả OCR của một bill; xem mô tả đầu tệp. `rawText` là văn bản OCR gốc, để thử dòng cuối làm tổng. */
export function validateReceipt(parsed: ParsedReceipt, rawText?: string): ReceiptCheck {
  const { billTotal, billSubtotal, items } = parsed
  const inconsistent = describeInconsistentRows(items)

  if (items.length === 0) return { status: 'UNVERIFIED', receipt: parsed, notes: [] }

  const attempt = findBestAttempt(parsed, rawText)

  if (!attempt && billTotal === undefined && billSubtotal === undefined) {
    const last = rawText === undefined ? [] : trailingAmounts(rawText, 1)
    const notes = [
      last.length > 0
        ? `Không đọc được dòng "Tổng cộng", và số ở cuối bill (${formatMoney(last[0])}) không khớp tổng các món theo cách nào đã thử. Hãy tự so với ảnh bill.`
        : 'Bill không có dòng tổng nên chưa đối chiếu được tổng tiền. Hãy tự so với ảnh bill.',
    ]
    if (inconsistent.length > 0) notes.push('Các dòng có SL × đơn giá không bằng thành tiền, cần xem lại:', ...inconsistent)
    return { status: 'UNVERIFIED', receipt: { ...parsed, items: flagInconsistent(items) }, notes }
  }

  const scenario = attempt?.scenario
  if (scenario) {
    const applied = applyScenario(parsed, scenario)
    const { receipt } = applied
    const changes = applied.notes
    const notes = [...changes]
    if (attempt.fromTrailing && attempt.total !== undefined) {
      receipt.billTotal = attempt.total
      notes.unshift(
        billTotal === undefined
          ? `Không đọc được dòng "Tổng cộng"; số ở cuối bill ${formatMoney(attempt.total)} khớp tổng tính được nên được dùng làm tổng bill.`
          : `Tổng "${formatMoney(billTotal)}" đọc được không khớp; số ở cuối bill ${formatMoney(attempt.total)} khớp tổng tính được nên được dùng làm tổng bill.`,
      )
    }
    if (changes.length === 0) {
      // Khớp ngay từ số đọc được; dòng lệch (nếu có) được giữ vì tổng đã xác nhận số tiền.
      return {
        status: 'OK',
        receipt: { ...receipt, items: flagInconsistent(receipt.items) },
        notes: [...(notes.length > 0 ? notes : ['Đã đối chiếu: tổng các món khớp tổng trên bill.']), ...inconsistent],
      }
    }
    return {
      status: 'CORRECTED',
      receipt,
      notes: ['Số đọc từ ảnh chưa khớp tổng bill, đã tự sửa theo kịch bản khớp nhất. Hãy xem lại các dòng được đánh dấu:', ...notes],
    }
  }

  const subtotal = items.reduce((s, i) => s + i.rawAmount, 0)
  const amounts = computeBy('STANDARD', subtotal, asAdjustment(parsed.discount), asAdjustment(parsed.service), asAdjustment(parsed.vat))
  const reading =
    billSubtotal !== undefined && subtotal !== billSubtotal
      ? `Tổng các món ${formatMoney(subtotal)} lệch dòng tiền hàng trên bill ${formatMoney(billSubtotal)}`
      : amounts && billTotal !== undefined
        ? `Tổng tính được ${formatMoney(amounts.total)} (sau giảm giá, phí phục vụ, VAT) lệch tổng trên bill ${formatMoney(billTotal)}`
        : 'Số đọc được không khớp tổng trên bill'
  const notes = [
    `${reading}. Đã thử các cách đọc khác (sửa SL, đơn giá, thành tiền; bỏ dòng tổng; đổi giảm giá, phí phục vụ, VAT và cách tính) nhưng không cách nào khớp. Hãy đối chiếu từng món với ảnh bill và chỉnh tay.`,
  ]
  if (inconsistent.length > 0) notes.push('Các dòng có SL × đơn giá không bằng thành tiền:', ...inconsistent)
  return { status: 'MISMATCH', receipt: { ...parsed, items: flagInconsistent(items) }, notes }
}
