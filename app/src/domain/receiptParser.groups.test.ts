import { describe, expect, it } from 'vitest'
import { parseReceipt } from './receiptParser'
import { validateReceipt } from './receiptValidation'

/** Văn bản OCR thật của bill Matchandeul BBQ (ảnh chụp 21-10-2026): có dòng nhóm Drink / Food, tên món song ngữ Hàn bị OCR đọc rác. */
const MATCHANDEUL = [
  "¬",
  "",
  "ee ee AEH",
  "MATCHANDEUL” BBQ",
  "",
  "PHIEU TINH TIEN",
  "",
  "RECEIPT",
  "Ban Table: 2F-09          f/",
  "",
  "Phiếu Bil: 5-211026-5E374",
  "Giờ vào Time in: 21-10-2026 19:31    Printed : 2",
  "Gi¢ in Printed time: 21-10-2026 20:22 Số khách: 4",
  "Thu ngân Cashier: ORDER LAU Q2",
  "",
  "Phục vụ Waiter: ORDER LAU Q2",
  "",
  "TEN HANG              SL pc       T.TIEN",
  "items                          Oh     Price       Amount",
  "Nước ngọt Coca-Cola       1         30,000         30,000",
  "Drink                                        |          30,000",
  "Banchan thịt (4) 2| Bt    4        0            0",
  "ab)                       |                                |",
  "Thịt vai (At)             1 290,000 290,000",
  "Tướng mồng ŒÑ†7— 1 — 290,000  — 290,000 {",
  "Lõi nạc vai bò CAH,       400,000       400,000",
  "ah",
  "",
  "ï heo mông mréc                      +",
  "— (cH H Aro Zt    1     310,000     310,000",
  "",
  "aes      |",
  "i          số         nhỏ                         củ,",
  "(ea Sai H KH)           1. - 130,000         130,000",
  "Mi gói (C|fH)                  1           90.000. 90,000",
  "Food                                1,510,000",
  "",
  "TONG CỘNG (GRAND TOTAL)       1,540,000 _",
  "",
  ""
].join('\n')

const amounts = (text: string): number[] => parseReceipt(text).items.map((i) => i.rawAmount)

describe('bill Matchandeul BBQ — dòng tổng nhóm Drink / Food (BR-4.20)', () => {
  it('đọc đủ 7 món kể cả dòng có dấu chấm thừa sau số ("90.000." và "1.")', () => {
    const parsed = parseReceipt(MATCHANDEUL)
    expect(parsed.items.map((i) => i.rawAmount)).toEqual([30_000, 290_000, 290_000, 400_000, 310_000, 130_000, 90_000])
    expect(parsed.items.every((i) => i.name !== 'Tổng đồ uống' && i.name !== 'Tổng đồ ăn')).toBe(true)
    expect(parsed.billTotal).toBe(1_540_000)
    expect(validateReceipt(parsed, MATCHANDEUL).status).toBe('OK')
  })

  it('món bị mất không làm xoá các món đã đọc: nhóm Food thiếu 220.000 thì thêm dòng "Món chưa đọc được"', () => {
    const text = MATCHANDEUL.split('\n')
      .filter((l) => !/130,000|90\.000/.test(l))
      .join('\n')
    const parsed = parseReceipt(text)
    expect(parsed.items.map((i) => i.rawAmount)).toEqual([30_000, 290_000, 290_000, 400_000, 310_000, 220_000])
    const missing = parsed.items[parsed.items.length - 1]
    expect(missing.name).toBe('Món chưa đọc được')
    expect(missing.uncertain).toBe(true)
    expect(parsed.groupChecks).toEqual([{ group: 'food', expected: 1_510_000, read: 1_290_000 }])

    const check = validateReceipt(parsed, text)
    expect(check.status).toBe('OK')
    expect(check.notes.join(' ')).toContain('220.000')
  })

  it('dòng món chỉ có dấu chấm/phẩy thừa sau số vẫn đọc được', () => {
    expect(amounts('QUÁN TEST\nMì gói 1 90.000. 90,000')).toEqual([90_000])
    expect(amounts('QUÁN TEST\nMì lạnh 1. - 130,000 130,000')).toEqual([130_000])
  })

  it('món của nhóm nhiều hơn dòng nhóm thì giữ món và báo lệch, không thêm món', () => {
    const text = ['Quán ABC', 'Cà phê 2 x 30.000 = 60.000', 'Trà 1 x 20.000 = 20.000', 'Drink 60.000', 'Phở bò 1 x 60.000 = 60.000', 'Food 60.000', 'Tổng cộng 120.000'].join('\n')
    const parsed = parseReceipt(text)
    expect(parsed.items.map((i) => i.name)).toEqual(['Cà phê', 'Trà', 'Phở bò'])
    expect(parsed.groupChecks).toEqual([{ group: 'drink', expected: 60_000, read: 80_000 }])
  })

  it('không đọc được món nào thì vẫn dùng hai dòng nhóm làm hai món', () => {
    const parsed = parseReceipt(['Quán ABC', 'Drink 30.000', 'Food 1.510.000', 'Tổng cộng 1.540.000'].join('\n'))
    expect(parsed.items.map((i) => [i.name, i.rawAmount])).toEqual([
      ['Tổng đồ uống', 30_000],
      ['Tổng đồ ăn', 1_510_000],
    ])
  })
})
