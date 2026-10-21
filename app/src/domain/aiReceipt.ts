import { formatMoney } from '../lib/money'
import { t } from '../i18n'
import { computeBill } from './billMath'
import type { ParsedReceipt } from './receiptParser'
import type { ReceiptCheck } from './receiptValidation'

/*
 * Đọc hoá đơn bằng AI (Gemini): lời nhắc kèm gợi ý từ OCR, lược đồ JSON trả về, đổi kết quả AI sang `ParsedReceipt`
 * và đối chiếu lại bằng phép tính của app (tổng các món − giảm giá + phí + VAT = tổng trên bill). Hàm thuần.
 */

/** Kết quả AI trả về, đúng theo `AI_RESPONSE_SCHEMA`. Số tiền là đồng, số nguyên. */
export interface AiReceipt {
  vendorName?: string | null
  invoiceDate?: string | null
  items?: Array<{ name?: string; quantity?: number; unitPrice?: number; amount?: number }> | null
  discountAmount?: number | null
  serviceAmount?: number | null
  vatAmount?: number | null
  subtotal?: number | null
  total?: number | null
  itemRowCount?: number | null
  vatIncludedInPrices?: boolean | null
  notes?: string | null
}

const INT = { type: 'INTEGER', nullable: true } as const

/** Lược đồ responseSchema của Gemini (OpenAPI rút gọn). */
export const AI_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    vendorName: { type: 'STRING', nullable: true },
    invoiceDate: { type: 'STRING', nullable: true },
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { name: { type: 'STRING' }, quantity: { type: 'INTEGER' }, unitPrice: { type: 'INTEGER' }, amount: { type: 'INTEGER' } },
        required: ['name', 'quantity', 'unitPrice', 'amount'],
      },
    },
    discountAmount: INT,
    serviceAmount: INT,
    vatAmount: INT,
    subtotal: INT,
    total: INT,
    itemRowCount: INT,
    vatIncludedInPrices: { type: 'BOOLEAN', nullable: true },
    notes: { type: 'STRING', nullable: true },
  },
  required: ['items', 'total', 'itemRowCount'],
} as const

export const AI_SYSTEM_PROMPT = `You read Vietnamese invoices and receipts (restaurant bills, Grab ride/food invoices, hotel VAT invoices "hoá đơn GTGT", e-invoices) from photos or PDF pages and return structured JSON.
Rules:
1. List EVERY goods/service row of the item table in "items". Missing a row is the worst mistake: count the rows (use the STT / No. column when there is one) and put that count in "itemRowCount". "items" must contain exactly itemRowCount entries.
2. Amounts are Vietnamese dong, integers: "1.234.000" or "1,234,000" is 1234000. Never output decimals.
3. For each row: quantity (default 1), unitPrice, amount = the row's line total as printed (quantity x unitPrice). If the invoice has both a before-tax and an after-tax amount column, use the column that adds up to the invoice's grand total, and say which one in "notes".
4. A row that is a discount (chiết khấu, giảm giá, khuyến mại, voucher, or a negative amount) is NOT an item: add its absolute value to "discountAmount". Service charge (phí phục vụ) rows printed as a surcharge go to "serviceAmount"; but "Phí dịch vụ" that is an ordinary goods/service row of the table (as on Grab invoices) stays an item.
5. VAT: if row amounts already include VAT (the grand total equals the sum of rows minus discounts), set "vatIncludedInPrices" true and "vatAmount" null. If VAT is added on top at the bottom of the invoice, put it in "vatAmount".
6. "total" is the final amount payable as printed. "subtotal" is the pre-discount goods total if printed.
7. CHECK YOUR WORK before answering: sum(items.amount) - discountAmount + serviceAmount + vatAmount must equal "total". If it does not, re-read the image, fix the misread number, and mention any remaining difference in "notes".
8. Use the OCR hints only as a guide for where the text is; the image is the truth. Do not invent rows or numbers that are not on the invoice. invoiceDate is YYYY-MM-DD (the invoice issue date), or null.`

/** Gợi ý OCR gửi kèm ảnh. */
export interface AiHints {
  ocrText: string
  parsed?: ParsedReceipt
  notes?: string[]
}

const MAX_HINT_CHARS = 6000

export function buildAiPrompt(hints: AiHints): string {
  const parts = ['Read the attached invoice image(s) and return the JSON described. All pages belong to ONE invoice.']
  const text = hints.ocrText.trim()
  if (text) parts.push(`OCR text of the pages (may contain errors, columns may be scrambled):\n"""\n${text.slice(0, MAX_HINT_CHARS)}\n"""`)
  const parsed = hints.parsed
  if (parsed && parsed.items.length > 0) {
    const rows = parsed.items.map((i) => `- ${i.name} | qty ${i.quantity} | unit ${i.unitPrice} | amount ${i.rawAmount}`).join('\n')
    parts.push(`Our OCR parser read these rows (may be incomplete or wrong):\n${rows}`)
    if (parsed.billTotal !== undefined) parts.push(`OCR parser total: ${parsed.billTotal}`)
  }
  if (parsed?.tableRows) parts.push(`The OCR counted ${parsed.tableRows.expected} numbered rows in the table and read ${parsed.tableRows.read}.`)
  if (hints.notes && hints.notes.length > 0) parts.push(`Problems our checker found in the OCR result:\n${hints.notes.map((n) => `- ${n}`).join('\n')}`)
  return parts.join('\n\n')
}

