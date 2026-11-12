// Dòng tổng nhóm đồ uống / đồ ăn và đối soát món.
import { ADDRESS_RE, hit } from './patterns'
import { fold } from '../../lib/textFold'
import { isDateLine } from './header'
import { moneyValues } from './money'
import { t } from '../../i18n'
import type { ParsedItem, ParsedReceipt } from './types'

/** Dòng tổng của nhóm đồ uống / đồ ăn khi bill tính riêng hai nhóm: "Tổng giá đồ uống 120.000", "Đồ ăn: 300.000". */
export const DRINK_GROUP_RE = /^(?:drinks?|beverages?|do uong|nuoc uong|thuc uong)$/
export const FOOD_GROUP_RE = /^(?:foods?|do an|mon an|thuc an)$/
/** Từ đệm trước/sau tên nhóm: "Tổng giá đồ uống", "Total food", "Food total", "Subtotal drinks". */
export const GROUP_FILLER_RE = /\b(?:tong|total|subtotal|sub|gia|tien|cong|sum|cac|all|of)\b/g

/** Nhãn nhóm của một dòng: bỏ số tiền và từ đệm, phần còn lại phải đúng là tên nhóm (món "Soft drink 2 x 20.000" không tính). */
export function groupKind(line: string): 'drink' | 'food' | null {
  if (line.includes('=')) return null
  const label = fold(line)
    .replace(/[\d.,]+k?/g, ' ')
    .replace(GROUP_FILLER_RE, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return DRINK_GROUP_RE.test(label) ? 'drink' : FOOD_GROUP_RE.test(label) ? 'food' : null
}

/**
 * Bill tính riêng đồ uống và đồ ăn: mỗi nhóm một dòng tổng (có số tiền). Hai dòng này được giữ làm hai "món" dù không phải món ăn.
 * Trả về các dòng nhóm (đồ uống trước) và vị trí của chúng trong `lines`; dòng không có số tiền (tiêu đề nhóm) bị bỏ qua.
 */
export function findGroupRows(lines: string[]): { rows: ParsedItem[]; indexes: Set<number>; lines: GroupLine[] } {
  const found = new Map<'drink' | 'food', { name: string; amount: number; index: number }>()
  const indexes = new Set<number>()
  lines.forEach((line, i) => {
    const kind = groupKind(line)
    if (!kind || hit(ADDRESS_RE, line) || isDateLine(line)) return
    const values = moneyValues(line)
    if (values.length === 0) return
    indexes.add(i)
    if (!found.has(kind)) found.set(kind, { name: kind === 'drink' ? t('Tổng đồ uống') : t('Tổng đồ ăn'), amount: values[values.length - 1], index: i })
  })
  const rows = (['drink', 'food'] as const).flatMap((k) => {
    const g = found.get(k)
    return g ? [{ name: g.name, quantity: 1, unitPrice: g.amount, rawAmount: g.amount, uncertain: false }] : []
  })
  const groupLines = (['drink', 'food'] as const).flatMap((k) => {
    const g = found.get(k)
    return g ? [{ kind: k, amount: g.amount, index: g.index }] : []
  })
  return { rows, indexes, lines: groupLines }
}

export interface GroupLine {
  kind: 'drink' | 'food'
  amount: number
  index: number
}

export const MISSING_ITEM_NAME = 'Món chưa đọc được'

/**
 * Các món so với dòng tổng nhóm (Drink / Food) của bill (02 §3 bước 5, BR-4.20). Dòng nhóm là subtotal chứ không thay món:
 * mỗi dòng nhóm khép các món nằm ngay trên nó; nhóm thiếu thì thêm "Món chưa đọc được" đúng phần thiếu, nhóm thừa thì giữ
 * nguyên và báo lệch. Không biết vị trí món (bảng hàng hoá) thì đối soát chung cả bill.
 */
export function reconcileGroups(
  items: ParsedItem[],
  origins: Map<ParsedItem, number> | undefined,
  groupLines: GroupLine[],
): { items: ParsedItem[]; checks: NonNullable<ParsedReceipt['groupChecks']> } {
  const sum = (list: ParsedItem[]): number => list.reduce((s, i) => s + i.rawAmount, 0)
  const missingItem = (amount: number): ParsedItem => ({ name: t(MISSING_ITEM_NAME), quantity: 1, unitPrice: amount, rawAmount: amount, uncertain: true })
  const sorted = [...groupLines].sort((a, b) => a.index - b.index)
  const groupSum = sorted.reduce((s, g) => s + g.amount, 0)
  if (sum(items) === groupSum) return { items, checks: [] }

  if (!origins || items.some((item) => !origins.has(item))) {
    const read = sum(items)
    return { items: read < groupSum ? [...items, missingItem(groupSum - read)] : items, checks: [{ expected: groupSum, read }] }
  }

  const segments: ParsedItem[][] = sorted.map(() => [])
  const rest: ParsedItem[] = []
  for (const item of items) {
    const k = sorted.findIndex((g) => g.index > (origins.get(item) as number))
    ;(k < 0 ? rest : segments[k]).push(item)
  }
  const checks: NonNullable<ParsedReceipt['groupChecks']> = []
  const out: ParsedItem[] = []
  sorted.forEach((group, k) => {
    const read = sum(segments[k])
    out.push(...segments[k])
    if (read === group.amount) return
    checks.push({ group: group.kind, expected: group.amount, read })
    if (read < group.amount) out.push(missingItem(group.amount - read))
  })
  return { items: [...out, ...rest], checks }
}
