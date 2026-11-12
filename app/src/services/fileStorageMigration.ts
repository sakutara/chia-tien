import { db } from '../db/db'
import { readFromOpfs, removeOpfsEntry, writeOpfsAt } from './fileStorageService'

/*
 * Dọn bản lưu trùng của ảnh hoá đơn (bản cũ luôn ghi cả OPFS lẫn blobData trong IndexedDB).
 * Nguyên tắc: không bao giờ để một bản ghi mất cả hai nơi. Chỉ xoá blobData khi tệp OPFS đã được xác nhận đúng dung lượng.
 */

/** Xử lý một bản ghi có cả opfsPath và blobData. Trả về true nếu đã bỏ blobData. */
async function dedupeOne(id: string): Promise<boolean> {
  const record = await db.invoice_files.get(id)
  if (!record?.opfsPath || !record.blobData) return false
  const { opfsPath, blobData } = record

  // Tệp OPFS đọc được và đúng dung lượng: bỏ bản IndexedDB.
  const onDisk = await readFromOpfs(opfsPath)
  if (onDisk && onDisk.size === blobData.size) {
    await db.invoice_files.update(id, { blobData: undefined })
    return true
  }

  // OPFS mất hoặc lệch: blobData là nguồn đúng, ghi lại OPFS rồi kiểm tra lại trước khi bỏ blobData.
  if (await writeOpfsAt(opfsPath, blobData)) {
    const rewritten = await readFromOpfs(opfsPath)
    if (rewritten && rewritten.size === blobData.size) {
      await db.invoice_files.update(id, { blobData: undefined })
      return true
    }
  }

  // Không ghi lại được: giữ blobData, bỏ opfsPath (và tệp OPFS lệch nếu còn sót).
  await removeOpfsEntry(opfsPath)
  await db.invoice_files.update(id, { opfsPath: undefined })
  return false
}

/**
 * Chạy khi khởi động app. Trả về số bản ghi đã kiểm tra (`checked`) và số bản ghi đã bỏ blobData trùng (`freed`).
 * Lỗi được nuốt: không ném ra ngoài và không chặn khởi động.
 */
export async function dedupeStoredInvoiceFiles(): Promise<{ checked: number; freed: number }> {
  const result = { checked: 0, freed: 0 }
  try {
    // Chỉ thu id trước, rồi đọc từng bản ghi để không giữ mọi blob trong bộ nhớ cùng lúc.
    const ids: string[] = []
    await db.invoice_files.each((record) => {
      if (record.opfsPath && record.blobData) ids.push(record.id)
    })
    for (const id of ids) {
      result.checked++
      try {
        if (await dedupeOne(id)) result.freed++
      } catch {
        // Bản ghi lỗi thì bỏ qua; các bản ghi còn lại vẫn được xử lý.
      }
    }
  } catch {
    // Không đọc được bảng: trả số đếm hiện có.
  }
  return result
}