const asInt = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : undefined)
const positive = (v: unknown): number | undefined => {
  const n = asInt(v)
  return n !== undefined && n > 0 ? n : undefined
}

/** Đổi kết quả AI sang bill đã phân tích (giảm giá, phí, VAT là số tiền cụ thể). */
export function aiToParsedReceipt(ai: AiReceipt): ParsedReceipt {
  const items = (ai.items ?? []).flatMap((row) => {
    const name = (row.name ?? '').trim()
    const amount = asInt(row.amount)
    if (name === '' || amount === undefined || amount <= 0) return []
    const quantity = Math.max(1, asInt(row.quantity) ?? 1)
    const unitPrice = asInt(row.unitPrice) ?? Math.round(amount / quantity)
    return [{ name, quantity, unitPrice, rawAmount: amount, uncertain: quantity * unitPrice !== amount }]
  })
  const receipt: ParsedReceipt = { items }
  const vendor = ai.vendorName?.trim()
  if (vendor) receipt.vendorName = vendor
  if (ai.invoiceDate && /^\d{4}-\d{2}-\d{2}$/.test(ai.invoiceDate)) receipt.invoiceDate = ai.invoiceDate
  const discount = positive(ai.discountAmount)
  const service = positive(ai.serviceAmount)
  const vat = ai.vatIncludedInPrices ? undefined : positive(ai.vatAmount)
  if (discount) receipt.discount = { mode: 'FIXED_AMOUNT', value: discount }
  if (service) receipt.service = { mode: 'FIXED_AMOUNT', value: service }
  if (vat) receipt.vat = { mode: 'FIXED_AMOUNT', value: vat }
  const total = positive(ai.total)
  if (total) receipt.billTotal = total
  const subtotal = positive(ai.subtotal)
  if (subtotal && !ai.vatIncludedInPrices) receipt.billSubtotal = subtotal
  if (ai.vatIncludedInPrices) receipt.vatIncluded = true
  return receipt
}

export interface AiCheck {
  /** Tổng/Số dòng đã khớp với bill. */
  ok: boolean
  /** Phản hồi gửi lại cho AI để nó đọc lại khi chưa khớp; rỗng khi ok. */
  problems: string[]
  check: Pick<ReceiptCheck, 'status' | 'notes'>
}

/** Đối chiếu kết quả AI: số dòng khớp số AI đếm, tổng tính được khớp tổng trên bill. */
export function checkAiReceipt(ai: AiReceipt, receipt: ParsedReceipt): AiCheck {
  const problems: string[] = []
  const notes: string[] = [t('Đã đọc bằng AI (Gemini). Hãy xem lại các món so với ảnh.')]
  const expectedRows = asInt(ai.itemRowCount)
  if (expectedRows !== undefined && expectedRows !== receipt.items.length) {
    problems.push(`You reported itemRowCount=${expectedRows} but returned ${receipt.items.length} valid items. Return exactly one item per counted row.`)
    notes.push(t('AI đếm {expected} dòng nhưng trả về {read} món: có thể thiếu hoặc thừa món.', { expected: expectedRows, read: receipt.items.length }))
  }
  if (receipt.items.length === 0) {
    problems.push('No items were returned. List every row of the item table.')
    return { ok: false, problems, check: { status: 'UNVERIFIED', notes } }
  }
  const subtotal = receipt.items.reduce((s, i) => s + i.rawAmount, 0)
  if (receipt.billTotal === undefined) {
    notes.push(t('Bill không có tổng để đối chiếu. Hãy tự so với ảnh bill.'))
    return { ok: problems.length === 0, problems, check: { status: 'UNVERIFIED', notes } }
  }
  let computed: number | null = null
  try {
    computed = computeBill({
      subtotal,
      discount: receipt.discount ?? { mode: 'NONE', value: 0 },
      service: receipt.service ?? { mode: 'NONE', value: 0 },
      vat: receipt.vat ?? { mode: 'NONE', value: 0 },
    }).totalAmount
  } catch {
    computed = null
  }
  if (computed !== receipt.billTotal) {
    const shown = computed === null ? formatMoney(subtotal) : formatMoney(computed)
    problems.push(
      `The numbers do not add up: sum(items)=${subtotal}, discount=${receipt.discount?.value ?? 0}, service=${receipt.service?.value ?? 0}, vat=${receipt.vat?.value ?? 0} gives ${computed ?? 'invalid'} but total=${receipt.billTotal}. Re-read the image and fix the wrong number(s).`,
    )
    notes.push(t('Tổng AI đọc được lệch: các món cho {v} nhưng bill ghi {v2}. Hãy đối chiếu với ảnh.', { v: shown, v2: formatMoney(receipt.billTotal) }))
    return { ok: false, problems, check: { status: 'MISMATCH', notes } }
  }
  notes.push(t('Tổng các món khớp tổng trên bill ({v}).', { v: formatMoney(receipt.billTotal) }))
  const aiNote = ai.notes?.trim()
  if (aiNote) notes.push(t('AI ghi chú: {v}', { v: aiNote }))
  return { ok: problems.length === 0, problems, check: { status: problems.length === 0 ? 'OK' : 'MISMATCH', notes } }
}
