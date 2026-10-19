import { deflateSync, inflateSync } from 'fflate'

/*
 * Mã hoá nhị phân (v3) cho link Snapshot gọn: số nguyên dạng varint, các chuỗi gom vào một bảng (mỗi chuỗi chỉ lưu một lần),
 * rồi nén deflate với từ điển dựng sẵn và đổi sang base64url. Link bắt đầu bằng `~` để phân biệt với link cũ (lz-string),
 * vốn không bao giờ chứa ký tự này. Hàm thuần: không đọc DB, không chạm DOM.
 */

/** `[tiêu đề, [tên...], [[bin, số TK, tên TK, tên NH?]...], [[từ, đến, số tiền, tk, nội dung?]...], kèo?]` — cùng dạng với JSON v2. */
export type CompactTuple = [
  title: string,
  names: string[],
  accounts: Array<[string, string, string] | [string, string, string, string]>,
  rows: Array<[number, number, number, number] | [number, number, number, number, string]>,
  keos?: Array<[string, Array<[string, number, number]>]>,
]

export const BINARY_PREFIX = '~'

/** Byte đầu: bit 0 = dữ liệu có nén deflate; các bit còn lại = phiên bản định dạng (nay là 1). */
const FORMAT_VERSION = 1
const FLAG_DEFLATED = 1

/*
 * Từ điển deflate: ĐÃ ĐÓNG BĂNG cho phiên bản định dạng 1 — đổi một byte là mọi link đã gửi không đọc được nữa.
 * Muốn đổi thì tăng FORMAT_VERSION và giữ từ điển cũ để giải mã. Thứ tự: phổ biến nhất để cuối (deflate khớp gần hơn rẻ hơn).
 */
const DICTIONARY = new TextEncoder().encode(
  [
    'Heineken Tiger Saigon Sài Gòn Bia Nước suối Nước ngọt Trà đá Trà sữa Cà phê Cơm Phở Bún Mì Hủ tiếu Bánh Gà Bò Heo Cá Tôm Mực Rau Đậu Trứng Khăn lạnh Lẩu thái hải sản Nướng Hoá đơn Phụ thu Kèo 1 Kèo 2 Kèo 3',
    'NGUYEN VAN TRAN THI LE PHAM HOANG HUYNH PHAN VU VO DANG BUI DO NGO DUONG LY',
    'VPBank TPBank Sacombank HDBank SeABank Techcombank Agribank VietinBank MB Bank ACB BIDV Vietcombank MoMo Timo',
    'thanh toan chuyen khoan Chuyển khoản',
  ].join(' '),
)

const invalid = () => new Error('INVALID_COMPACT_SNAPSHOT')

class Writer {
  private bytes: number[] = []
  varint(n: number): void {
    if (!Number.isSafeInteger(n) || n < 0) throw new RangeError('Không mã hoá được số này')
    let v = n
    while (v >= 128) {
      this.bytes.push((v % 128) | 128)
      v = Math.floor(v / 128)
    }
    this.bytes.push(v)
  }
  /** Ghi `n + 1`, còn `undefined`/-1 là 0, để giá trị tuỳ chọn tốn một byte khi vắng mặt. */
  optional(n: number | undefined): void {
    this.varint(n === undefined || n < 0 ? 0 : n + 1)
  }
  done(): number[] {
    return this.bytes
  }
}

class Reader {
  private pos = 0
  private readonly bytes: Uint8Array
  constructor(bytes: Uint8Array) {
    this.bytes = bytes
  }
  varint(): number {
    let result = 0
    let scale = 1
    for (;;) {
      if (this.pos >= this.bytes.length) throw invalid()
      const b = this.bytes[this.pos++]
      result += (b & 127) * scale
      if (!Number.isSafeInteger(result)) throw invalid()
      if (b < 128) return result
      scale *= 128
    }
  }
  /** Số lượng phần tử: không thể nhiều hơn số byte còn lại (chặn link hỏng đòi cấp phát khổng lồ). */
  count(): number {
    const n = this.varint()
    if (n > this.bytes.length - this.pos) throw invalid()
    return n
  }
  optional(): number {
    return this.varint() - 1
  }
  rest(): Uint8Array {
    const out = this.bytes.subarray(this.pos)
    this.pos = this.bytes.length
    return out
  }
  get atEnd(): boolean {
    return this.pos === this.bytes.length
  }
}

