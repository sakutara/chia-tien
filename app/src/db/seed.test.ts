import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { ensureDefaultData } from './seed'

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
})

describe('ensureDefaultData', () => {
  it('gọi hai lần liên tiếp chỉ có một hồ sơ mặc định và một bản cài đặt', async () => {
    await ensureDefaultData()
    await ensureDefaultData()
    expect(await db.members.count()).toBe(1)
    expect(await db.settings.count()).toBe(1)
  })

  it('gọi song song nhiều lần vẫn chỉ tạo một hồ sơ mặc định', async () => {
    await Promise.all([ensureDefaultData(), ensureDefaultData(), ensureDefaultData()])
    expect(await db.members.count()).toBe(1)
    expect(await db.settings.count()).toBe(1)
  })

  it('hồ sơ mặc định là chủ app và được AppSettings trỏ tới', async () => {
    await ensureDefaultData()
    const settings = await db.settings.get('default')
    const host = await db.members.get(settings!.defaultHostMemberId)
    expect(host?.isDefaultHost).toBe(true)
  })

  it('gọi lại sau khi đã có dữ liệu không làm thay đổi hồ sơ đã tồn tại', async () => {
    await ensureDefaultData()
    const [before] = await db.members.toArray()
    await db.members.update(before.id, { name: 'Chủ app' })
    await ensureDefaultData()
    const after = await db.members.toArray()
    expect(after).toHaveLength(1)
    expect(after[0].name).toBe('Chủ app')
  })
})
