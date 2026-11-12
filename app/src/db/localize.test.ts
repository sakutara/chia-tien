import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { setLang } from '../i18n'
import type { Member, SessionKeo } from '../types'
import { DEFAULT_HOST_NAME, localizeMember, localizeSession } from './localize'

afterEach(() => {
  setLang('vi')
})

const host: Member = {
  id: 'host',
  name: 'Tôi',
  normalizedName: 'toi',
  isDefaultHost: true,
  avatarColor: '#2D6A4F',
  createdAt: '2026-10-19T10:00:00.000Z',
  lastUsedAt: '2026-10-19T10:00:00.000Z',
}

const session: SessionKeo = {
  id: 's1',
  mealId: 'm1',
  name: 'Kèo 2',
  orderIndex: 1,
  participantIds: ['host'],
  createdAt: '2026-10-19T10:00:00.000Z',
}

describe('localizeMember (BR-9.9)', () => {
  it('hồ sơ "Tôi" mặc định hiện theo ngôn ngữ đang chọn', () => {
    expect(DEFAULT_HOST_NAME).toBe('Tôi')
    expect(localizeMember(host).name).toBe('Tôi')
    setLang('en')
    expect(localizeMember(host).name).toBe('Me')
  })

  it('giữ nguyên tên người dùng tự đặt, kể cả khi tên đó trùng chữ "Tôi"', () => {
    setLang('en')
    const renamed: Member = { ...host, name: 'Nguyễn Văn An' }
    expect(localizeMember(renamed).name).toBe('Nguyễn Văn An')
    const otherTo: Member = { ...host, isDefaultHost: false, name: 'Tôi' }
    expect(localizeMember(otherTo).name).toBe('Tôi')
  })

  it('không đổi các trường khác của hồ sơ', () => {
    setLang('en')
    const localized = localizeMember(host)
    expect(localized.id).toBe(host.id)
    expect(localized.avatarColor).toBe(host.avatarColor)
    expect(localized.isDefaultHost).toBe(true)
  })
})

describe('localizeSession (BR-9.9)', () => {
  it('tên kèo mặc định "Kèo n" đổi sang "Venue n" khi chọn tiếng Anh', () => {
    expect(localizeSession(session).name).toBe('Kèo 2')
    setLang('en')
    expect(localizeSession(session).name).toBe('Venue 2')
  })

  it('tên kèo do người dùng đặt giữ nguyên và trả về cùng một object', () => {
    setLang('en')
    const custom: SessionKeo = { ...session, name: 'Lẩu bò' }
    expect(localizeSession(custom)).toBe(custom)
    expect(localizeSession(session).orderIndex).toBe(1)
  })
})
