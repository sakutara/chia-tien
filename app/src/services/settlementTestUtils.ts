import { db } from '../db/db'
import { computeMealSettlement } from '../domain/settlementEngine'
import { setTransfersPaid } from './settlementService'

/** Chỉ dùng trong test: tick "Đã chuyển" cho mọi khoản chuyển hiện có của bữa. */
export async function payAllTransfers(mealId: string, isPaid = true) {
  const meal = (await db.meals.get(mealId))!
  const [members, sessions, invoices, items] = await Promise.all([
    db.members.toArray(),
    db.sessions.where('mealId').equals(mealId).toArray(),
    db.invoices.where('mealId').equals(mealId).toArray(),
    db.items.where('mealId').equals(mealId).toArray(),
  ])
  const { transfers } = computeMealSettlement({ meal, members, sessions, invoices, items })
  return setTransfersPaid(mealId, transfers.map((t) => t.key), isPaid)
}
