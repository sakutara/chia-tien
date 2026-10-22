import { describe, expect, it } from 'vitest'
import { RECEIPT_FIXTURES } from './__fixtures__/receipts'
import { parseReceipt, type ParsedItem, type ParsedReceipt } from './receiptParser'
import { describeInconsistentRows, rowCandidates, validateReceipt } from './receiptValidation'

const item = (name: string, quantity: number, unitPrice: number, rawAmount = quantity * unitPrice): ParsedItem => ({
  name,
  quantity,
  unitPrice,
  rawAmount,
  uncertain: false,
})

describe('rowCandidates — thành tiền phải bằng SL × đơn giá', () => {
  it('dòng đã khớp giữ nguyên, không đề xuất sửa', () => {
    expect(rowCandidates(item('Bia', 2, 25_000))).toHaveLength(1)
  })

  it('dòng lệch có đủ ba cách sửa, mỗi cách chỉ đổi một số', () => {
    const c = rowCandidates(item('Bia', 2, 25_000, 75_000))
    const triples = c.map((x) => [x.quantity, x.unitPrice, x.rawAmount])
    expect(triples).toContainEqual([2, 25_000, 50_000]) // thành tiền
    expect(triples).toContainEqual([3, 25_000, 75_000]) // số lượng
    expect(triples).toContainEqual([2, 37_500, 75_000]) // đơn giá
  })

  it('mô tả dòng lệch cho người dùng', () => {
    expect(describeInconsistentRows([item('Bia', 2, 25_000, 75_000)])[0]).toContain('"Bia"')
  })
})

describe('validateReceipt — đối chiếu tổng', () => {
  it('OK: các bill mẫu đọc đúng thì khớp ngay, không đổi gì', () => {
    for (const f of RECEIPT_FIXTURES) {
      if (f.expected.billTotal === undefined) continue
      const check = validateReceipt(f.expected)
      // Khớp tổng thì số đọc được là đúng: không đổi tên/SL/giá (cờ nghi ngờ của parser được gỡ vì tổng đã xác nhận).
      if (check.status === 'OK') {
        expect(check.receipt.items.map(({ uncertain: _u, ...rest }) => rest)).toEqual(f.expected.items.map(({ uncertain: _u, ...rest }) => rest))
      }
    }
    const cafeLua = RECEIPT_FIXTURES.find((f) => f.name.startsWith('Cafe Lúa'))!.expected
    const check = validateReceipt(cafeLua)
    expect(check.status).toBe('OK')
    expect(check.receipt.items).toHaveLength(9)
  })

  it('tính cả giảm giá, phí phục vụ và VAT theo thứ tự của app', () => {
    // 120.000 − 10% (12.000) = 108.000; phí 5% = 5.400; VAT 8% trên 113.400 = 9.072 → 122.472
    const cafe = RECEIPT_FIXTURES.find((f) => f.name.startsWith('cafe, '))!.expected
    expect(validateReceipt(cafe).status).toBe('OK')
  })

  it('sửa số lượng bị OCR đọc sai khi tổng bill xác nhận thành tiền', () => {
    const parsed: ParsedReceipt = {
      items: [item('Cơm', 2, 45_000, 90_000), item('Bia', 7, 25_000, 75_000)],
      billTotal: 165_000,
    }
    const check = validateReceipt(parsed)
    expect(check.status).toBe('CORRECTED')
    expect(check.receipt.items[1]).toMatchObject({ quantity: 3, unitPrice: 25_000, rawAmount: 75_000, uncertain: true })
  })

  it('sửa thành tiền khi chính thành tiền bị đọc sai', () => {
    const parsed: ParsedReceipt = {
      items: [item('Cơm', 2, 45_000, 90_000), item('Bia', 2, 25_000, 60_000)],
      billTotal: 140_000,
    }
    const check = validateReceipt(parsed)
    expect(check.status).toBe('CORRECTED')
    expect(check.receipt.items[1].rawAmount).toBe(50_000)
  })

  it('bỏ dòng thực ra là dòng tổng, kể cả khi parser không nhận ra tên', () => {
    const parsed: ParsedReceipt = {
      items: [item('Cơm', 2, 45_000, 90_000), item('Trà', 1, 15_000), item('Cộng 105', 1, 105_000)],
      billSubtotal: 105_000,
      billTotal: 105_000,
    }
    const check = validateReceipt(parsed)
    expect(check.status).toBe('CORRECTED')
    expect(check.receipt.items.map((i) => i.name)).toEqual(['Cơm', 'Trà'])
  })

  it('thêm VAT khi bill thiếu dòng VAT nhưng tổng chỉ khớp với VAT 8%', () => {
    const parsed: ParsedReceipt = { items: [item('Lẩu', 1, 500_000)], billTotal: 540_000 }
    const check = validateReceipt(parsed)
    expect(check.status).toBe('CORRECTED')
    expect(check.receipt.vat).toEqual({ mode: 'PERCENTAGE', value: 8 })
  })

  it('đổi % VAT đọc sai thành mức khớp', () => {
    const parsed: ParsedReceipt = { items: [item('Lẩu', 1, 500_000)], vat: { mode: 'PERCENTAGE', value: 6 }, billTotal: 550_000 }
    const check = validateReceipt(parsed)
    expect(check.status).toBe('CORRECTED')
    expect(check.receipt.vat).toEqual({ mode: 'PERCENTAGE', value: 10 })
  })

  it('thử cách tính khác: phí phục vụ trên tiền hàng trước giảm giá', () => {
    // S=200.000, giảm 50.000, phí 10% trên 200.000 = 20.000, VAT none → 170.000. Cách của app: phí 10% trên 150.000 = 15.000 → 165.000.
    const parsed: ParsedReceipt = {
      items: [item('A', 1, 200_000)],
      discount: { mode: 'FIXED_AMOUNT', value: 50_000 },
      service: { mode: 'PERCENTAGE', value: 10 },
      billTotal: 170_000,
    }
    const check = validateReceipt(parsed)
    expect(check.status).toBe('CORRECTED')
    expect(check.receipt.service).toEqual({ mode: 'FIXED_AMOUNT', value: 20_000 })
    expect(check.receipt.discount).toEqual({ mode: 'FIXED_AMOUNT', value: 50_000 })
  })

  it('không kịch bản nào khớp thì giữ nguyên số đọc được và báo chỉnh tay', () => {
    const parsed: ParsedReceipt = { items: [item('A', 1, 123_457), item('B', 1, 50_001)], billTotal: 999_999 }
    const check = validateReceipt(parsed)
    expect(check.status).toBe('MISMATCH')
    expect(check.receipt.items.map((i) => i.rawAmount)).toEqual([123_457, 50_001])
    expect(check.notes.join(' ')).toContain('chỉnh tay')
  })

  it('bill không có dòng tổng: không đoán, báo chưa đối chiếu được', () => {
    const check = validateReceipt({ items: [item('Bia', 2, 25_000, 75_000)] })
    expect(check.status).toBe('UNVERIFIED')
    expect(check.receipt.items[0]).toMatchObject({ rawAmount: 75_000, uncertain: true })
  })
})

