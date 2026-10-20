import { saveStoredLang } from '../../db/languageStore'
import { setLang, t, useLang, type Lang } from '../../i18n'

/** Công tắc ngôn ngữ VI/EN (BR-9.1, BR-9.7): role="switch", bật = English. Dùng chung cho app chính và trang Snapshot. */
export default function LanguageSwitch({ className = '' }: { className?: string }) {
  const lang = useLang()
  const english = lang === 'en'
  const choose = (next: Lang) => {
    setLang(next)
    void saveStoredLang(next)
  }
  return (
    <button
      type="button"
      role="switch"
      aria-checked={english}
      aria-label={t('Ngôn ngữ: English')}
      onClick={() => choose(english ? 'vi' : 'en')}
      className={`inline-flex min-h-10 min-w-11 items-center justify-center gap-1 rounded-lg border border-usd-green-600 px-2 text-xs font-bold ${className}`}
    >
      <span aria-hidden="true" className={english ? 'opacity-60' : ''}>VI</span>
      <span aria-hidden="true" className="relative inline-block h-4 w-7 rounded-full bg-usd-green-700">
        <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-usd-paper-50 transition-all ${english ? 'left-[0.9375rem]' : 'left-0.5'}`} />
      </span>
      <span aria-hidden="true" className={english ? '' : 'opacity-60'}>EN</span>
    </button>
  )
}
