import { db } from '../db/db'
import { computeInvoice, type InvoiceRulesDraft } from '../domain/invoiceRules'
import { defaultMealTitle } from '../domain/mealRules'
import { quickMealDate } from '../domain/quickBill'
import { todayLocal } from '../lib/dates'
import { generateId } from '../lib/id'
import type { InvoiceFileRecord, Meal, SessionKeo } from '../types'
import { addInvoiceImage } from './invoiceFileService'
import { createInvoice, type InvoiceResult } from './invoiceService'
import { createMeal, deleteMeal, updateMealInfo } from './mealService'
import { addSession } from './sessionService'

/*
 * Luồng "Chụp bill tạo bữa nhanh" (capability quick-bill-capture): một ảnh chụp tạo ra bữa, kèo và hoá đơn nháp có ảnh.
 */

export interface QuickBillStart {
  meal: Meal
  session: SessionKeo
  /** Id tạo trước của hoá đơn: ảnh đã gắn vào id này, hoá đơn lưu sau cũng dùng id này. */
  invoiceId: string
  file: InvoiceFileRecord
}

/**
 * Tạo bữa (ngày hôm nay, tên mặc định), một kèo, rồi lưu ảnh bill vào hoá đơn nháp của kèo.
 * Lưu ảnh lỗi thì xoá bữa và kèo vừa tạo rồi ném lại lỗi: không để lại bữa trống.
 */
export async function startQuickBill(image: File, now: Date = new Date()): Promise<QuickBillStart> {
  const meal = await createMeal({ title: '', date: todayLocal(now) }, now)
  try {
    const session = await addSession(meal.id)
    const invoiceId = generateId()
    const file = await addInvoiceImage({ mealId: meal.id, sessionId: session.id, invoiceId, file: image })
    return { meal, session, invoiceId, file }
  } catch (err) {
    await deleteMeal(meal.id).catch(() => {})
    throw err
  }
}

/** Đặt ngày bữa theo ngày đọc được trên bill (và tên mặc định theo ngày đó). Không có ngày hợp lệ thì giữ nguyên. */
export async function applyQuickMealDate(mealId: string, billDate: string | undefined): Promise<void> {
  const meal = await db.meals.get(mealId)
  if (!meal) return
  const date = quickMealDate(billDate, meal.date)
  if (date === meal.date) return
  await updateMealInfo(mealId, { title: defaultMealTitle(date), date, note: meal.note })
}

/**
 * Lưu thẳng hoá đơn đọc được từ bill: nhập chi tiết món, chia đều theo tổng, người ứng là chủ trì, kèo đổi tên theo quán.
 * Tổng tính được phải bằng đúng tổng ghi trên bill; lệch thì không lưu và trả về `null` để giao diện mở form.
 */
export async function saveQuickBillInvoice(
  start: Pick<QuickBillStart, 'meal' | 'session' | 'invoiceId'>,
  draft: InvoiceRulesDraft,
  billTotal: number | undefined,
): Promise<InvoiceResult | null> {
  if (billTotal === undefined || computeInvoice(draft).bill.totalAmount !== billTotal) return null
  return createInvoice({
    ...draft,
    id: start.invoiceId,
    sessionId: start.session.id,
    payerMemberId: start.meal.hostMemberId,
    splitType: 'EQUAL_TOTAL',
    autoNameSession: true,
  })
}

/** Huỷ tạo nhanh (đóng form không lưu): xoá bữa cùng kèo và ảnh vừa tạo. */
export async function cancelQuickBill(mealId: string): Promise<void> {
  if (await db.meals.get(mealId)) await deleteMeal(mealId)
}
