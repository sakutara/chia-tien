import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { detectLanguage, getLang, initLanguage, interpolate, setLang, t, tIn } from './index'
import { en } from './en'

const SRC = join(__dirname, '..')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === 'i18n' ? [] : sourceFiles(path)
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) && name !== 'settlementTestUtils.ts' ? [path] : []
  })
}

/** Mọi câu gốc trong `t('...')`, `T('...')`, `tIn(lang, '...')` của mã nguồn. */
function usedKeys(): string[] {
  const keys = new Set<string>()
  const pattern = /(?<![\w.])[tT]\(\s*'((?:[^'\\\n]|\\.)*)'|tIn\(\s*\w+\s*,\s*'((?:[^'\\\n]|\\.)*)'/g
  for (const file of sourceFiles(SRC)) {
    for (const m of readFileSync(file, 'utf8').matchAll(pattern)) keys.add((m[1] ?? m[2]).replace(/\\'/g, "'"))
  }
  return [...keys]
}

const placeholders = (s: string) => [...new Set([...s.matchAll(/\{(\w+)/g)].map((m) => m[1]))].sort()

afterEach(() => setLang('vi', false))

describe('từ điển en (R-1, R-2)', () => {
  it('mọi câu t()/T() trong mã nguồn đều có bản dịch', () => {
    const missing = usedKeys().filter((k) => !(k in en))
    expect(missing).toEqual([])
  })

  it('bản dịch giữ đúng các tham số của câu gốc', () => {
    const wrong = Object.entries(en).filter(([k, v]) => placeholders(k).join() !== placeholders(v).join())
    expect(wrong.map(([k]) => k)).toEqual([])
  })

  it('không còn khoá thừa không dùng ở đâu', () => {
    const used = new Set(usedKeys())
    expect(Object.keys(en).filter((k) => !used.has(k))).toEqual([])
  })
})

describe('t()', () => {
  it('mặc định giữ nguyên câu tiếng Việt', () => {
    expect(getLang()).toBe('vi')
    expect(t('Chia tiền')).toBe('Chia tiền')
  })

  it('dịch sang en, nội suy tham số và số nhiều', () => {
    setLang('en', false)
    expect(t('Chia tiền')).toBe('Split Bill')
    expect(t('Ngày {date}', { date: '19/10' })).toBe('19/10')
    expect(t('{n} bữa', { n: 1 })).toBe('1 meal')
    expect(t('{n} bữa', { n: 3 })).toBe('3 meals')
  })

  it('thiếu bản dịch thì dùng câu gốc', () => {
    setLang('en', false)
    expect(t('Câu chưa có bản dịch {x}', { x: 1 })).toBe('Câu chưa có bản dịch 1')
  })

  it('tIn dịch theo ngôn ngữ chỉ định bất kể ngôn ngữ giao diện', () => {
    expect(tIn('en', 'chuyển cho {name} {amount}', { name: 'An', amount: '1' })).toBe('transfer to An 1')
    expect(tIn('vi', 'chuyển cho {name} {amount}', { name: 'An', amount: '1' })).toBe('chuyển cho An 1')
  })

  it('interpolate giữ nguyên tham số không được truyền', () => {
    expect(interpolate('a {x} b', {})).toBe('a {x} b')
  })
})

describe('detectLanguage (BR-9.4, BR-9.8)', () => {
  it('ưu tiên lựa chọn đã lưu > tham số link > ngôn ngữ trình duyệt', () => {
    expect(detectLanguage({ stored: 'en', urlParam: 'vi', navigatorLang: 'vi-VN' })).toBe('en')
    expect(detectLanguage({ stored: null, urlParam: 'en', navigatorLang: 'vi-VN' })).toBe('en')
    expect(detectLanguage({ urlParam: 'xx', navigatorLang: 'vi-VN' })).toBe('vi')
    expect(detectLanguage({ navigatorLang: 'en-US' })).toBe('en')
    expect(detectLanguage({ navigatorLang: 'fr' })).toBe('en')
    expect(detectLanguage({})).toBe('en')
  })
})

describe('đổi ngôn ngữ', () => {
  it('ghi nhớ lựa chọn và cập nhật <html lang> và <title>', () => {
    setLang('en')
    expect(window.localStorage.getItem('fee-calculator.lang')).toBe('en')
    expect(document.documentElement.lang).toBe('en')
    expect(document.title).toBe('Split Bill')
    expect(initLanguage(null)).toBe('en')
    window.localStorage.removeItem('fee-calculator.lang')
  })
})
