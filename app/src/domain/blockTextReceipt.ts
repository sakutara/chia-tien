import { fold } from '../lib/textFold'

/*
 * Văn bản copy từ OCR/AI ngoài thường xuống dòng theo từng khối: mỗi ô của bảng (SL, ĐG, thành tiền, tên món) một dòng.
 * Hàm thuần này ghép lại thành từng dòng món "STT. Tên SL ĐG Thành tiền" để bộ phân tích có sẵn (`parseReceipt`) đọc như văn bản Tesseract.
 * Nguyên tắc: không đoán tên/giá; chỉ chọn lại SL theo thành tiền ÷ đơn giá khi ô SL lẻ loi bị đọc sai. Không nhận ra bố cục khối thì trả nguyên văn.
 */

const COLUMN_HEADERS = new Set(['sl', 'so luong', 'dg', 'don gia', 'thanh tien', 'ten mon', 'ten hang'])
const MONEY_CELL_RE = /^(\d{1,3}(?:[.,]\d{3})+|\d{4,8})\s*[dđĐ₫]?$/
const SMALL_CELL_RE = /^\d{1,2}(?:\s+\d{1,2})*$/
const NAME_LINE_RE = /^[\s|]*(\d{1,2})\s*[.)]?\s*(?=\p{L})/u
/** Dòng bắt đầu phần tổng cuối bill: hết bảng món. */
const END_RE = /tien hang|tong|thanh toan|con phai thu|tam tinh|total/
const MAX_QTY = 99

interface Row {
  stt: string
  name: string
  smalls: number[]
  moneys: number[]
}

function moneyOf(cell: string): number | null {
  const m = MONEY_CELL_RE.exec(cell)
  return m ? Number(m[1].replace(/[.,]/g, '')) : null
}

/** Dòng chỉ là tiêu đề cột (SL / ĐG / Thành tiền / Tên món). */
function isColumnHeader(line: string): boolean {
  return COLUMN_HEADERS.has(fold(line).replace(/[^a-z ]/g, '').trim())
}

function formatRow(row: Row): string {
  const { smalls, moneys } = row
  // Tên có thể kết thúc bằng số lượng (VD "Miso Soup 4"); bỏ đi khi trùng SL tính được.
  let qty = smalls[0] ?? 1
  let price: number | undefined
  let amount: number | undefined
  if (moneys.length >= 2) {
    price = Math.min(...moneys)
    amount = Math.max(...moneys)
    const ratio = amount / price
    // Ô SL lẻ loi hay bị đọc sai (7 thay vì 1): thành tiền ÷ đơn giá đáng tin hơn khi chia hết.
    if (Number.isInteger(ratio) && ratio >= 1 && ratio <= MAX_QTY) qty = ratio
  } else if (moneys.length === 1) {
    price = moneys[0]
    amount = qty * price
  }
  let name = row.name
  const tail = /^(.*\S)\s+(\d{1,2})$/.exec(name)
  if (tail && Number(tail[2]) === qty && qty > 1) name = tail[1]
  if (price === undefined || amount === undefined) return `${row.stt}. ${name}`
  return `${row.stt}. ${name}  ${qty}  ${price}  ${amount}`
}

/**
 * Phần tổng cũng bị tách khối: các nhãn ("Tiền hàng", "Tổng thanh toán") một nhóm dòng, các số tiền một nhóm dòng sau.
 * Ghép lại thành "Tiền hàng X" / "Tổng thanh toán Y" (Y lấy số cuối); không đúng dạng đó thì giữ nguyên.
 */
function reflowFooter(footer: string[]): string[] {
  const moneys: number[] = []
  const rest: string[] = []
  for (const line of footer) {
    const tokens = line.split(/\s+/)
    const values = tokens.map(moneyOf)
    if (values.every((v): v is number => v !== null)) moneys.push(...values)
    else rest.push(line)
  }
  const labels = fold(rest.join(' '))
  const hasSubtotal = /tien hang/.test(labels)
  const hasTotal = /thanh toan|con phai thu/.test(labels)
  if (moneys.length === 0 || (!hasSubtotal && !hasTotal)) return footer
  const out: string[] = []
  if (hasSubtotal) out.push(`Tiền hàng ${moneys[0]}`)
  if (hasTotal) out.push(`Tổng thanh toán ${moneys[moneys.length - 1]}`)
  return [...out, ...rest.filter((l) => !/tien hang|thanh toan|con phai thu/.test(fold(l)))]
}

export function reflowBlockText(text: string): string {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l !== '')
  const headerIdx = lines.map((l, i) => (isColumnHeader(l) ? i : -1)).filter((i) => i >= 0)
  if (new Set(headerIdx.map((i) => fold(lines[i]).replace(/[^a-z ]/g, '').trim())).size < 3) return text

  const start = headerIdx[headerIdx.length - 1] + 1
  const rows: Row[] = []
  let pending: Row = { stt: '', name: '', smalls: [], moneys: [] }
  let end = lines.length
  for (let i = start; i < lines.length; i++) {
    const line = lines[i]
    const nameMatch = NAME_LINE_RE.exec(line)
    if (nameMatch) {
      // Các ô số đứng TRƯỚC tên món (đúng thứ tự cột SL, ĐG, Thành tiền, Tên món) là của món đó.
      pending.stt = nameMatch[1]
      pending.name = line.slice(nameMatch[0].length).trim()
      rows.push(pending)
      pending = { stt: '', name: '', smalls: [], moneys: [] }
      continue
    }
    const money = moneyOf(line)
    if (money !== null) {
      pending.moneys.push(money)
      continue
    }
    if (SMALL_CELL_RE.test(line)) {
      pending.smalls.push(...line.split(/\s+/).map(Number))
      continue
    }
    if (END_RE.test(fold(line))) {
      end = i
      break
    }
    // Dòng chữ còn lại: phần tên món bị xuống dòng.
    const last = rows[rows.length - 1]
    if (last) last.name = `${last.name} ${line}`
  }

  // Ô số còn lại sau món cuối (trước dòng tổng) là của món cuối.
  const last = rows[rows.length - 1]
  if (last) {
    last.moneys.push(...pending.moneys)
    last.smalls.push(...pending.smalls)
  }
  if (rows.length === 0) return text

  return [...lines.slice(0, start), ...rows.map(formatRow), ...reflowFooter(lines.slice(end))].join('\n')
}
