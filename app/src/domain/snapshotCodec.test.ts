// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { BINARY_PREFIX, decodeBinaryTuple, encodeBinaryTuple, type CompactTuple } from './snapshotCodec'

/** Bữa đầy đủ: có tên ngân hàng, có nội dung chuyển khoản, có kèo với món. */
const FULL: CompactTuple = [
  'Lẩu cuối tuần — Đặng Thị Ánh',
  ['An', 'Bình', 'Cường'],
  [['970422', '0123456789', 'NGUYEN VAN BINH', 'MB Bank']],
  [[0, 1, 150_000, 0, 'An chuyển Bình tiền lẩu']],
  [
    [
      'Kèo 1 - Lẩu',
      [
        ['Nồi lẩu thái', 120_000, 0],
        ['Bia Tiger', 45_000, 2],
      ],
    ],
  ],
]

/** Chuyển base64url về byte để kiểm tra/sửa phần đầu của link. */
const toBytes = (encoded: string) => Buffer.from(encoded.slice(BINARY_PREFIX.length), 'base64url')
const fromBytes = (bytes: Uint8Array) => BINARY_PREFIX + Buffer.from(bytes).toString('base64url')

describe('snapshotCodec - mã hoá và giải mã', () => {
  it('giải mã ra đúng dữ liệu khi có kèo, tên ngân hàng và nội dung chuyển khoản', () => {
    expect(decodeBinaryTuple(encodeBinaryTuple(FULL))).toEqual(FULL)
  })

  it('bữa không có kèo, tài khoản không có tên ngân hàng và khoản không có nội dung vẫn khôi phục đúng', () => {
    const plain: CompactTuple = ['Bữa đơn giản', ['An', 'Bình'], [['970436', '999888777', 'TRAN THI CUC']], [[0, 1, 90_000, 0]]]
    const decoded = decodeBinaryTuple(encodeBinaryTuple(plain))
    expect(decoded).toEqual(plain)
    expect(decoded).toHaveLength(4)
  })

  it('giữ nguyên tiếng Việt có dấu và ký tự đặc biệt', () => {
    const tuple: CompactTuple = [
      'Quán "Phở Bò" — Hoàng Đế ệ ự ỹ Đ',
      ['Nguyễn Ánh Tuyết', 'Lê Quang Đạt'],
      [['970415', '1234', 'LE QUANG DAT']],
      [[0, 1, 1, 0, 'Trả tiền ăn trưa & cà phê ☕']],
    ]
    expect(decodeBinaryTuple(encodeBinaryTuple(tuple))).toEqual(tuple)
  })

  it('chuỗi lặp lại nhiều lần vẫn khôi phục đúng', () => {
    const names = Array.from({ length: 60 }, (_, i) => (i % 2 === 0 ? 'An' : 'Bình'))
    const rows: CompactTuple[3] = Array.from({ length: 60 }, (_, i) => [i % 2, (i + 1) % 2, 10_000 + i, 0, 'Chuyển khoản'])
    const tuple: CompactTuple = ['Bữa lặp', names, [['970422', '1', 'AN']], rows]
    expect(decodeBinaryTuple(encodeBinaryTuple(tuple))).toEqual(tuple)
  })

  it('số tiền lớn (đến giới hạn số nguyên an toàn) khôi phục chính xác', () => {
    const big = Number.MAX_SAFE_INTEGER
    const tuple: CompactTuple = ['Bữa lớn', ['A', 'B'], [['970422', '1', 'A']], [[0, 1, big, 0]]]
    const decoded = decodeBinaryTuple(encodeBinaryTuple(tuple))
    expect(decoded[3][0][2]).toBe(big)
  })

  it('kết quả chỉ gồm ký tự an toàn cho URL (base64url, có tiền tố)', () => {
    const encoded = encodeBinaryTuple(FULL)
    expect(encoded.startsWith(BINARY_PREFIX)).toBe(true)
    expect(encoded).toMatch(/^~[A-Za-z0-9_-]+$/)
  })

  it('dữ liệu lặp lại được nén gọn (link ngắn)', () => {
    const repeated: CompactTuple = ['Bữa', Array.from({ length: 30 }, () => 'Nguyễn Văn An'), [['970422', '1', 'NGUYEN VAN AN']], []]
    const encoded = encodeBinaryTuple(repeated)
    expect(encoded.length).toBeLessThan(200)
  })
})

