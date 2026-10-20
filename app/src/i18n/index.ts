import { useSyncExternalStore } from 'react'
import { en } from './en'

/*
 * Lớp i18n mỏng (Epic 9). Khoá dịch chính là câu tiếng Việt gốc: `t('Chia tiền')` trả đúng câu đó khi ngôn ngữ là `vi`
 * và tra `en` khi là `en` (thiếu bản dịch → dùng câu gốc, R-2). Tham số: `{n}`; số nhiều: `{n|người|người}` chọn vế đầu khi n = 1.
 * Ngôn ngữ nằm trong một biến toàn cục để cả code thuần (domain, service) cũng dịch được; component re-render khi đổi
 * ngôn ngữ nhờ `useLang()` ở gốc `App`. Mặc định `vi` để test và code chạy ngoài React không phụ thuộc trình duyệt.
 */

export type Lang = 'vi' | 'en'
export const LANGS: readonly Lang[] = ['vi', 'en']

let current: Lang = 'vi'
const listeners = new Set<() => void>()

export const isLang = (value: unknown): value is Lang => value === 'vi' || value === 'en'

export function getLang(): Lang {
  return current
}

/** Ưu tiên (BR-9.4, BR-9.8): lựa chọn đã lưu > tham số `l` của link > ngôn ngữ trình duyệt. */
export function detectLanguage(input: { stored?: string | null; urlParam?: string | null; navigatorLang?: string | null }): Lang {
  if (isLang(input.stored)) return input.stored
  if (isLang(input.urlParam)) return input.urlParam
  return (input.navigatorLang ?? '').toLowerCase().startsWith('vi') ? 'vi' : 'en'
}

function applyToDocument(): void {
  if (typeof document === 'undefined') return
  document.documentElement.lang = current
  document.title = t('Chia tiền')
}

/** Đặt ngôn ngữ hiển thị. Việc ghi nhớ vào IndexedDB do `db/languageStore` đảm nhiệm (công tắc gọi cả hai). */
export function setLang(next: Lang): void {
  if (next === current) return
  current = next
  applyToDocument()
  listeners.forEach((fn) => fn())
}

/** Gọi một lần khi khởi động app: `stored` là lựa chọn đã lưu trong IndexedDB, `urlLang` là tham số `l` của link Snapshot. */
export function initLanguage(input: { stored?: string | null; urlLang?: string | null } = {}): Lang {
  const lang = detectLanguage({
    stored: input.stored,
    urlParam: input.urlLang,
    navigatorLang: typeof navigator === 'undefined' ? null : navigator.language,
  })
  current = lang
  applyToDocument()
  return lang
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Đăng ký đổi ngôn ngữ ở component gốc để cả cây render lại. */
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang)
}

export type TParams = Record<string, string | number | undefined>

export function interpolate(template: string, params?: TParams): string {
  if (!params) return template
  return template.replace(/\{(\w+)(?:\|([^|}]*)\|([^}]*))?\}/g, (whole, name: string, one?: string, other?: string) => {
    const value = params[name]
    if (value === undefined) return whole
    if (one !== undefined && other !== undefined) return Number(value) === 1 ? one : other
    return String(value)
  })
}

/** Dịch một câu tiếng Việt gốc sang ngôn ngữ hiện tại. */
export function t(source: string, params?: TParams): string {
  const text = current === 'en' ? (en[source] ?? source) : source
  return interpolate(text, params)
}

/** Dịch theo ngôn ngữ chỉ định (tin nhắn chia sẻ có thể khác ngôn ngữ giao diện). */
export function tIn(lang: Lang, source: string, params?: TParams): string {
  const text = lang === 'en' ? (en[source] ?? source) : source
  return interpolate(text, params)
}

export const LOCALES: Record<Lang, string> = { vi: 'vi-VN', en: 'en-US' }

/** Đánh dấu một câu tiếng Việt gốc nằm trong hằng số cấp module; dịch lúc hiển thị bằng `t(...)`. Trả nguyên chuỗi. */
export const T = (source: string): string => source
