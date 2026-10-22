import { describe, expect, it } from 'vitest'
import { acceptReread, buildText, collectLines, cropRect, isMoneyWord, selectRereadTargets, type OcrWord } from './ocrDigits'

const w = (text: string, x0 = 0, y0 = 0): OcrWord => ({ text, x0, y0, x1: x0 + 50, y1: y0 + 20 })

describe('lượt 2 đọc lại số (02 §3 bước 2)', () => {
  it('collectLines đọc toạ độ từ bbox của Tesseract', () => {
    const lines = collectLines([{ paragraphs: [{ lines: [{ words: [{ text: '176.000', bbox: { x0: 10, y0: 20, x1: 60, y1: 40 } }] }] }] }])
    expect(lines).toEqual([[{ text: '176.000', x0: 10, y0: 20, x1: 60, y1: 40 }]])
  })

  it('từ số tiền: có 3 chữ số trở lên; số dài lẻ (MST, số hoá đơn) bị loại', () => {
    expect(isMoneyWord('176.000')).toBe(true)
    expect(isMoneyWord('53.000')).toBe(true)
    expect(isMoneyWord('476.000đ')).toBe(true)
    expect(isMoneyWord('12')).toBe(false)
    expect(isMoneyWord('Bún')).toBe(false)
    expect(isMoneyWord('001070016165')).toBe(false)
    expect(isMoneyWord('888803155678')).toBe(false)
    expect(isMoneyWord('123456780000')).toBe(true)
  })

  it('chọn từ số từ dòng cuối trước và giới hạn số lượng', () => {
    const lines = [[w('Bún'), w('106.000')], [w('Khăn'), w('6.000')], [w('Tổng'), w('176.000')]]
    expect(selectRereadTargets(lines).map((t) => `${t.line}:${t.word}`)).toEqual(['2:1', '1:1', '0:1'])
    expect(selectRereadTargets(lines, 2)).toHaveLength(2)
  })

  it('chỉ nhận kết quả là số tiền khác bản đọc lần đầu', () => {
    expect(acceptReread('476.000', '176.000')).toBe('176.000')
    expect(acceptReread('176.000', '176.000')).toBeUndefined()
    expect(acceptReread('176.000', '')).toBeUndefined()
    expect(acceptReread('176.000', 'a76.000')).toBeUndefined()
    expect(acceptReread('476.000đ', '176.0004')).toBe('176.000')
  })

  it('ghép lại văn bản, chỉ thay các từ đã đọc lại', () => {
    const lines = [[w('Khăn'), w('476.000')], [w('Tổng'), w('476.000')]]
    expect(buildText(lines, new Map([['1:1', '176.000']]))).toBe('Khăn 476.000\nTổng 176.000')
  })

  it('vùng cắt có viền và không ra ngoài ảnh', () => {
    expect(cropRect({ text: 'x', x0: 5, y0: 5, x1: 60, y1: 30 }, 100, 100)).toEqual({ x: 0, y: 0, w: 80, h: 50 })
  })
})
