import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Invoice, InvoiceItem, SessionKeo } from '../types'

export interface InvoiceRow {
  invoice: Invoice
  items: InvoiceItem[]
}

export interface SessionView {
  session: SessionKeo
  /** Hoá đơn của kèo, cũ nhất trước. */
  invoices: InvoiceRow[]
  /** Tổng chi của kèo; bữa đã lưu trữ dùng số đã chốt (BR-4.11). */
  total: number
  hasCost: boolean
}

/** Các kèo của một bữa theo thứ tự, kèm hoá đơn, món và tổng chi (BR-4.11). `undefined` khi đang tải. */
export function useMealSessions(mealId: string): SessionView[] | undefined {
  return useLiveQuery(async () => {
    const [sessions, invoices, items] = await Promise.all([
      db.sessions.where('mealId').equals(mealId).toArray(),
      db.invoices.where('mealId').equals(mealId).toArray(),
      db.items.where('mealId').equals(mealId).toArray(),
    ])
    const itemsByInvoice = new Map<string, InvoiceItem[]>()
    for (const it of items) {
      const list = itemsByInvoice.get(it.invoiceId) ?? []
      list.push(it)
      itemsByInvoice.set(it.invoiceId, list)
    }

    return sessions
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((session) => {
        const mine = invoices
          .filter((inv) => inv.sessionId === session.id)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
          .map((invoice) => ({
            invoice,
            items: (itemsByInvoice.get(invoice.id) ?? []).sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)),
          }))
        const liveTotal = mine.reduce((sum, row) => sum + row.invoice.totalAmount, 0)
        const archived = session.archivedTotalAmount
        return {
          session,
          invoices: mine,
          total: archived ?? liveTotal,
          hasCost: archived !== undefined || mine.length > 0,
        }
      })
  }, [mealId])
}
