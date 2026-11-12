import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from './db'
import { ensureDefaultData } from './seed'
import { loadStoredLang, saveStoredLang } from './languageStore'

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
  await ensureDefaultData()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('languageStore', () => {
  it('chưa chọn ngôn ngữ thì trả về null (để dùng ngôn ngữ trình duyệt)', async () => {
    expect(await loadStoredLang()).toBeNull()
  })

  it('ghi rồi đọc lại đúng ngôn ngữ đã chọn', async () => {
    await saveStoredLang('en')
    expect(await loadStoredLang()).toBe('en')
    await saveStoredLang('vi')
    expect(await loadStoredLang()).toBe('vi')
  })

  it('giá trị lưu sai (không phải vi/en) bị bỏ qua', async () => {
    await db.settings.update('default', { language: 'fr' } as never)
    expect(await loadStoredLang()).toBeNull()
  })

  it('lưu ngôn ngữ khi chưa có dữ liệu mặc định vẫn tạo được hồ sơ và ghi thành công', async () => {
    await db.transaction('rw', db.settings, db.members, async () => {
      await db.settings.clear()
      await db.members.clear()
    })
    await saveStoredLang('en')
    expect(await loadStoredLang()).toBe('en')
  })

  it('lỗi khi đọc IndexedDB được coi là chưa chọn, không ném lỗi', async () => {
    vi.spyOn(db.settings, 'get').mockRejectedValue(new Error('db blocked'))
    await expect(loadStoredLang()).resolves.toBeNull()
  })

  it('lỗi khi ghi chỉ ghi log, không làm hỏng luồng đổi ngôn ngữ', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(db.settings, 'update').mockRejectedValue(new Error('quota'))
    await expect(saveStoredLang('en')).resolves.toBeUndefined()
    expect(log).toHaveBeenCalled()
  })
})