describe('snapshotCodec - chuỗi hỏng phải ném lỗi', () => {
  const valid = encodeBinaryTuple(FULL)

  it('chuỗi rỗng hoặc sai tiền tố `~` bị từ chối', () => {
    expect(() => decodeBinaryTuple('')).toThrow()
    expect(() => decodeBinaryTuple(valid.slice(1))).toThrow()
    expect(() => decodeBinaryTuple(`x${valid.slice(1)}`)).toThrow()
  })

  it('chuỗi bị cắt cụt ném lỗi', () => {
    expect(() => decodeBinaryTuple(valid.slice(0, valid.length - 12))).toThrow()
    expect(() => decodeBinaryTuple(valid.slice(0, 6))).toThrow()
  })

  it('ký tự ngoài bảng base64url (+, /, $, khoảng trắng) ném lỗi', () => {
    expect(() => decodeBinaryTuple(`${valid}+`)).toThrow()
    expect(() => decodeBinaryTuple(`${valid}/`)).toThrow()
    expect(() => decodeBinaryTuple(`${valid} $`)).toThrow()
  })

  it('sai phiên bản định dạng ném lỗi', () => {
    const bytes = toBytes(valid)
    const wrongVersion = Uint8Array.from(bytes)
    // Giữ bit nén, đổi phiên bản từ 1 sang 2.
    wrongVersion[0] = (2 << 1) | (bytes[0] & 1)
    expect(() => decodeBinaryTuple(fromBytes(wrongVersion))).toThrow()
  })

  it('dữ liệu nhị phân ngẫu nhiên (phiên bản 0) ném lỗi', () => {
    expect(() => decodeBinaryTuple(fromBytes(Uint8Array.from([0x00, 0x01, 0x02, 0x03])))).toThrow()
  })

  it('byte chưa đủ để đọc header ném lỗi', () => {
    expect(() => decodeBinaryTuple(fromBytes(Uint8Array.from([0x02])))).toThrow()
  })
})

describe('snapshotCodec - đầu vào không hợp lệ khi mã hoá', () => {
  const base = (): CompactTuple => ['Bữa', ['An'], [['970422', '1', 'AN']], [[0, 0, 1000, 0]]]

  it('BIN ngân hàng không đủ 6 chữ số ném RangeError', () => {
    const short: CompactTuple = ['Bữa', ['An'], [['97042', '1', 'AN']], [[0, 0, 1000, 0]]]
    expect(() => encodeBinaryTuple(short)).toThrow(RangeError)
    const letters: CompactTuple = ['Bữa', ['An'], [['97042A', '1', 'AN']], [[0, 0, 1000, 0]]]
    expect(() => encodeBinaryTuple(letters)).toThrow(RangeError)
  })

  it('số tiền âm ném RangeError', () => {
    const negative: CompactTuple = ['Bữa', ['An'], [['970422', '1', 'AN']], [[0, 0, -1, 0]]]
    expect(() => encodeBinaryTuple(negative)).toThrow(RangeError)
  })

  it('số tiền không nguyên ném RangeError', () => {
    const fractional: CompactTuple = ['Bữa', ['An'], [['970422', '1', 'AN']], [[0, 0, 1000.5, 0]]]
    expect(() => encodeBinaryTuple(fractional)).toThrow(RangeError)
  })

  it('chỉ số thành viên âm hoặc không nguyên ném RangeError', () => {
    const negIndex: CompactTuple = ['Bữa', ['An'], [['970422', '1', 'AN']], [[-1, 0, 1000, 0]]]
    expect(() => encodeBinaryTuple(negIndex)).toThrow(RangeError)
    const nanAmount: CompactTuple = ['Bữa', ['An'], [['970422', '1', 'AN']], [[0, 0, Number.NaN, 0]]]
    expect(() => encodeBinaryTuple(nanAmount)).toThrow(RangeError)
  })

  it('bữa hợp lệ không ném lỗi', () => {
    expect(() => encodeBinaryTuple(base())).not.toThrow()
  })
})