describe('parseReceipt + validateReceipt', () => {
  it('dòng tổng đọc lệch chữ không thành món và bill vẫn khớp', () => {
    const f = RECEIPT_FIXTURES.find((x) => x.name.startsWith('dòng tổng'))!
    const check = validateReceipt(parseReceipt(f.text))
    expect(check.status).toBe('OK')
    expect(check.receipt.items.map((i) => i.name)).toEqual(['Cơm sườn', 'Trà đá'])
  })
})

describe('validateReceipt — dòng cuối là tổng bill', () => {
  it('không đọc được chữ "Tổng cộng": số ở dòng cuối vẫn được dùng làm tổng để đối chiếu', () => {
    const text = `QUÁN ĂN
Cơm 2 x 45.000 = 90.000
Trà 1 x 15.000 = 15.000
@@ ## 105.000`
    const parsed = parseReceipt(text)
    expect(parsed.billTotal).toBeUndefined()
    const check = validateReceipt(parsed, text)
    expect(check.status).toBe('OK')
    expect(check.receipt.items.map((i) => i.name)).toEqual(['Cơm', 'Trà'])
    expect(check.receipt.billTotal).toBe(105_000)
  })

  it('dòng cuối đã bị đọc thành một món thì bị loại khỏi danh sách và thành tổng bill', () => {
    const text = `Cơm 2 x 45.000 = 90.000
Trà 1 x 15.000 = 15.000
Cong tien 105.000`
    const parsed = { items: parseReceipt(text).items.concat({ name: 'Xxx', quantity: 1, unitPrice: 105_000, rawAmount: 105_000, uncertain: false }) }
    const check = validateReceipt(parsed, text)
    expect(check.status).toBe('CORRECTED')
    expect(check.receipt.items.map((i) => i.name)).toEqual(['Cơm', 'Trà'])
    expect(check.receipt.billTotal).toBe(105_000)
  })

  it('tính cả VAT khi dùng dòng cuối làm tổng', () => {
    const text = `Lẩu 1 x 500.000 = 500.000
VAT 10%
@@ 550.000`
    const check = validateReceipt(parseReceipt(text), text)
    expect(check.status).toBe('OK')
    expect(check.receipt.vat).toEqual({ mode: 'PERCENTAGE', value: 10 })
  })

  it('tổng "Tổng cộng" đọc được nhưng sai, dòng cuối đúng: dùng dòng cuối', () => {
    const text = `Cơm 2 x 45.000 = 90.000
Trà 1 x 15.000 = 15.000
Tổng cộng 150.000
@@ 105.000`
    const check = validateReceipt(parseReceipt(text), text)
    expect(check.status).toBe('OK')
    expect(check.receipt.billTotal).toBe(105_000)
  })

  it('dòng cuối không khớp cách nào: không áp dụng, báo người dùng tự so', () => {
    const text = `Cơm 1 x 45.000 = 45.000
@@ 999.000`
    const check = validateReceipt(parseReceipt(text), text)
    expect(check.status).toBe('UNVERIFIED')
    expect(check.notes[0]).toContain('999.000')
  })
})

