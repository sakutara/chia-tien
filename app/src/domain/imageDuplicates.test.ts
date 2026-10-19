import { describe, expect, it } from 'vitest'
import { findTextDuplicates, textSimilarity, textTokens } from './imageDuplicates'

const BILL_A = `LẨU BÒ GỖ NGỌC
Ngày 19/10/2026
Lẩu bò mỹ 2 x 150.000 = 300.000
Bia Tiger 330ml 10 x 25.000 = 250.000
Tổng cộng 594.000`

// Cùng bill, chụp lần hai: OCR mất dấu và sai vài ký tự.
const BILL_A_RESCAN = `LAU BO GO NGOC
Ngay 19/10/2026
Lau bo my 2 x 150.000 = 300.000
Bia Tiger 330ml 10 x 25.000 = 250.000
Tong cong 594.000`

const BILL_B = `CAFE SÀI GÒN
Ngày 20/10/2026
Cà phê sữa 2 x 30.000 = 60.000
Bánh flan 1 x 25.000 = 25.000
Tổng cộng 85.000`

describe('textTokens', () => {
  it('bỏ dấu, chỉ giữ chữ và số, bỏ từ 1 ký tự', () => {
    expect([...textTokens('Lẩu Bò 2 x 150.000')].sort()).toEqual(['150', '000', 'bo', 'lau'].sort())
  })
})

describe('textSimilarity', () => {
  it('cùng một bill chụp hai lần thì giống nhau dù mất dấu', () => {
    expect(textSimilarity(BILL_A, BILL_A_RESCAN)).toBeGreaterThanOrEqual(0.8)
  })

  it('hai bill khác nhau thì không giống', () => {
    expect(textSimilarity(BILL_A, BILL_B)).toBeLessThan(0.3)
  })

  it('văn bản quá ngắn thì không kết luận trùng', () => {
    expect(textSimilarity('Tổng 100.000', 'Tổng 100.000')).toBe(0)
    expect(textSimilarity('', BILL_A)).toBe(0)
  })
})

describe('findTextDuplicates', () => {
  it('tìm ảnh trùng, bỏ qua chính nó và ảnh chưa có văn bản', () => {
    const target = { id: 'new', ocrRawText: BILL_A_RESCAN }
    const hits = findTextDuplicates(target, [
      { id: 'new', ocrRawText: BILL_A_RESCAN },
      { id: 'old', ocrRawText: BILL_A },
      { id: 'other', ocrRawText: BILL_B },
      { id: 'blank' },
    ])
    expect(hits.map((h) => h.other.id)).toEqual(['old'])
  })

  it('ảnh chưa có văn bản OCR thì không có kết quả', () => {
    expect(findTextDuplicates({ id: 'a' }, [{ id: 'b', ocrRawText: BILL_A }])).toEqual([])
  })
})
