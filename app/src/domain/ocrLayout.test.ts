import { describe, expect, it } from 'vitest'
import { parseReceipt } from './receiptParser'
import { groupWordsIntoLines, layoutOcrText, type OcrWord } from './ocrLayout'

/** Từ có chiều cao 20px; `x` là mép trái, `y` là mép trên. */
const w = (text: string, x: number, y: number, width = 40): OcrWord => ({ text, x0: x, y0: y, x1: x + width, y1: y + 20 })

describe('gom dòng theo toạ độ Y (architecture VietOCR §2.2)', () => {
  it('các từ có tâm dọc gần nhau nằm cùng dòng, dòng sắp từ trên xuống', () => {
    const lines = groupWordsIntoLines([w('50.000', 300, 102), w('Bún', 10, 100), w('Chả', 10, 140), w('2', 200, 101)])
    expect(lines.map((l) => l.map((x) => x.text))).toEqual([['Bún', '2', '50.000'], ['Chả']])
  })

  it('trong một dòng, từ được sắp từ trái sang phải dù đầu vào lộn xộn', () => {
    const lines = groupWordsIntoLines([w('C', 200, 100), w('A', 10, 100), w('B', 100, 100)])
    expect(lines).toHaveLength(1)
    expect(lines[0].map((x) => x.text)).toEqual(['A', 'B', 'C'])
  })

  it('bỏ qua từ rỗng và đầu vào rỗng', () => {
    expect(groupWordsIntoLines([])).toEqual([])
    expect(groupWordsIntoLines([w('  ', 0, 0)])).toEqual([])
  })
})

describe('layoutOcrText: ghép thành văn bản nhiều dòng', () => {
  it('khoảng cách ngang nhỏ dùng một khoảng trắng, khoảng cách lớn (nhảy cột) dùng hai khoảng trắng', () => {
    const text = layoutOcrText([w('Bún', 10, 100), w('bò', 60, 100), w('2', 300, 100), w('50.000', 380, 100)])
    expect(text).toBe('Bún bò  2  50.000')
  })

  it('mỗi dòng ngang là một dòng văn bản', () => {
    expect(layoutOcrText([w('Bún', 10, 100), w('50.000', 300, 100), w('Chả', 10, 140), w('40.000', 300, 140)])).toBe(
      'Bún  50.000\nChả  40.000',
    )
  })

  it('văn bản ghép ra đưa được vào parseReceipt và tách ra món đúng cột', () => {
    const text = layoutOcrText([
      w('Bún', 10, 100, 40), w('bò', 60, 100, 30), w('1', 300, 100, 10), w('50.000', 380, 100, 70),
      w('Chả', 10, 140, 40), w('giò', 60, 140, 30), w('1', 300, 140, 10), w('40.000', 380, 140, 70),
    ])
    const receipt = parseReceipt(text)
    expect(receipt.items.map((i) => [i.name, i.rawAmount])).toEqual([
      ['Bún bò', 50000],
      ['Chả giò', 40000],
    ])
  })
})
