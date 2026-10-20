import { isLang, type Lang } from '../i18n'
import { db } from './db'
import { ensureDefaultData } from './seed'

/** Ngôn ngữ đã chọn, lưu ở `AppSettings.language` trong IndexedDB (dùng chung cho app chính và trang Snapshot). */
export async function loadStoredLang(): Promise<Lang | null> {
  try {
    const settings = await db.settings.get('default')
    return isLang(settings?.language) ? settings.language : null
  } catch {
    return null
  }
}

/** Ghi lựa chọn ngôn ngữ. Chỉ ghi `settings`; dữ liệu của Snapshot vẫn không bao giờ được ghi vào IndexedDB. */
export async function saveStoredLang(lang: Lang): Promise<void> {
  try {
    await ensureDefaultData()
    await db.settings.update('default', { language: lang })
  } catch (err) {
    console.error('Không lưu được ngôn ngữ', err)
  }
}