describe('ảnh chụp thật (Cafe Lúa, nền tối, sau khi quét)', () => {
  // Văn bản Tesseract đọc từ ảnh đã cắt 4 góc + trắng đen: lẫn số tiền đọc sai (85000 ↔ 55,000, 48,000 ↔ 49,000), SL 4 thay 1.
  const text = `¥ \\
#                                 4
CAFE LUA pha Nhuận
ĐC: 140B Nguyễn Văn TH) 224
Hotline: 0906-72“
TẠM TÍNH
oor        Giờ ir
Giờ vào: 17/10/2026 10:09””“- 13;42
Nhân Viên: BÚI LE ANH
KHOA             |
Tên hàng      D.Gid SL Thành tiền
Trà Các Đác Thơm                          .
Pha ngot         59,000 x 1    _ 59,000
' Matcha Yên Mach   85000 x 1 55,000
AMERICANO     49,000 x 1 48,000
BO NE        55,000 x 1 55,000
Wee THAP.CAM 5 900 x 1-- > 75,000
HỦ TIỂU CÁ LÓC   85.000 x 1    65,000
_ NUI XÀO BO .   55,000 x 1   55,000
PHU THU ĐÔ AN 2
Sup sườn thêm    30,000 x 1    30,000
ÉP CÓC     — 48/000 x 4    49,000
LE LS TT ae aS SD TEE SISA IEA ASANO ENED
Tổng tiền hang:                             492,000
Chiết khau:                        0
| Tổng Cộng: ,          492,000
       N |  »-          {
ar P
`

  it('đọc đủ 9 món, tự sửa số sai theo tổng bill và báo rõ đã sửa gì', () => {
    const check = validateReceipt(parseReceipt(text), text)
    expect(check.status).toBe('CORRECTED')
    expect(check.receipt.items.map((i) => i.rawAmount)).toEqual([59_000, 55_000, 49_000, 55_000, 75_000, 65_000, 55_000, 30_000, 49_000])
    expect(check.receipt.items.every((i) => i.quantity === 1 && i.quantity * i.unitPrice === i.rawAmount)).toBe(true)
    expect(check.receipt.items.reduce((s, i) => s + i.rawAmount, 0)).toBe(492_000)
    expect(check.receipt.billTotal).toBe(492_000)
    expect(check.receipt.items.some((i) => i.name.includes('140B'))).toBe(false)
  })
})

describe('validateReceipt — dòng rác lọt qua bộ lọc', () => {
  it('bỏ một dòng bất kỳ nếu chỉ khi đó tổng mới khớp bill', () => {
    const parsed: ParsedReceipt = {
      items: [item('Cơm', 2, 45_000, 90_000), item('Trà', 1, 15_000), item('Rác', 1, 12_345)],
      billSubtotal: 105_000,
      billTotal: 105_000,
    }
    const check = validateReceipt(parsed)
    expect(check.status).toBe('CORRECTED')
    expect(check.receipt.items.map((i) => i.name)).toEqual(['Cơm', 'Trà'])
    expect(check.notes.join(' ')).toContain('Rác')
  })
})

describe('validateReceipt — đối soát tổng với giảm giá bị đọc thành món và món bị thiếu', () => {
  it('giảm giá bị đọc thành món (cộng thay vì trừ): chuyển thành giảm giá của bill, bỏ khỏi danh sách món', () => {
    const check = validateReceipt(parseReceipt('QUÁN TEST\nCơm 150.000\nCanh 150.000\nGiảm 5.000\nTổng cộng 295.000'))
    expect(check.status).toBe('CORRECTED')
    expect(check.receipt.items.map((i) => i.name)).toEqual(['Cơm', 'Canh'])
    expect(check.receipt.discount).toEqual({ mode: 'FIXED_AMOUNT', value: 5_000 })
  })

  it('thiếu một món (tổng các món nhỏ hơn bill một chút): thêm dòng "Món chưa đọc được" đúng số tiền thiếu', () => {
    const check = validateReceipt(parseReceipt('QUÁN TEST\nCơm 150.000\nCanh 100.000\nTổng cộng 255.000'))
    expect(check.status).toBe('CORRECTED')
    expect(check.receipt.items.map((i) => [i.name, i.rawAmount, i.uncertain])).toEqual([
      ['Cơm', 150_000, false],
      ['Canh', 100_000, false],
      ['Món chưa đọc được', 5_000, true],
    ])
  })

  it('lệch lớn hơn 10% thì không tự thêm/bớt, báo người dùng chỉnh tay', () => {
    const check = validateReceipt(parseReceipt('QUÁN TEST\nCơm 150.000\nCanh 100.000\nTổng cộng 400.000'))
    expect(check.status).toBe('MISMATCH')
    expect(check.receipt.items).toHaveLength(2)
  })
})
