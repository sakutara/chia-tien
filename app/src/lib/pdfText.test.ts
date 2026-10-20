import { describe, expect, it } from 'vitest'
import { pageTextOrUndefined, textItemsToLines, type PdfTextItem } from './pdfText'

const item = (str: string, x: number, y: number, width = str.length * 5, height = 10): PdfTextItem => ({ str, x, y, width, height })

describe('textItemsToLines — dựng dòng từ lớp chữ PDF', () => {
  it('gom mảnh chữ cùng đường cơ sở thành một dòng, từ trên xuống, trái sang phải', () => {
    const lines = textItemsToLines([
      item('Thành tiền', 300, 700),
      item('Tên món', 20, 700),
      item('Phở bò', 20, 680),
      item('60.000', 300, 680.4),
    ])
    expect(lines).toEqual(['Tên món   Thành tiền', 'Phở bò   60.000'])
  })

  it('chữ liền nhau (một từ bị cắt thành nhiều mảnh) không bị chèn khoảng trắng, cách một chữ thì một khoảng trắng', () => {
    expect(textItemsToLines([item('Xin', 20, 700, 15), item('chào', 35, 700, 20), item('bạn', 62, 700, 15)])).toEqual(['Xinchào bạn'])
  })

  it('bỏ mảnh rỗng; trang không có chữ → rỗng', () => {
    expect(textItemsToLines([item('   ', 0, 0), item('', 5, 5)])).toEqual([])
    expect(textItemsToLines([])).toEqual([])
  })

  it('pageTextOrUndefined: ít chữ (ảnh quét chỉ có vài ký tự rác) thì coi như không có lớp chữ', () => {
    expect(pageTextOrUndefined([item('1', 0, 0)])).toBeUndefined()
    expect(pageTextOrUndefined([item('Cộng tiền hàng hoá dịch vụ', 20, 700), item('2.050.000', 300, 700)])).toBe('Cộng tiền hàng hoá dịch vụ   2.050.000')
  })
})
