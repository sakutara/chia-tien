import { describe, expect, it } from 'vitest'
import { BANKS, searchBanks } from './banks'

describe('searchBanks', () => {
  it('BIN là 6 số và không trùng', () => {
    expect(BANKS.every((b) => /^\d{6}$/.test(b.bin))).toBe(true)
    expect(new Set(BANKS.map((b) => b.bin)).size).toBe(BANKS.length)
  })

  it('tìm không phân biệt hoa-thường và dấu, theo tên, mã hoặc tên đầy đủ', () => {
    expect(searchBanks('vcb')[0].name).toBe('Vietcombank')
    expect(searchBanks('ngoai thuong').map((b) => b.code)).toContain('VCB')
    expect(searchBanks('QUÂN ĐỘI').map((b) => b.code)).toContain('MB')
    expect(searchBanks('xyz-không-có')).toEqual([])
  })

  it('rỗng → toàn bộ danh sách; khớp đầu tên xếp trước', () => {
    expect(searchBanks('')).toHaveLength(BANKS.length)
    expect(searchBanks('vie')[0].name.toLowerCase().startsWith('vie')).toBe(true)
  })
})
