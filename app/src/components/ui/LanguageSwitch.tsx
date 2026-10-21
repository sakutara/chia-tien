import { saveStoredLang } from '../../db/languageStore'
import { setLang, useLang } from '../../i18n'
import ToggleButton from './ToggleButton'

/** Nút ngôn ngữ (BR-9.1, BR-9.7): hiện ngôn ngữ sẽ chuyển tới (đang tiếng Việt → "EN", đang English → "VI"). Dùng chung cho app chính và trang Snapshot. */
export default function LanguageSwitch({ className = '' }: { className?: string }) {
  const english = useLang() === 'en'
  return (
    <ToggleButton
      checked={english}
      label="EN"
      uncheckedLabel="VI"
      className={`min-h-10 !border-usd-green-600 !bg-transparent px-2 text-xs font-bold ${className}`}
      onChange={(on) => {
        const next = on ? 'en' : 'vi'
        setLang(next)
        void saveStoredLang(next)
      }}
    />
  )
}
