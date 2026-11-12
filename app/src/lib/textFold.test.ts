import { describe, expect, it } from 'vitest'
import { fold } from './textFold'

describe('fold', () => {
  it('bỏ dấu tiếng Việt và đưa về chữ thường', () => {
    expect(fold('Nguyễn Văn Ánh')).toBe('nguyen van anh')
    expect(fold('Phở Bò Tái Chín')).toBe('pho bo tai chin')
  })

  it('đổi đ/Đ thành d/D rồi chuyển thường', () => {
    expect(fold('Đặng Thị Đào')).toBe('dang thi dao')
    expect(fold('đường')).toBe('duong')
  })

  it('so khớp được khi OCR đọc mất dấu', () => {
    expect(fold('Hoá đơn')).toBe(fold('HOA DON'))
    expect(fold('Kèo Lẩu')).toBe(fold('keo lau'))
  })

  it('giữ nguyên chữ số và ký tự không dấu', () => {
    expect(fold('Kèo 1 - 120.000')).toBe('keo 1 - 120.000')
    expect(fold('')).toBe('')
  })
})
