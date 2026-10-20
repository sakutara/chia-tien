import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { loadStoredLang } from './db/languageStore'
import { initLanguage } from './i18n'

// Ngôn ngữ ban đầu: lựa chọn đã lưu trong IndexedDB > tham số `l` của link Snapshot > ngôn ngữ trình duyệt (BR-9.4, BR-9.8).
loadStoredLang().then((stored) => {
  initLanguage({ stored, urlLang: new URLSearchParams(window.location.search).get('l') })
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
