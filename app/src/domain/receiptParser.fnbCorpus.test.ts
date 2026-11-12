import { describe, expect, it } from 'vitest'
import fixtures from './__fixtures__/fnbReceipts.json'
import { parseReceipt } from './receiptParser'
import { validateReceipt } from './receiptValidation'

// Ngưỡng sàn đo trên bộ bill F&B (văn bản OCR thật, có số tổng chuẩn).
const FLOOR_TOTAL = 86
const FLOOR_FULL = 73

interface FnbFixture {
  id: string
  group: string
  totals: number[]
  text: string
}

interface GroupStat {
  bills: number
  total: number
  full: number
}

describe('receiptParser — bộ bill F&B', () => {
  it('đếm số bill lấy đúng tổng và số bill khớp trọn', () => {
    const rows = fixtures as FnbFixture[]
    const byGroup = new Map<string, GroupStat>()
    let totalOk = 0
    let fullOk = 0

    for (const bill of rows) {
      const parsed = parseReceipt(bill.text)
      const check = validateReceipt(parsed, bill.text)
      const billTotal = check.receipt.billTotal
      const gotTotal = billTotal !== undefined && bill.totals.includes(billTotal)
      const gotFull = gotTotal && (check.status === 'OK' || check.status === 'CORRECTED')

      if (gotTotal) totalOk++
      if (gotFull) fullOk++

      const stat = byGroup.get(bill.group) ?? { bills: 0, total: 0, full: 0 }
      stat.bills++
      if (gotTotal) stat.total++
      if (gotFull) stat.full++
      byGroup.set(bill.group, stat)
    }

    const summary = `Đúng tổng: ${totalOk}/${rows.length} (sàn ${FLOOR_TOTAL}); khớp trọn: ${fullOk}/${rows.length} (sàn ${FLOOR_FULL})`
    expect(totalOk, summary).toBeGreaterThanOrEqual(FLOOR_TOTAL)
    expect(fullOk, summary).toBeGreaterThanOrEqual(FLOOR_FULL)
  })
})