const toBase64Url = (bytes: Uint8Array): string => {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const fromBase64Url = (s: string): Uint8Array => {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) throw invalid()
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

/** Ném `RangeError` nếu có số không nguyên/âm hoặc mã BIN không đủ 6 chữ số; người gọi dùng định dạng JSON thay thế. */
export function encodeBinaryTuple(tuple: CompactTuple): string {
  const [title, names, accounts, rows, keos = []] = tuple
  const strings: string[] = []
  const stringIdx = new Map<string, number>()
  const str = (s: string) => {
    const clean = s.replace(/\0/g, ' ')
    let i = stringIdx.get(clean)
    if (i === undefined) {
      i = strings.push(clean) - 1
      stringIdx.set(clean, i)
    }
    return i
  }

  const body = new Writer()
  body.varint(str(title))
  body.varint(names.length)
  for (const n of names) body.varint(str(n))
  body.varint(accounts.length)
  for (const [bin, number, name, bankName] of accounts) {
    if (!/^\d{6}$/.test(bin)) throw new RangeError('BIN không hợp lệ')
    body.varint(Number(bin))
    body.varint(str(number))
    body.varint(str(name))
    body.optional(bankName === undefined ? undefined : str(bankName))
  }
  body.varint(rows.length)
  for (const [from, to, amount, account, content] of rows) {
    body.varint(from)
    body.varint(to)
    body.varint(amount)
    body.optional(account)
    body.optional(content === undefined ? undefined : str(content))
  }
  body.varint(keos.length)
  for (const [name, lines] of keos) {
    body.varint(str(name))
    body.varint(lines.length)
    for (const [itemName, amount, owner] of lines) {
      body.varint(str(itemName))
      body.varint(amount)
      body.varint(owner)
    }
  }

  const blob = new TextEncoder().encode(strings.join('\0'))
  const head = new Writer()
  head.varint(blob.length)
  const raw = Uint8Array.from([...head.done(), ...blob, ...body.done()])

  const deflated = deflateSync(raw, { level: 9, dictionary: DICTIONARY })
  const useDeflate = deflated.length < raw.length
  const payload = useDeflate ? deflated : raw
  const out = new Uint8Array(payload.length + 1)
  out[0] = (FORMAT_VERSION << 1) | (useDeflate ? FLAG_DEFLATED : 0)
  out.set(payload, 1)
  return BINARY_PREFIX + toBase64Url(out)
}

/** Ném `Error` thường nếu chuỗi hỏng/bị cắt; người gọi đổi thành lỗi INVALID_SNAPSHOT. */
export function decodeBinaryTuple(encoded: string): CompactTuple {
  if (!encoded.startsWith(BINARY_PREFIX)) throw invalid()
  const bytes = fromBase64Url(encoded.slice(BINARY_PREFIX.length))
  if (bytes.length < 2 || bytes[0] >> 1 !== FORMAT_VERSION) throw invalid()
  const payload = bytes.subarray(1)
  const raw = bytes[0] & FLAG_DEFLATED ? inflateSync(payload, { dictionary: DICTIONARY }) : payload

  const r = new Reader(raw)
  const blobLength = r.varint()
  const rest = r.rest()
  if (blobLength > rest.length) throw invalid()
  const strings = new TextDecoder('utf-8', { fatal: true }).decode(rest.subarray(0, blobLength)).split('\0')
  const body = new Reader(rest.subarray(blobLength))
  const str = (i: number) => {
    const s = strings[i]
    if (s === undefined) throw invalid()
    return s
  }

  const title = str(body.varint())
  const names = Array.from({ length: body.count() }, () => str(body.varint()))
  const accounts = Array.from({ length: body.count() }, (): CompactTuple[2][number] => {
    const bin = String(body.varint()).padStart(6, '0')
    const number = str(body.varint())
    const name = str(body.varint())
    const bankName = body.optional()
    return bankName < 0 ? [bin, number, name] : [bin, number, name, str(bankName)]
  })
  const rows = Array.from({ length: body.count() }, (): CompactTuple[3][number] => {
    const from = body.varint()
    const to = body.varint()
    const amount = body.varint()
    const account = body.optional()
    const content = body.optional()
    return content < 0 ? [from, to, amount, account] : [from, to, amount, account, str(content)]
  })
  const keos = Array.from({ length: body.count() }, (): [string, Array<[string, number, number]>] => {
    const name = str(body.varint())
    const lines = Array.from({ length: body.count() }, (): [string, number, number] => [str(body.varint()), body.varint(), body.varint()])
    return [name, lines]
  })
  if (!body.atEnd) throw invalid()
  return keos.length > 0 ? [title, names, accounts, rows, keos] : [title, names, accounts, rows]
}
